from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from typing import Optional, List
import re
from collections import Counter
from difflib import SequenceMatcher
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

from database import get_db
from models import User, Content, SearchLog, Interaction
from schemas import SearchRequest, SearchResponse, SearchResult, ContentResponse
from routers.auth import get_current_user
from routers.content import content_to_response

router = APIRouter(prefix="/api/search", tags=["Search"])


# ─── TF-IDF Search Engine ───
class SearchEngine:
    """TF-IDF based search engine with fuzzy matching."""

    def __init__(self):
        self.vectorizer = TfidfVectorizer(
            stop_words="english",
            max_features=5000,
            ngram_range=(1, 2),
            min_df=1,
        )

    def search(self, query: str, contents: List[Content], limit: int = 20) -> List[tuple]:
        """Search contents using TF-IDF cosine similarity + fuzzy matching."""
        if not contents:
            return []

        # Build corpus from content
        corpus = []
        for c in contents:
            text_parts = [c.title, c.title]  # Double-weight title
            if c.description:
                text_parts.append(c.description)
            if c.tags:
                text_parts.extend(c.tags)
            if c.category:
                text_parts.append(c.category)
            corpus.append(" ".join(text_parts))

        # TF-IDF similarity
        try:
            tfidf_matrix = self.vectorizer.fit_transform(corpus + [query])
            query_vec = tfidf_matrix[-1]
            content_matrix = tfidf_matrix[:-1]
            tfidf_scores = cosine_similarity(query_vec, content_matrix).flatten()
        except Exception:
            tfidf_scores = np.zeros(len(contents))

        # Fuzzy matching boost
        query_lower = query.lower()
        results = []
        for i, content in enumerate(contents):
            score = float(tfidf_scores[i]) * 10  # Scale up for readability

            # Fuzzy title match boost
            title_sim = SequenceMatcher(None, query_lower, content.title.lower()).ratio()
            score += title_sim * 3.0

            # Exact term matches boost
            for term in query_lower.split():
                if term in content.title.lower():
                    score += 2.0
                if content.description and term in content.description.lower():
                    score += 0.5
                if content.tags:
                    for tag in content.tags:
                        if term in tag.lower():
                            score += 1.5

            # Popularity boost
            score += min(content.views / 200, 0.5)
            score += min(content.upvotes / 20, 0.5)

            if score > 0.1:
                snippet = generate_snippet(query, content.description)
                results.append((content, round(score, 2), snippet))

        results.sort(key=lambda x: x[1], reverse=True)
        return results[:limit]


search_engine = SearchEngine()


def generate_snippet(query: str, description: str, max_len: int = 200) -> str:
    """Generate a relevant snippet from the description."""
    if not description:
        return ""
    query_terms = query.lower().split()
    sentences = re.split(r'[.!?]+', description)

    best_sentence = ""
    best_score = 0
    for sent in sentences:
        sent = sent.strip()
        if not sent:
            continue
        score = sum(1 for t in query_terms if t in sent.lower())
        if score > best_score:
            best_score = score
            best_sentence = sent

    if not best_sentence:
        best_sentence = description[:max_len]

    return best_sentence[:max_len] + ("..." if len(best_sentence) > max_len else "")


def get_suggestions(query: str, db: Session) -> List[str]:
    """Generate search suggestions based on popular searches and content."""
    suggestions = []
    # Recent popular searches
    recent = (
        db.query(SearchLog.query, func.count(SearchLog.id).label("cnt"))
        .filter(SearchLog.query.ilike(f"%{query}%"))
        .group_by(SearchLog.query)
        .order_by(func.count(SearchLog.id).desc())
        .limit(5)
        .all()
    )
    suggestions.extend([r[0] for r in recent if r[0].lower() != query.lower()])

    # Content title suggestions
    titles = (
        db.query(Content.title)
        .filter(Content.title.ilike(f"%{query}%"), Content.is_active == True)
        .limit(5)
        .all()
    )
    suggestions.extend([t[0] for t in titles])

    return list(dict.fromkeys(suggestions))[:5]  # Dedupe, max 5


@router.get("/", response_model=SearchResponse)
def search(
    q: str = Query(..., min_length=1),
    content_type: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Build base query
    base_query = db.query(Content).filter(Content.is_active == True)

    if content_type:
        base_query = base_query.filter(Content.content_type == content_type)
    if category:
        base_query = base_query.filter(Content.category == category)

    all_content = base_query.limit(200).all()

    # Use TF-IDF search engine
    scored = search_engine.search(q, all_content, limit=limit)

    # Log search
    search_log = SearchLog(
        query=q,
        results_count=len(scored),
        user_id=current_user.id,
    )
    db.add(search_log)

    # Track interaction
    interaction = Interaction(
        user_id=current_user.id,
        action="search",
        query=q,
    )
    db.add(interaction)
    db.commit()

    suggestions = get_suggestions(q, db)

    return SearchResponse(
        results=[
            SearchResult(
                content=content_to_response(c, db),
                relevance_score=score,
                snippet=snippet,
            )
            for c, score, snippet in scored
        ],
        total=len(scored),
        query=q,
        suggestions=suggestions,
    )


@router.get("/autocomplete")
def autocomplete(
    q: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
):
    """Get autocomplete suggestions for search."""
    suggestions = []

    # Content title matches
    titles = (
        db.query(Content.title)
        .filter(Content.title.ilike(f"%{q}%"), Content.is_active == True)
        .limit(8)
        .all()
    )
    suggestions.extend([t[0] for t in titles])

    # Category matches
    cats = (
        db.query(Content.category)
        .filter(Content.category.ilike(f"%{q}%"), Content.is_active == True)
        .distinct()
        .limit(3)
        .all()
    )
    suggestions.extend([c[0] for c in cats])

    # Tag matches
    all_content = db.query(Content.tags).filter(Content.is_active == True).all()
    for (tags,) in all_content:
        if tags:
            for tag in tags:
                if q.lower() in tag.lower() and tag not in suggestions:
                    suggestions.append(tag)
                    if len(suggestions) >= 10:
                        break
        if len(suggestions) >= 10:
            break

    # Dedupe and limit
    return list(dict.fromkeys(suggestions))[:10]
