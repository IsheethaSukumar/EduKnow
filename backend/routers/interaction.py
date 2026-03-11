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
