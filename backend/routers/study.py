from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import List, Optional

from database import get_db
from models import User, Content, StudySession
from schemas import StudySessionCreate, StudySessionResponse
from routers.auth import get_current_user

router = APIRouter(prefix="/api/study", tags=["Study Timer"])


@router.post("/sessions", response_model=StudySessionResponse)
def create_study_session(
    data: StudySessionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Log a completed study session."""
    session = StudySession(
        user_id=current_user.id,
        content_id=data.content_id,
        duration_seconds=data.duration_seconds,
        session_type=data.session_type,
        started_at=datetime.utcnow() - timedelta(seconds=data.duration_seconds),
        ended_at=datetime.utcnow(),
    )
    db.add(session)

    # Award reputation points for studying
    points = data.duration_seconds // 300  # 1 point per 5 minutes
    current_user.reputation_score += max(points, 1)
    db.commit()
    db.refresh(session)

    content_title = ""
    if session.content_id:
        content = db.query(Content).filter(Content.id == session.content_id).first()
        if content:
            content_title = content.title

    return StudySessionResponse(
        id=session.id,
        content_id=session.content_id,
        content_title=content_title,
        duration_seconds=session.duration_seconds,
        session_type=session.session_type,
        started_at=session.started_at,
    )


@router.get("/sessions", response_model=List[StudySessionResponse])
def list_study_sessions(
    days: int = 7,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List user's study sessions for the given number of days."""
    since = datetime.utcnow() - timedelta(days=days)
    sessions = (
        db.query(StudySession)
        .filter(
            StudySession.user_id == current_user.id,
            StudySession.started_at >= since,
        )
        .order_by(StudySession.started_at.desc())
        .limit(100)
        .all()
    )

    results = []
    for s in sessions:
        content_title = ""
        if s.content_id:
            content = db.query(Content).filter(Content.id == s.content_id).first()
            if content:
                content_title = content.title
        results.append(StudySessionResponse(
            id=s.id,
            content_id=s.content_id,
            content_title=content_title,
            duration_seconds=s.duration_seconds,
            session_type=s.session_type,
            started_at=s.started_at,
        ))
    return results


@router.get("/stats")
def get_study_stats(
    days: int = 7,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get study statistics for the current user."""
    since = datetime.utcnow() - timedelta(days=days)

    sessions = (
        db.query(StudySession)
        .filter(
            StudySession.user_id == current_user.id,
            StudySession.started_at >= since,
        )
        .all()
    )

    total_seconds = sum(s.duration_seconds for s in sessions)
    focus_sessions = [s for s in sessions if s.session_type == "focus"]
    break_sessions = [s for s in sessions if s.session_type == "break"]

    # Daily breakdown
    daily = {}
    for s in sessions:
        day = s.started_at.strftime("%Y-%m-%d") if s.started_at else "unknown"
        daily[day] = daily.get(day, 0) + s.duration_seconds

    # Fill missing days
    daily_list = []
    for i in range(days):
        d = (datetime.utcnow() - timedelta(days=days - 1 - i)).strftime("%Y-%m-%d")
        daily_list.append({"date": d, "seconds": daily.get(d, 0)})

    return {
        "total_seconds": total_seconds,
        "total_sessions": len(sessions),
        "focus_sessions": len(focus_sessions),
        "break_sessions": len(break_sessions),
        "focus_seconds": sum(s.duration_seconds for s in focus_sessions),
        "avg_session_minutes": round(total_seconds / max(len(sessions), 1) / 60, 1),
        "daily": daily_list,
    }
