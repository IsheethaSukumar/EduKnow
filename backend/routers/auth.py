from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from jose import JWTError, jwt
import bcrypt
from fastapi.security import OAuth2PasswordBearer
from typing import List
import os

from database import get_db
from models import User
from schemas import UserRegister, UserLogin, TokenResponse, UserResponse, UserUpdate

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

SECRET_KEY = os.getenv("SECRET_KEY", "edukno-super-secret-key-change-in-production-2024")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


# ─── RBAC Permission System ───
ROLE_PERMISSIONS = {
    "admin": {
        "manage_users", "manage_content", "manage_all_content", "delete_any_content",
        "view_admin_analytics", "view_analytics", "upload_content",
        "view_content", "search", "use_chatbot", "bookmark", "notes",
        "collections", "study_timer", "view_personal_analytics",
    },
    "faculty": {
        "manage_content", "upload_content", "view_analytics",
        "view_content", "search", "use_chatbot", "bookmark", "notes",
        "collections", "study_timer", "view_personal_analytics",
    },
    "staff": {
        "manage_content", "upload_content", "view_analytics",
        "view_content", "search", "use_chatbot", "bookmark", "notes",
        "collections", "study_timer", "view_personal_analytics",
    },
    "student": {
        "upload_content", "view_content", "search", "use_chatbot",
        "bookmark", "notes", "collections", "study_timer",
        "view_personal_analytics",
    },
    "alumni": {
        "view_content", "search", "use_chatbot", "bookmark", "notes",
        "view_personal_analytics",
    },
    "parent": {
        "view_content", "search", "view_personal_analytics",
    },
}


def require_role(*permissions: str):
    """Dependency factory: require user to have at least one of the given permissions."""
    def checker(current_user: User = Depends(get_current_user)):
        user_perms = ROLE_PERMISSIONS.get(current_user.role, set())
        if not any(p in user_perms for p in permissions):
            raise HTTPException(
                status_code=403,
                detail=f"Access denied. Your role '{current_user.role}' does not have permission for this action.",
            )
        return current_user
    return checker


def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    return user


@router.post("/register", response_model=TokenResponse)
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    # Check existing
    if db.query(User).filter(User.username == user_data.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create user
    user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hash_password(user_data.password),
        full_name=user_data.full_name,
        role=user_data.role,
        department=user_data.department,
        interests=user_data.interests,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": user.id, "role": user.role})
    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


@router.post("/login", response_model=TokenResponse)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == credentials.username).first()
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    # Update last active & streak
    now = datetime.utcnow()
    if user.last_active:
        diff = (now - user.last_active).days
        if diff == 1:
            user.streak_days += 1
        elif diff > 1:
            user.streak_days = 1
    user.last_active = now
    db.commit()

    token = create_access_token({"sub": user.id, "role": user.role})
    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)


@router.put("/me", response_model=UserResponse)
def update_me(
    update_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if update_data.full_name is not None:
        current_user.full_name = update_data.full_name
    if update_data.department is not None:
        current_user.department = update_data.department
    if update_data.interests is not None:
        current_user.interests = update_data.interests
    if update_data.avatar_url is not None:
        current_user.avatar_url = update_data.avatar_url
    db.commit()
    db.refresh(current_user)
    return UserResponse.model_validate(current_user)


@router.get("/permissions")
def get_my_permissions(current_user: User = Depends(get_current_user)):
    """Get current user's role and permissions."""
    perms = ROLE_PERMISSIONS.get(current_user.role, set())
    return {
        "role": current_user.role,
        "permissions": sorted(list(perms)),
    }


# ─── Admin-only endpoints ───
@router.get("/users", response_model=List[UserResponse])
def list_users(
    admin: User = Depends(require_role("manage_users")),
    db: Session = Depends(get_db),
):
    """List all users (admin only)."""
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [UserResponse.model_validate(u) for u in users]


@router.put("/users/{user_id}/role")
def update_user_role(
    user_id: str,
    role: str,
    admin: User = Depends(require_role("manage_users")),
    db: Session = Depends(get_db),
):
    """Update a user's role (admin only)."""
    valid_roles = ["student", "faculty", "staff", "admin", "alumni", "parent"]
    if role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {valid_roles}")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.role = role
    db.commit()
    return {"message": f"Role updated to {role}", "user_id": user_id}


@router.delete("/users/{user_id}")
def deactivate_user(
    user_id: str,
    admin: User = Depends(require_role("manage_users")),
    db: Session = Depends(get_db),
):
    """Deactivate a user (admin only)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = False
    db.commit()
    return {"message": "User deactivated"}
