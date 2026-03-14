from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime

from database import get_db
from models import User, Content, Notification, ContentRating
from schemas import NotificationResponse, ContentRatingCreate, ContentRatingResponse
from routers.auth import get_current_user

router = APIRouter(prefix="/api/interact", tags=["Interactions"])

# ─── Notifications ───
@router.get("/notifications", response_model=List[NotificationResponse])
def get_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's notifications."""
    return db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).order_by(Notification.created_at.desc()).limit(50).all()

@router.post("/notifications/{notif_id}/read")
def mark_read(
    notif_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark a notification as read."""
    notif = db.query(Notification).filter(
        Notification.id == notif_id,
        Notification.user_id == current_user.id
    ).first()
    if notif:
        notif.is_read = True
        db.commit()
    return {"status": "success"}

# ─── Ratings & Feedback ───
@router.post("/content/{content_id}/rate", response_model=ContentRatingResponse)
def rate_content(
    content_id: str,
    rating_data: ContentRatingCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Rate a piece of knowledge and provide feedback."""
    # Check if content exists
    content = db.query(Content).filter(Content.id == content_id).first()
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    
    # Check if already rated
    existing = db.query(ContentRating).filter(
        ContentRating.content_id == content_id,
        ContentRating.user_id == current_user.id
    ).first()
    
    if existing:
        existing.rating = rating_data.rating
        existing.comment = rating_data.comment
        existing.created_at = datetime.utcnow()
        db.commit()
        db.refresh(existing)
        return existing
    
    new_rating = ContentRating(
        content_id=content_id,
        user_id=current_user.id,
        rating=rating_data.rating,
        comment=rating_data.comment
    )
    db.add(new_rating)
    
    # Update content upvotes (simple average or total)
    # Here we just increment a counter if needed, but better to calculate aggregate.
    
    db.commit()
    db.refresh(new_rating)
    return new_rating

@router.get("/content/{content_id}/ratings", response_model=List[ContentRatingResponse])
def get_content_ratings(content_id: str, db: Session = Depends(get_db)):
    """Get all ratings for a content item."""
    return db.query(ContentRating).filter(
        ContentRating.content_id == content_id
    ).order_by(ContentRating.created_at.desc()).all()

# ─── Plagiarism Checker (Internal Similarity) ───
@router.post("/check-plagiarism")
def check_plagiarism(
    text: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Check text against internal repository for similarity."""
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
    
    # Get all documents
    contents = db.query(Content).filter(Content.content_type == "document").all()
    if not contents:
        return {"similarity": 0, "matches": []}
    
    # Simple semantic check using TF-IDF
    corpus = [c.description for c in contents if c.description]
    if not corpus:
         return {"similarity": 0, "matches": []}
         
    vectorizer = TfidfVectorizer().fit(corpus + [text])
    content_vectors = vectorizer.transform(corpus)
    query_vector = vectorizer.transform([text])
    
    similarities = cosine_similarity(query_vector, content_vectors)[0]
    
    matches = []
    for idx, score in enumerate(similarities):
        if score > 0.3: # Threshold
            matches.append({
                "content_id": contents[idx].id,
                "title": contents[idx].title,
                "similarity": float(score)
            })
            
    matches = sorted(matches, key=lambda x: x["similarity"], reverse=True)[:5]
    max_score = matches[0]["similarity"] if matches else 0
    
    return {
        "similarity": max_score,
        "is_plagiarized": max_score > 0.7,
        "matches": matches
    }


# ─── Complaints ───
from pydantic import BaseModel

class ComplaintCreate(BaseModel):
    title: str
    description: str
    category: str = "Other"
    priority: str = "medium"

class ComplaintUpdate(BaseModel):
    status: str
    admin_response: Optional[str] = None

@router.post("/complaints")
def create_complaint(
    data: ComplaintCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit a new complaint."""
    from models import Complaint
    complaint = Complaint(
        user_id=current_user.id,
        title=data.title,
        description=data.description,
        category=data.category,
        priority=data.priority,
        status="open"
    )
    db.add(complaint)

    admins = db.query(User).filter(User.role == "admin").all()
    for admin in admins:
        notif = Notification(
            user_id=admin.id,
            title="📋 New Complaint Submitted",
            message=f"{current_user.full_name} submitted a complaint: '{data.title}'",
            type="warning",
            link="/complaints"
        )
        db.add(notif)
    db.commit()
    db.refresh(complaint)
    return {
        "id": complaint.id,
        "title": complaint.title,
        "description": complaint.description,
        "status": complaint.status,
        "created_at": complaint.created_at.isoformat()
    }

@router.get("/complaints")
def get_complaints(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get complaints. Admins see all, users see their own."""
    from models import Complaint
    if current_user.role == "admin":
        complaints = db.query(Complaint).order_by(Complaint.created_at.desc()).all()
    else:
        complaints = db.query(Complaint).filter(Complaint.user_id == current_user.id).order_by(Complaint.created_at.desc()).all()
    return [{
        "id": c.id, "title": c.title, "description": c.description,
        "category": c.category, "status": c.status,
        "admin_response": c.admin_response, "created_at": c.created_at.isoformat()
    } for c in complaints]

@router.put("/complaints/{complaint_id}")
def update_complaint_status(
    complaint_id: str,
    data: ComplaintUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    from models import Complaint
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Not found")
    
    complaint.status = data.status
    if data.admin_response:
        complaint.admin_response = data.admin_response
        
    db.add(Notification(
        user_id=complaint.user_id,
        title="Your Complaint has been Updated",
        message=f"Complaint '{complaint.title}' is now {data.status}.",
        type="info", link="/complaints"
    ))
    db.commit()
    return {"status": "updated"}

# ─── Chat Reports ───
class ChatReportCreate(BaseModel):
    reported_user: str
    reported_user_id: Optional[str] = None
    room_id: str
    message_text: str
    reason: str = "Inappropriate content"

@router.post("/chat-report")
def report_chat_message(
    data: ChatReportCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from models import ChatReport
    report = ChatReport(
        reporter_id=current_user.id,
        reported_user=data.reported_user,
        reported_user_id=data.reported_user_id,
        room_id=data.room_id,
        message_text=data.message_text,
        reason=data.reason,
        status="pending"
    )
    db.add(report)

    admins = db.query(User).filter(User.role == "admin").all()
    for admin in admins:
        db.add(Notification(
            user_id=admin.id,
            title="🚨 Chat Message Reported",
            message=f"{current_user.full_name} reported {data.reported_user} in '{data.room_id}'.",
            type="warning", link="/complaints"
        ))
    db.commit()
    return {"status": "reported"}

@router.put("/chat-reports/{report_id}/warn")
def warn_reported_user(report_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "admin": raise HTTPException(status_code=403, detail="Admin only")
    from models import ChatReport
    report = db.query(ChatReport).filter(ChatReport.id == report_id).first()
    if not report or report.status != "pending": return {"status": "already_resolved"}
    report.status = "resolved"
    
    msg = ""
    if report.reported_user_id:
        u = db.query(User).filter(User.id == report.reported_user_id).first()
        if u:
            u.warning_count = (u.warning_count or 0) + 1
            if u.warning_count >= 3:
                u.is_active = False
                msg = "Banned"
                db.add(Notification(user_id=u.id, title="Account Suspended", message="3 warnings reached.", type="warning", link="/"))
            else:
                msg = f"Warning {u.warning_count}/3."
                db.add(Notification(user_id=u.id, title="Official Warning", message=f"Warning {u.warning_count}/3 regarding message: '{report.message_text}'", type="warning", link="/rooms"))
    db.commit()
    return {"status": "warned", "message": msg}

@router.get("/chat-reports")
def get_chat_reports(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "admin": raise HTTPException(status_code=403)
    from models import ChatReport
    reports = db.query(ChatReport).order_by(ChatReport.created_at.desc()).all()
    return [{"id": r.id, "reporter_id": r.reporter_id, "reported_user": r.reported_user, "room_id": r.room_id, "message_text": r.message_text, "reason": r.reason, "status": r.status, "created_at": r.created_at.isoformat()} for r in reports]
