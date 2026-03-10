from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from database import get_db
from models import User, Content, Note
from schemas import NoteCreate, NoteUpdate, NoteResponse
from routers.auth import get_current_user

router = APIRouter(prefix="/api/notes", tags=["Notes"])


def note_to_response(note: Note, db: Session) -> NoteResponse:
    content_title = ""
    if note.content_id:
        content = db.query(Content).filter(Content.id == note.content_id).first()
        if content:
            content_title = content.title
    return NoteResponse(
        id=note.id,
        content_id=note.content_id,
        content_title=content_title,
        title=note.title or "",
        text=note.text,
        color=note.color or "#6366f1",
        created_at=note.created_at,
        updated_at=note.updated_at,
    )


@router.post("/", response_model=NoteResponse)
def create_note(
    data: NoteCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a personal note, optionally linked to content."""
    note = Note(
        user_id=current_user.id,
        content_id=data.content_id,
        title=data.title,
        text=data.text,
        color=data.color,
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return note_to_response(note, db)


@router.get("/", response_model=List[NoteResponse])
def list_notes(
    content_id: Optional[str] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List user's notes with optional filters."""
    query = db.query(Note).filter(Note.user_id == current_user.id)
    if content_id:
        query = query.filter(Note.content_id == content_id)
    if search:
        query = query.filter(
            (Note.title.ilike(f"%{search}%")) | (Note.text.ilike(f"%{search}%"))
        )
    notes = query.order_by(Note.updated_at.desc()).limit(100).all()
    return [note_to_response(n, db) for n in notes]


@router.get("/{note_id}", response_model=NoteResponse)
def get_note(
    note_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a specific note."""
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == current_user.id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return note_to_response(note, db)


@router.put("/{note_id}", response_model=NoteResponse)
def update_note(
    note_id: str,
    data: NoteUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a note."""
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == current_user.id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    if data.title is not None:
        note.title = data.title
    if data.text is not None:
        note.text = data.text
    if data.color is not None:
        note.color = data.color
    db.commit()
    db.refresh(note)
    return note_to_response(note, db)


@router.delete("/{note_id}")
def delete_note(
    note_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a note."""
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == current_user.id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    db.delete(note)
    db.commit()
    return {"message": "Note deleted"}
