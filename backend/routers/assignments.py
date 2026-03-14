from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone

from database import get_db
from models import User, Assignment, AssignmentSubmission, Notification
from schemas import (
    AssignmentCreate, AssignmentResponse,
    AssignmentSubmissionCreate, AssignmentSubmissionResponse,
    AssignmentSubmissionGrade
)
from routers.auth import get_current_user, require_role

router = APIRouter(prefix="/api/assignments", tags=["Assignments"])

# ─── Assignments ───

@router.post("/", response_model=AssignmentResponse)
def create_assignment(
    assignment_data: AssignmentCreate,
    current_user: User = Depends(require_role("manage_assignments")),
    db: Session = Depends(get_db)
):
    """Faculty creates a new assignment."""

    new_assignment = Assignment(
        title=assignment_data.title,
        description=assignment_data.description,
        author_id=current_user.id,
        due_date=assignment_data.due_date.replace(tzinfo=None) if assignment_data.due_date.tzinfo else assignment_data.due_date,
        total_points=assignment_data.total_points,
        rubric=[r.model_dump() for r in assignment_data.rubric]
    )
    db.add(new_assignment)
    db.commit()
    db.refresh(new_assignment)
    return new_assignment


@router.get("/", response_model=List[AssignmentResponse])
def get_assignments(db: Session = Depends(get_db)):
    """List all assignments."""
    return db.query(Assignment).all()


# ─── Grading route MUST be declared before /{assignment_id} wildcard routes
#     to avoid FastAPI routing conflicts (e.g. "submissions" being treated as an id)
@router.post("/submissions/{submission_id}/grade", response_model=AssignmentSubmissionResponse)
def grade_submission(
    submission_id: str,
    grade_data: AssignmentSubmissionGrade,
    current_user: User = Depends(require_role("grade_submissions")),
    db: Session = Depends(get_db)
):
    """Faculty grades a submission and provides feedback."""

    submission = db.query(AssignmentSubmission).filter(AssignmentSubmission.id == submission_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    submission.grade = grade_data.grade
    submission.feedback_text = grade_data.feedback_text
    submission.rubric_feedback = grade_data.rubric_feedback
    submission.status = "graded"

    # Notify student
    notif = Notification(
        user_id=submission.student_id,
        title="Assignment Graded",
        message=f"Your submission for '{submission.assignment.title}' has been graded.",
        type="success",
        link=f"/assignments/{submission.assignment_id}"
    )
    db.add(notif)

    db.commit()
    db.refresh(submission)
    return submission


# ─── Wildcard /{assignment_id} routes come AFTER fixed-path routes ───

@router.get("/{assignment_id}", response_model=AssignmentResponse)
def get_assignment(assignment_id: str, db: Session = Depends(get_db)):
    """Get assignment details."""
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return assignment


@router.post("/{assignment_id}/submit", response_model=AssignmentSubmissionResponse)
def submit_assignment(
    assignment_id: str,
    submission_data: AssignmentSubmissionCreate,
    current_user: User = Depends(require_role("submit_assignments")),
    db: Session = Depends(get_db)
):
    """Student submits an assignment."""
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    # Check if already submitted
    existing = db.query(AssignmentSubmission).filter(
        AssignmentSubmission.assignment_id == assignment_id,
        AssignmentSubmission.student_id == current_user.id
    ).first()

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    status = "submitted"
    if now > assignment.due_date:
        status = "late"

    if existing:
        existing.file_url = submission_data.file_url
        existing.file_name = submission_data.file_name
        existing.submitted_at = now
        existing.status = status
        db.commit()
        db.refresh(existing)
        return existing

    new_submission = AssignmentSubmission(
        assignment_id=assignment_id,
        student_id=current_user.id,
        file_url=submission_data.file_url,
        file_name=submission_data.file_name,
        submitted_at=now,
        status=status
    )
    db.add(new_submission)
    db.commit()
    db.refresh(new_submission)
    return new_submission


@router.get("/{assignment_id}/submissions", response_model=List[AssignmentSubmissionResponse])
def get_assignment_submissions(
    assignment_id: str,
    current_user: User = Depends(require_role("view_all_submissions")),
    db: Session = Depends(get_db)
):
    """Faculty views all submissions for an assignment."""

    return db.query(AssignmentSubmission).filter(
        AssignmentSubmission.assignment_id == assignment_id
    ).all()


@router.get("/{assignment_id}/my-submission", response_model=Optional[AssignmentSubmissionResponse])
def get_my_submission(
    assignment_id: str,
    current_user: User = Depends(require_role("view_my_submissions")),
    db: Session = Depends(get_db)
):
    """Student views their own submission."""
    return db.query(AssignmentSubmission).filter(
        AssignmentSubmission.assignment_id == assignment_id,
        AssignmentSubmission.student_id == current_user.id
    ).first()
