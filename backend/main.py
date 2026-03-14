from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

load_dotenv()
from database import engine, Base, SessionLocal
from models import (
    User, Content, Interaction, Badge, UserBadge, SearchLog, Bookmark,
    AnalysisHistory, ChatHistory, Notification, ContentRating,
    Collection, CollectionItem, StudySession, Note, Flashcard,
    Assignment, AssignmentSubmission, Complaint, ChatReport
)

# Import routers
from routers import auth, content, search, recommendations, chatbot, gamification, analytics, study, notes, collections, analyzer, flashcards, rooms, interaction, assignments

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="EduKno API",
    description="Unified Knowledge Management Portal for Educational Institutions",
    version="1.0.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router)
app.include_router(content.router)
app.include_router(search.router)
app.include_router(recommendations.router)
app.include_router(chatbot.router)
app.include_router(gamification.router)
app.include_router(analytics.router)
app.include_router(study.router)
app.include_router(notes.router)
app.include_router(collections.router)
app.include_router(analyzer.router)
app.include_router(flashcards.router)
app.include_router(rooms.router)
app.include_router(interaction.router)
app.include_router(assignments.router)


@app.on_event("startup")
def startup_event():
    """Seed database on first startup."""
    from seed_data import seed_database
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()


@app.get("/")
def root():
    return {
        "name": "EduKno API",
        "version": "1.0.0",
        "description": "Unified Knowledge Management Portal",
        "docs": "/docs",
    }


@app.get("/api/health")
def health_check():
    return {"status": "healthy", "service": "edukno-api"}

