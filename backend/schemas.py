from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


# ─── Auth Schemas ───
class UserRegister(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: str = Field(..., max_length=100)
    password: str = Field(..., min_length=6)
    full_name: str = Field(..., min_length=2, max_length=100)
    role: str = "student"
    department: str = "General"
    interests: List[str] = []


class UserLogin(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    full_name: str
    role: str
    department: str
    avatar_url: str = ""
    interests: List[str] = []
    reputation_score: int = 0
    streak_days: int = 0
    created_at: datetime = None

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    department: Optional[str] = None
    interests: Optional[List[str]] = None
    avatar_url: Optional[str] = None


# ─── Content Schemas ───
class ContentCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: str = ""
    content_type: str = "document"
    category: str = "General"
    tags: List[str] = []
    source_system: str = "internal"
    file_url: str = ""
    thumbnail_url: str = ""
    metadata: Dict[str, Any] = {}


class ContentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    is_active: Optional[bool] = None


class ContentResponse(BaseModel):
    id: str
    title: str
    description: str
    content_type: str
    category: str
    tags: List[str] = []
    source_system: str
    file_url: str = ""
    thumbnail_url: str = ""
    author_id: Optional[str] = None
    author_name: Optional[str] = None
    views: int = 0
    upvotes: int = 0
    downloads: int = 0
    version: int = 1
    is_active: bool = True
    created_at: datetime = None
    updated_at: datetime = None

    class Config:
        from_attributes = True


# ─── Search Schemas ───
class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1)
    content_type: Optional[str] = None
    category: Optional[str] = None
    limit: int = 20


class SearchResult(BaseModel):
    content: ContentResponse
    relevance_score: float
    snippet: str = ""


class SearchResponse(BaseModel):
    results: List[SearchResult]
    total: int
    query: str
    suggestions: List[str] = []


# ─── Chatbot Schemas ───
class ChatMessage(BaseModel):
    message: str = Field(..., min_length=1)
    context: Dict[str, Any] = {}
    history: List[Dict[str, Any]] = []


class ChatResponse(BaseModel):
    response: str
    sources: List[Dict[str, str]] = []
    suggested_questions: List[str] = []


# ─── Gamification Schemas ───
class BadgeResponse(BaseModel):
    id: str
    name: str
    description: str
    icon: str
    color: str
    points_value: int
    rarity: str
    earned: bool = False
    earned_at: Optional[datetime] = None
    progress: float = 0.0

    class Config:
        from_attributes = True


class LeaderboardEntry(BaseModel):
    rank: int
    user_id: str
    username: str
    full_name: str
    role: str
    reputation_score: int
    badge_count: int
    avatar_url: str = ""


class GamificationStats(BaseModel):
    reputation_score: int
    streak_days: int
    badges_earned: int
    total_badges: int
    rank: int
    points_history: List[Dict[str, Any]] = []


# ─── Analytics Schemas ───
class AnalyticsOverview(BaseModel):
    total_users: int
    total_content: int
    total_searches: int
    total_interactions: int
    active_users_today: int
    content_uploaded_today: int


class ContentAnalytics(BaseModel):
    by_type: Dict[str, int]
    by_category: Dict[str, int]
    popular_content: List[ContentResponse]
    trending_tags: List[Dict[str, Any]]


class UserAnalytics(BaseModel):
    by_role: Dict[str, int]
    by_department: Dict[str, int]
    top_contributors: List[Dict[str, Any]]
    activity_timeline: List[Dict[str, Any]]


class SearchAnalytics(BaseModel):
    popular_queries: List[Dict[str, Any]]
    search_volume: List[Dict[str, Any]]
    zero_result_queries: List[str]


# ─── Recommendation Schemas ───
class RecommendationResponse(BaseModel):
    recommendations: List[ContentResponse]
    reason: str = ""


# ─── Bookmark Schemas ───
class BookmarkResponse(BaseModel):
    id: str
    content_id: str
    content: ContentResponse
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ─── Study Session Schemas ───
class StudySessionCreate(BaseModel):
    content_id: Optional[str] = None
    duration_seconds: int = Field(..., gt=0)
    session_type: str = "focus"

class StudySessionResponse(BaseModel):
    id: str
    content_id: Optional[str] = None
    content_title: str = ""
    duration_seconds: int
    session_type: str
    started_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ─── Note Schemas ───
class NoteCreate(BaseModel):
    content_id: Optional[str] = None
    title: str = ""
    text: str = Field(..., min_length=1)
    color: str = "#6366f1"

class NoteUpdate(BaseModel):
    title: Optional[str] = None
    text: Optional[str] = None
    color: Optional[str] = None

class NoteResponse(BaseModel):
    id: str
    content_id: Optional[str] = None
    content_title: str = ""
    title: str = ""
    text: str
    color: str = "#6366f1"
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ─── Collection Schemas ───
class CollectionCreate(BaseModel):
    name: str = Field(..., min_length=1)
    description: str = ""
    color: str = "#6366f1"
    is_public: bool = False

class CollectionItemAdd(BaseModel):
    content_id: str

class CollectionItemResponse(BaseModel):
    id: str
    content_id: str
    content: ContentResponse
    order: int = 0
    added_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class CollectionResponse(BaseModel):
    id: str
    name: str
    description: str = ""
    color: str = "#6366f1"
    is_public: bool = False
    item_count: int = 0
    items: List[CollectionItemResponse] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ─── Personal Analytics Schemas ───
class DailyStudyTime(BaseModel):
    date: str
    seconds: int

class CategoryBreakdown(BaseModel):
    category: str
    count: int

class PersonalAnalyticsResponse(BaseModel):
    total_study_seconds: int = 0
    total_sessions: int = 0
    total_notes: int = 0
    total_collections: int = 0
    total_bookmarks: int = 0
    daily_study: List[DailyStudyTime] = []
    category_breakdown: List[CategoryBreakdown] = []
    recent_activity: List[Dict[str, Any]] = []
    streak_days: int = 0


# Forward reference resolution
TokenResponse.model_rebuild()


class FlashcardCreate(BaseModel):
    deck_name: str = "Default"
    front: str
    back: str

class FlashcardReview(BaseModel):
    quality: int

class FlashcardResponse(BaseModel):
    id: str
    deck_name: str
    front: str
    back: str
    repetition: int
    interval: int
    easiness_factor: float
    next_review_date: datetime
    created_at: datetime

    class Config:
        from_attributes = True
