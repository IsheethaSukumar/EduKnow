from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List

from database import get_db
from models import User, Badge, UserBadge, Interaction, Content
from schemas import BadgeResponse, LeaderboardEntry, GamificationStats
from routers.auth import get_current_user

router = APIRouter(prefix="/api/gamification", tags=["Gamification"])


# ─── Badge checking logic ───
def check_and_award_badges(user: User, db: Session) -> List[str]:
    """Check badge criteria and award new badges."""
    awarded = []
    all_badges = db.query(Badge).all()
    existing = {
        ub.badge_id
        for ub in db.query(UserBadge).filter(UserBadge.user_id == user.id).all()
    }

    for badge in all_badges:
        if badge.id in existing:
            continue

        # Count user's actions matching criteria
        count = (
            db.query(func.count(Interaction.id))
            .filter(
                Interaction.user_id == user.id,
                Interaction.action == badge.criteria_action,
            )
            .scalar()
        )

        if count >= badge.criteria_count:
            ub = UserBadge(user_id=user.id, badge_id=badge.id, progress=1.0)
            db.add(ub)
            user.reputation_score += badge.points_value
            awarded.append(badge.name)

    if awarded:
        db.commit()

    return awarded


@router.get("/badges", response_model=List[BadgeResponse])
def get_all_badges(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all badges with user's progress."""
    all_badges = db.query(Badge).all()
    user_badges = {
        ub.badge_id: ub
        for ub in db.query(UserBadge).filter(UserBadge.user_id == current_user.id).all()
    }

    result = []
    for badge in all_badges:
        ub = user_badges.get(badge.id)
        earned = ub is not None

        # Calculate progress
        progress = 1.0 if earned else 0.0
        if not earned:
            count = (
                db.query(func.count(Interaction.id))
                .filter(
                    Interaction.user_id == current_user.id,
                    Interaction.action == badge.criteria_action,
                )
                .scalar()
            )
            progress = min(count / badge.criteria_count, 1.0) if badge.criteria_count > 0 else 0.0

        result.append(BadgeResponse(
            id=badge.id,
            name=badge.name,
            description=badge.description,
            icon=badge.icon,
            color=badge.color,
            points_value=badge.points_value,
            rarity=badge.rarity,
            earned=earned,
            earned_at=ub.earned_at if ub else None,
            progress=round(progress, 2),
        ))

    return result


@router.get("/leaderboard", response_model=List[LeaderboardEntry])
def get_leaderboard(
    timeframe: str = "all_time",
    limit: int = 20,
    db: Session = Depends(get_db),
):
    """Get the leaderboard rankings."""
    users = (
        db.query(User)
        .filter(User.is_active == True)
        .order_by(User.reputation_score.desc())
        .limit(limit)
        .all()
    )

    result = []
    for rank, user in enumerate(users, 1):
        badge_count = (
            db.query(func.count(UserBadge.id))
            .filter(UserBadge.user_id == user.id)
            .scalar()
        )
        result.append(LeaderboardEntry(
            rank=rank,
            user_id=user.id,
            username=user.username,
            full_name=user.full_name,
            role=user.role,
            reputation_score=user.reputation_score,
            badge_count=badge_count,
            avatar_url=user.avatar_url or "",
        ))

    return result


@router.get("/stats", response_model=GamificationStats)
def get_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get gamification stats for the current user."""
    # Check for new badges
    new_badges = check_and_award_badges(current_user, db)

    badges_earned = (
        db.query(func.count(UserBadge.id))
        .filter(UserBadge.user_id == current_user.id)
        .scalar()
    )
    total_badges = db.query(func.count(Badge.id)).scalar()

    # Calculate rank
    rank = (
        db.query(func.count(User.id))
        .filter(User.reputation_score > current_user.reputation_score)
        .scalar()
    ) + 1

    return GamificationStats(
        reputation_score=current_user.reputation_score,
        streak_days=current_user.streak_days,
        badges_earned=badges_earned,
        total_badges=total_badges,
        rank=rank,
        points_history=[],
    )


@router.post("/check-badges")
def trigger_badge_check(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Manually trigger badge checking."""
    awarded = check_and_award_badges(current_user, db)
    return {
        "new_badges": awarded,
        "message": f"Earned {len(awarded)} new badge(s)!" if awarded else "No new badges yet. Keep going!",
    }
