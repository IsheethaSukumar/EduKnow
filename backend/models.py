from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, Text, ForeignKey, Enum, JSON
)
from sqlalchemy.orm import relationship
from database import Base
from sqlalchemy import UniqueConstraint
from datetime import datetime
import uuid
import enum


class UserRole(str, enum.Enum):
    STUDENT = "student"
    FACULTY = "faculty"
    STAFF = "staff"
    PARENT = "parent"
    ALUMNI = "alumni"
    ADMIN = "admin"


class ContentType(str, enum.Enum):
    DOCUMENT = "document"
    VIDEO = "video"
    ARTICLE = "article"
    COURSE = "course"
    PRESENTATION = "presentation"


class ActionType(str, enum.Enum):
    VIEW = "view"
    SEARCH = "search"
    DOWNLOAD = "download"
    UPVOTE = "upvote"
    UPLOAD = "upload"
    CHAT = "chat"
    LOGIN = "login"


def generate_uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    role = Column(String(20), nullable=False, default=UserRole.STUDENT.value)
    department = Column(String(100), default="General")
    avatar_url = Column(String(255), default="")
    interests = Column(JSON, default=list)
    reputation_score = Column(Integer, default=0)
    streak_days = Column(Integer, default=0)
    last_active = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)

    contents = relationship("Content", back_populates="author")
    interactions = relationship("Interaction", back_populates="user")
    badges = relationship("UserBadge", back_populates="user")


class Content(Base):
    __tablename__ = "content"

    id = Column(String, primary_key=True, default=generate_uuid)
    title = Column(String(255), nullable=False, index=True)
    description = Column(Text, default="")
    content_type = Column(String(20), nullable=False, default=ContentType.DOCUMENT.value)
    category = Column(String(100), default="General")
    tags = Column(JSON, default=list)
    source_system = Column(String(50), default="internal")
    file_url = Column(String(255), default="")
    thumbnail_url = Column(String(255), default="")
    author_id = Column(String, ForeignKey("users.id"), nullable=True)
    views = Column(Integer, default=0)
    upvotes = Column(Integer, default=0)
    downloads = Column(Integer, default=0)
    version = Column(Integer, default=1)
    extra_metadata = Column(JSON, default=dict)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    author = relationship("User", back_populates="contents")
    interactions = relationship("Interaction", back_populates="content")
    ratings = relationship("ContentRating", back_populates="content", cascade="all, delete-orphan")


class Interaction(Base):
    __tablename__ = "interactions"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    content_id = Column(String, ForeignKey("content.id"), nullable=True)
    action = Column(String(20), nullable=False)
    query = Column(String(255), default="")
    context = Column(JSON, default=dict)
    timestamp = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="interactions")
    content = relationship("Content", back_populates="interactions")


class Badge(Base):
    __tablename__ = "badges"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text, default="")
    icon = Column(String(50), default="award")
    color = Column(String(7), default="#6366f1")
    criteria_action = Column(String(20), nullable=False)
    criteria_count = Column(Integer, default=1)
    criteria_timeframe = Column(String(20), default="all_time")
    points_value = Column(Integer, default=10)
    rarity = Column(String(20), default="common")

    user_badges = relationship("UserBadge", back_populates="badge")


class UserBadge(Base):
    __tablename__ = "user_badges"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    badge_id = Column(String, ForeignKey("badges.id"), nullable=False)
    earned_at = Column(DateTime, default=datetime.utcnow)
    progress = Column(Float, default=0.0)

    user = relationship("User", back_populates="badges")
    badge = relationship("Badge", back_populates="user_badges")


class SearchLog(Base):
    __tablename__ = "search_logs"

    id = Column(String, primary_key=True, default=generate_uuid)
    query = Column(String(255), nullable=False)
    results_count = Column(Integer, default=0)
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)


class Bookmark(Base):
    __tablename__ = "bookmarks"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    content_id = Column(String, ForeignKey("content.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class StudySession(Base):
    __tablename__ = "study_sessions"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    content_id = Column(String, ForeignKey("content.id"), nullable=True)
    duration_seconds = Column(Integer, nullable=False, default=0)
    session_type = Column(String(20), default="focus")
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)

    user = relationship("User", foreign_keys=[user_id])
    content = relationship("Content", foreign_keys=[content_id])


class Note(Base):
    __tablename__ = "notes"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    content_id = Column(String, ForeignKey("content.id"), nullable=True)
    title = Column(String(255), default="")
    text = Column(Text, nullable=False)
    color = Column(String(7), default="#6366f1")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id])
    content = relationship("Content", foreign_keys=[content_id])


class Collection(Base):
    __tablename__ = "collections"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, default="")
    color = Column(String(7), default="#6366f1")
    is_public = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id])
    items = relationship("CollectionItem", back_populates="collection", cascade="all, delete-orphan")


class CollectionItem(Base):
    __tablename__ = "collection_items"

    id = Column(String, primary_key=True, default=generate_uuid)
    collection_id = Column(String, ForeignKey("collections.id"), nullable=False)
    content_id = Column(String, ForeignKey("content.id"), nullable=False)
    order = Column(Integer, default=0)
    added_at = Column(DateTime, default=datetime.utcnow)

    collection = relationship("Collection", back_populates="items")
    content = relationship("Content", foreign_keys=[content_id])


class Flashcard(Base):
    __tablename__ = "flashcards"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    deck_name = Column(String(255), default="Default") 
    front = Column(Text, nullable=False)
    back = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # SRS Fields (SuperMemo-2 algorithm)
    repetition = Column(Integer, default=0)
    interval = Column(Integer, default=1)  # in days
    easiness_factor = Column(Float, default=2.5)
    next_review_date = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id])


class AnalysisHistory(Base):
    __tablename__ = "analysis_history"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    filename = Column(String(255), nullable=False)
    summary = Column(Text, default="")
    key_concepts = Column(JSON, default=list)
    flashcards = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id])


class ChatHistory(Base):
    __tablename__ = "chat_history"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    query = Column(Text, nullable=False)
    response = Column(Text, nullable=False)
    sources = Column(JSON, default=list)
    rich_content = Column(JSON, default=None)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id])


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(20), default="info") # info, success, warning, study
    is_read = Column(Boolean, default=False)
    link = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id])


class ContentRating(Base):
    __tablename__ = "content_ratings"

    id = Column(String, primary_key=True, default=generate_uuid)
    content_id = Column(String, ForeignKey("content.id"), nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    rating = Column(Integer, nullable=False) # 1-5
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (UniqueConstraint('user_id', 'content_id', name='_user_content_rating_uc'),)

    user = relationship("User", foreign_keys=[user_id])
    content = relationship("Content", back_populates="ratings")
