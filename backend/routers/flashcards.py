from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta

from database import get_db
from models import User, Flashcard
from schemas import FlashcardCreate, FlashcardReview, FlashcardResponse
from routers.auth import get_current_user

router = APIRouter(prefix="/api/flashcards", tags=["Flashcards"])

@router.post("/", response_model=FlashcardResponse)
def create_flashcard(
    data: FlashcardCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new flashcard in a deck."""
    card = Flashcard(
        user_id=current_user.id,
        deck_name=data.deck_name,
        front=data.front,
        back=data.back
    )
    db.add(card)
    db.commit()
    db.refresh(card)
    return card

@router.get("/", response_model=List[FlashcardResponse])
def get_flashcards(
    deck: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all flashcards, optionally filtered by deck."""
    query = db.query(Flashcard).filter(Flashcard.user_id == current_user.id)
    if deck:
        query = query.filter(Flashcard.deck_name == deck)
    return query.all()

@router.get("/due", response_model=List[FlashcardResponse])
def get_due_flashcards(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get flashcards that are currently due for review based on SRS."""
    now = datetime.utcnow()
    cards = db.query(Flashcard).filter(
        Flashcard.user_id == current_user.id,
        Flashcard.next_review_date <= now
    ).all()
    return cards

@router.post("/{card_id}/review", response_model=FlashcardResponse)
def review_flashcard(
    card_id: str,
    review: FlashcardReview,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Review a flashcard and update its SRS scheduling using the SM-2 algorithm.
    Quality ranges from 0 (total blackout) to 5 (perfect response).
    """
    card = db.query(Flashcard).filter(Flashcard.id == card_id, Flashcard.user_id == current_user.id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Flashcard not found")

    q = review.quality
    if q < 0 or q > 5:
        raise HTTPException(status_code=400, detail="Quality must be between 0 and 5")

    if q >= 3:
        # Correct response
        if card.repetition == 0:
            card.interval = 1
        elif card.repetition == 1:
            card.interval = 6
        else:
            card.interval = round(card.interval * card.easiness_factor)
        card.repetition += 1
    else:
        # Incorrect response
        card.repetition = 0
        card.interval = 1

    # Update easiness factor
    card.easiness_factor = card.easiness_factor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    if card.easiness_factor < 1.3:
        card.easiness_factor = 1.3

    # Set next review date
    card.next_review_date = datetime.utcnow() + timedelta(days=card.interval)

    db.commit()
    db.refresh(card)
    return card

@router.delete("/{card_id}")
def delete_flashcard(
    card_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a flashcard."""
    card = db.query(Flashcard).filter(Flashcard.id == card_id, Flashcard.user_id == current_user.id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Flashcard not found")
    
    db.delete(card)
    db.commit()
    return {"message": "Flashcard deleted"}
