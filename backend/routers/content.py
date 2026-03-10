from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
from typing import Optional, List

from database import get_db
from models import User, Content, Interaction, Bookmark
from schemas import ContentCreate, ContentUpdate, ContentResponse, BookmarkResponse
from routers.auth import get_current_user

router = APIRouter(prefix="/api/content", tags=["Content"])


def content_to_response(content: Content, db: Session) -> ContentResponse:
    author_name = ""
    if content.author_id:
        author = db.query(User).filter(User.id == content.author_id).first()
        if author:
            author_name = author.full_name
    return ContentResponse(
        id=content.id,
        title=content.title,
        description=content.description,
        content_type=content.content_type,
        category=content.category,
        tags=content.tags or [],
        source_system=content.source_system,
        file_url=content.file_url or "",
        thumbnail_url=content.thumbnail_url or "",
        author_id=content.author_id,
        author_name=author_name,
        views=content.views,
        upvotes=content.upvotes,
        downloads=content.downloads,
        version=content.version,
        is_active=content.is_active,
        created_at=content.created_at,
        updated_at=content.updated_at,
    )


@router.get("/", response_model=List[ContentResponse])
def list_content(
    content_type: Optional[str] = None,
    category: Optional[str] = None,
    source_system: Optional[str] = None,
    sort_by: str = "created_at",
    order: str = "desc",
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
):
    query = db.query(Content).filter(Content.is_active == True)
    if content_type:
        query = query.filter(Content.content_type == content_type)
    if category:
        query = query.filter(Content.category == category)
    if source_system:
        query = query.filter(Content.source_system == source_system)

    sort_col = getattr(Content, sort_by, Content.created_at)
    if order == "desc":
        query = query.order_by(sort_col.desc())
    else:
        query = query.order_by(sort_col.asc())

    items = query.offset(skip).limit(limit).all()
    return [content_to_response(c, db) for c in items]


@router.get("/categories", response_model=List[str])
def list_categories(db: Session = Depends(get_db)):
    cats = db.query(Content.category).distinct().all()
    return sorted([c[0] for c in cats if c[0]])


@router.get("/bookmarks", response_model=List[BookmarkResponse])
def get_bookmarks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get current user's bookmarked content."""
    bookmarks = (
        db.query(Bookmark)
        .filter(Bookmark.user_id == current_user.id)
        .order_by(Bookmark.created_at.desc())
        .all()
    )
    result = []
    for bm in bookmarks:
        content = db.query(Content).filter(Content.id == bm.content_id).first()
        if content:
            result.append(BookmarkResponse(
                id=bm.id,
                content_id=bm.content_id,
                content=content_to_response(content, db),
                created_at=bm.created_at,
            ))
    return result


@router.get("/{content_id}", response_model=ContentResponse)
def get_content(content_id: str, db: Session = Depends(get_db)):
    content = db.query(Content).filter(Content.id == content_id).first()
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    return content_to_response(content, db)


@router.post("/", response_model=ContentResponse)
def create_content(
    data: ContentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    content = Content(
        title=data.title,
        description=data.description,
        content_type=data.content_type,
        category=data.category,
        tags=data.tags,
        source_system=data.source_system,
        file_url=data.file_url,
        thumbnail_url=data.thumbnail_url,
        author_id=current_user.id,
        extra_metadata=data.metadata,
    )
    db.add(content)

    # Track interaction
    interaction = Interaction(
        user_id=current_user.id,
        content_id=content.id,
        action="upload",
    )
    db.add(interaction)

    # Award points
    current_user.reputation_score += 5
    db.commit()
    db.refresh(content)
    return content_to_response(content, db)


@router.put("/{content_id}", response_model=ContentResponse)
def update_content(
    content_id: str,
    data: ContentUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    content = db.query(Content).filter(Content.id == content_id).first()
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    if content.author_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    if data.title is not None:
        content.title = data.title
    if data.description is not None:
        content.description = data.description
    if data.category is not None:
        content.category = data.category
    if data.tags is not None:
        content.tags = data.tags
    if data.is_active is not None:
        content.is_active = data.is_active

    content.version += 1
    content.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(content)
    return content_to_response(content, db)


@router.post("/{content_id}/upvote")
def upvote_content(
    content_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    content = db.query(Content).filter(Content.id == content_id).first()
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")

    content.upvotes += 1
    interaction = Interaction(
        user_id=current_user.id,
        content_id=content_id,
        action="upvote",
    )
    db.add(interaction)
    current_user.reputation_score += 1
    db.commit()
    return {"message": "Upvoted", "upvotes": content.upvotes}


@router.post("/{content_id}/view")
def record_view(
    content_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    content = db.query(Content).filter(Content.id == content_id).first()
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")

    content.views += 1
    interaction = Interaction(
        user_id=current_user.id,
        content_id=content_id,
        action="view",
    )
    db.add(interaction)
    db.commit()
    return {"message": "View recorded", "views": content.views}


@router.post("/{content_id}/download")
def download_content(
    content_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Track download and return resource URL."""
    content = db.query(Content).filter(Content.id == content_id).first()
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")

    content.downloads += 1
    interaction = Interaction(
        user_id=current_user.id,
        content_id=content_id,
        action="download",
    )
    db.add(interaction)
    current_user.reputation_score += 1
    db.commit()

    return {
        "message": "Download tracked",
        "downloads": content.downloads,
        "file_url": content.file_url or "",
        "title": content.title,
    }


@router.post("/{content_id}/bookmark")
def bookmark_content(
    content_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Bookmark a content item."""
    content = db.query(Content).filter(Content.id == content_id).first()
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")

    # Check if already bookmarked
    existing = (
        db.query(Bookmark)
        .filter(Bookmark.user_id == current_user.id, Bookmark.content_id == content_id)
        .first()
    )
    if existing:
        return {"message": "Already bookmarked", "bookmarked": True}

    bookmark = Bookmark(user_id=current_user.id, content_id=content_id)
    db.add(bookmark)
    db.commit()
    return {"message": "Bookmarked", "bookmarked": True}


@router.delete("/{content_id}/bookmark")
def unbookmark_content(
    content_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove a bookmark."""
    bookmark = (
        db.query(Bookmark)
        .filter(Bookmark.user_id == current_user.id, Bookmark.content_id == content_id)
        .first()
    )
    if bookmark:
        db.delete(bookmark)
        db.commit()
    return {"message": "Bookmark removed", "bookmarked": False}


@router.get("/{content_id}/bookmark/status")
def bookmark_status(
    content_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Check if content is bookmarked."""
    existing = (
        db.query(Bookmark)
        .filter(Bookmark.user_id == current_user.id, Bookmark.content_id == content_id)
        .first()
    )
    return {"bookmarked": existing is not None}


@router.delete("/{content_id}")
def delete_content(
    content_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    content = db.query(Content).filter(Content.id == content_id).first()
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    if content.author_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    content.is_active = False
    db.commit()
    return {"message": "Content deleted"}
