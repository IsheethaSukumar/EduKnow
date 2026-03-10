from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from typing import List, Dict, Any
import os
import json
from groq import Groq
from routers.auth import get_current_user
from models import User, AnalysisHistory
from database import get_db
from sqlalchemy.orm import Session

router = APIRouter(prefix="/api/analyze", tags=["AI Analyzer"])

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
client = None
if GROQ_API_KEY:
    try:
        client = Groq(api_key=GROQ_API_KEY)
    except:
        pass

@router.post("/document")
async def analyze_document(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload a PDF document, extract text, and use Groq Llama-3 to generate
    a summary, key concepts, and flashcards. Auto-saves to history.
    """
    if not client:
        raise HTTPException(status_code=503, detail="Groq API key not configured. LLM analysis unavailable.")
    
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    try:
        import fitz  # PyMuPDF
    except ImportError:
        raise HTTPException(status_code=500, detail="PyMuPDF not installed on server.")

    # Read and extract text
    try:
        content = await file.read()
        doc = fitz.open(stream=content, filetype="pdf")
        text = ""
        # Extract from first 10 pages only to avoid token limits
        for i in range(min(10, len(doc))):
            text += doc[i].get_text() + "\n"
        
        if not text.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from PDF. It might be scanned/image-based.")
        
        # Truncate text to roughly 15000 chars to stay safe within Llama-3 8k context window
        text = text[:15000]

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process PDF: {str(e)}")

    prompt = f"""You are an expert AI tutor. Analyze the following document text and provide:
1. A concise, high-level summary (2-3 paragraphs).
2. A list of 5-7 key concepts explained simply.
3. 5 Anki-style flashcards with a 'front' (question) and 'back' (answer).

Output the response strictly as a JSON object with this structure:
{{
  "summary": "...",
  "key_concepts": ["concept 1", "concept 2", ...],
  "flashcards": [
    {{"front": "...", "back": "..."}}
  ]
}}

DOCUMENT TEXT:
{text}
"""

    try:
        response = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile",
            response_format={"type": "json_object"},
            temperature=0.3,
            max_tokens=2048
        )
        
        result = json.loads(response.choices[0].message.content)

        # Auto-save to history
        history_entry = AnalysisHistory(
            user_id=current_user.id,
            filename=file.filename,
            summary=result.get("summary", ""),
            key_concepts=result.get("key_concepts", []),
            flashcards=result.get("flashcards", []),
        )
        db.add(history_entry)
        db.commit()
        db.refresh(history_entry)

        return {
            "filename": file.filename,
            "analysis": result,
            "history_id": history_entry.id
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"AI Analysis failed: {str(e)}")


# ── History Endpoints ──

@router.get("/history")
async def get_analysis_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Return the user's past analyses, most recent first."""
    entries = (
        db.query(AnalysisHistory)
        .filter(AnalysisHistory.user_id == current_user.id)
        .order_by(AnalysisHistory.created_at.desc())
        .all()
    )
    return [
        {
            "id": e.id,
            "filename": e.filename,
            "summary_preview": (e.summary[:120] + "...") if e.summary and len(e.summary) > 120 else e.summary,
            "created_at": e.created_at.isoformat() if e.created_at else None,
        }
        for e in entries
    ]


@router.get("/history/{history_id}")
async def get_analysis_history_item(
    history_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Return full analysis details for a given history item."""
    entry = (
        db.query(AnalysisHistory)
        .filter(AnalysisHistory.id == history_id, AnalysisHistory.user_id == current_user.id)
        .first()
    )
    if not entry:
        raise HTTPException(status_code=404, detail="History item not found.")
    return {
        "id": entry.id,
        "filename": entry.filename,
        "summary": entry.summary,
        "key_concepts": entry.key_concepts,
        "flashcards": entry.flashcards,
        "created_at": entry.created_at.isoformat() if entry.created_at else None,
    }


@router.delete("/history/{history_id}")
async def delete_analysis_history_item(
    history_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a history item."""
    entry = (
        db.query(AnalysisHistory)
        .filter(AnalysisHistory.id == history_id, AnalysisHistory.user_id == current_user.id)
        .first()
    )
    if not entry:
        raise HTTPException(status_code=404, detail="History item not found.")
    db.delete(entry)
    db.commit()
    return {"detail": "History item deleted."}
