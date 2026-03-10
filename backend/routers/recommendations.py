from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from collections import Counter

from database import get_db
from models import User, Content, Interaction
from schemas import RecommendationResponse, ContentResponse
from routers.auth import get_current_user
from routers.content import content_to_response

router = APIRouter(prefix="/api/recommendations", tags=["Recommendations"])


def get_collaborative_scores(user_id: str, db: Session) -> dict:
    """Simple collaborative filtering: users who viewed the same content also viewed..."""
    # Get content IDs this user has interacted with
    user_content = (
        db.query(Interaction.content_id)
        .filter(Interaction.user_id == user_id, Interaction.content_id.isnot(None))
        .all()
    )
    user_content_ids = {c[0] for c in user_content}

    if not user_content_ids:
        return {}

    # Find other users who interacted with the same content
    similar_users = (
        db.query(Interaction.user_id)
        .filter(
            Interaction.content_id.in_(user_content_ids),
            Interaction.user_id != user_id,
        )
        .distinct()
        .limit(20)
        .all()
    )
    similar_user_ids = [u[0] for u in similar_users]

    if not similar_user_ids:
        return {}

    # Get content those users interacted with (that current user hasn't)
    recs = (
        db.query(Interaction.content_id, func.count(Interaction.id).label("cnt"))
        .filter(
            Interaction.user_id.in_(similar_user_ids),
            Interaction.content_id.isnot(None),
            ~Interaction.content_id.in_(user_content_ids),
        )
        .group_by(Interaction.content_id)
        .order_by(func.count(Interaction.id).desc())
        .limit(20)
        .all()
    )

    return {r[0]: r[1] for r in recs}


def get_content_based_scores(user: User, db: Session) -> dict:
    """Content-based: recommend based on user interests and role."""
    scores = {}
    interests = user.interests or []

    # Get content matching user's interests (as tags or categories)
    contents = db.query(Content).filter(Content.is_active == True).limit(200).all()

    for content in contents:
        score = 0.0
        content_tags = [t.lower() for t in (content.tags or [])]
        # Interest match
        for interest in interests:
            if interest.lower() in content_tags:
                score += 3.0
            if interest.lower() in content.category.lower():
                score += 2.0

        # Role-based boost
        if user.role == "student" and content.content_type in ("course", "document"):
            score += 1.0
        elif user.role == "faculty" and content.content_type in ("article", "presentation"):
            score += 1.0

        # Department match
        if user.department and user.department.lower() in (content.category or "").lower():
            score += 2.0

        # Popularity signal
        score += min(content.upvotes / 20, 1.0)

        if score > 0:
            scores[content.id] = score

    return scores


@router.get("/", response_model=RecommendationResponse)
def get_recommendations(
    limit: int = 10,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Get scores from both methods
    cf_scores = get_collaborative_scores(current_user.id, db)
    cb_scores = get_content_based_scores(current_user, db)

    # Merge scores (hybrid)
    all_content_ids = set(list(cf_scores.keys()) + list(cb_scores.keys()))
    hybrid_scores = {}

    cf_max = max(cf_scores.values()) if cf_scores else 1
    cb_max = max(cb_scores.values()) if cb_scores else 1

    for cid in all_content_ids:
        cf = cf_scores.get(cid, 0) / cf_max if cf_max > 0 else 0
        cb = cb_scores.get(cid, 0) / cb_max if cb_max > 0 else 0
        hybrid_scores[cid] = 0.4 * cf + 0.6 * cb

    # Sort and get top N
    sorted_ids = sorted(hybrid_scores, key=hybrid_scores.get, reverse=True)[:limit]

    # Fallback to popular content if no recommendations
    if not sorted_ids:
        popular = (
            db.query(Content)
            .filter(Content.is_active == True)
            .order_by(Content.views.desc())
            .limit(limit)
            .all()
        )
        return RecommendationResponse(
            recommendations=[content_to_response(c, db) for c in popular],
            reason="Popular content based on overall engagement",
        )

    # Fetch content objects
    contents = db.query(Content).filter(Content.id.in_(sorted_ids)).all()
    content_map = {c.id: c for c in contents}
    ordered = [content_map[cid] for cid in sorted_ids if cid in content_map]

    return RecommendationResponse(
        recommendations=[content_to_response(c, db) for c in ordered],
        reason="Personalized based on your interests, role, and similar users' activity",
    )


@router.get("/trending", response_model=RecommendationResponse)
def get_trending(limit: int = 10, db: Session = Depends(get_db)):
    """Get trending content based on recent activity."""
    trending = (
        db.query(Content)
        .filter(Content.is_active == True)
        .order_by((Content.views + Content.upvotes * 3).desc())
        .limit(limit)
        .all()
    )
    return RecommendationResponse(
        recommendations=[content_to_response(c, db) for c in trending],
        reason="Trending across the institution",
    )
