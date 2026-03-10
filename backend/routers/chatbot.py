from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any, Optional
import re
import random
import os
import json
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

from database import get_db
from models import User, Content, Interaction, Flashcard, ChatHistory
from schemas import ChatMessage, ChatResponse
from routers.auth import get_current_user

router = APIRouter(prefix="/api/chatbot", tags=["EduBot"])

# ─── Groq LLM Integration ───
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
groq_client = None

try:
    if GROQ_API_KEY:
        from groq import Groq
        groq_client = Groq(api_key=GROQ_API_KEY)
except ImportError:
    pass


SUGGESTED_QUESTIONS = [
    "Explain machine learning in simple terms",
    "Generate a quiz about data structures",
    "Summarize the key concepts in calculus",
    "Create flashcards for computer networks",
    "What resources do we have on Python programming?",
    "Help me study for my algorithms exam",
    "What are the library hours?",
    "Suggest a study plan for physics",
    "Quiz me on database concepts",
    "Explain the difference between TCP and UDP",
    "What courses are available in computer science?",
    "Help me understand quantum mechanics basics",
]

# ─── Institutional Knowledge Base ───
KNOWLEDGE_BASE = {
    "library": "The main library is open Mon-Fri 8AM-10PM, Sat 9AM-6PM, Sun 12PM-8PM. Finals week hours extend to midnight. Digital resources (IEEE, ACM, Springer, JSTOR) available 24/7 through the library portal. Study rooms bookable online. Science reading room in Building D.",
    "exams": "Midterms: Week 7-8. Finals: Week 15-16. Supplementary exams 2 weeks after finals. Grading: A(90-100), B(80-89), C(70-79), D(60-69), F(<60). Bring valid ID. Accommodations through Disability Services. Past papers available in repository.",
    "courses": "Registration opens 2 weeks before semester. Priority: seniors first. Prerequisites in catalog. Withdrawal deadline: Week 10. Course materials on content repository. Some courses use OpenStax free textbooks.",
    "facilities": "Computer labs in Buildings B/D, 7AM-11PM. Software: MATLAB, AutoCAD, VS Code, Python, Adobe Suite. Campus WiFi: 'EduKno-Campus' with student credentials. Study rooms in library (10 rooms) and Building E (5 rooms).",
    "support": "Academic advisors: Student Success Center, Building A. Walk-in Mon-Wed 10AM-2PM. IT support: ext. 4000 or Building B Room 101. Counseling: Building E 2nd floor (free, confidential). Financial aid: Building A Room 200.",
    "events": "Weekly research seminars (Thursdays), monthly guest lectures, annual hackathon (November), research symposium (April). 50+ student clubs. Career fairs: September and March.",
    "scholarships": "Merit: Dean's List (3.5+ GPA), Presidential Scholar (top 5%). Need-based via FAFSA. Applications due March 1 for fall. Emergency financial assistance through Dean of Students.",
    "housing": "6 residence halls with single/double/suite rooms. All include WiFi and laundry. Housing deposit due April 1. Off-campus shuttle connects major areas.",
}


# ─── TF-IDF RAG Engine ───
class RAGEngine:
    def __init__(self):
        self.vectorizer = TfidfVectorizer(
            stop_words="english", max_features=5000, ngram_range=(1, 2), min_df=1
        )

    def retrieve(self, query: str, db: Session, top_k: int = 5) -> List[Dict]:
        documents = []

        # Knowledge base docs
        for topic, text in KNOWLEDGE_BASE.items():
            documents.append({
                "text": f"{topic}: {text}",
                "source_type": "knowledge",
                "title": topic.title(),
                "content": text,
            })

        # DB content
        db_contents = db.query(Content).filter(Content.is_active == True).all()
        for c in db_contents:
            parts = [c.title]
            if c.description:
                parts.append(c.description)
            if c.tags:
                parts.extend(c.tags)
            documents.append({
                "text": " ".join(parts),
                "source_type": "content",
                "title": c.title,
                "content_type": c.content_type,
                "content_id": c.id,
                "content": c.description or c.title,
                "url": c.file_url or "",
            })

        if not documents:
            return []

        corpus = [d["text"] for d in documents] + [query]
        try:
            tfidf = self.vectorizer.fit_transform(corpus)
            sims = cosine_similarity(tfidf[-1:], tfidf[:-1]).flatten()
        except Exception:
            return []

        top_idx = np.argsort(sims)[::-1][:top_k]
        results = []
        for i in top_idx:
            if sims[i] > 0.01:
                doc = documents[i].copy()
                doc["score"] = float(sims[i])
                results.append(doc)
        return results


rag = RAGEngine()


def call_llm(system_prompt: str, user_message: str, context: str = "") -> Optional[str]:
    """Call Groq LLM. Returns None if unavailable."""
    if not groq_client:
        return None
    try:
        messages = [{"role": "system", "content": system_prompt}]
        if context:
            messages.append({"role": "user", "content": f"Context:\n{context}"})
        messages.append({"role": "user", "content": user_message})

        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            temperature=0.7,
            max_tokens=1024,
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"LLM error: {e}")
        return None


def call_llm_json(system_prompt: str, user_message: str, context: str = "") -> Optional[str]:
    """Call Groq LLM with JSON mode. Returns None if unavailable."""
    if not groq_client:
        return None
    try:
        messages = [{"role": "system", "content": system_prompt}]
        if context:
            messages.append({"role": "user", "content": f"Context:\n{context}"})
        messages.append({"role": "user", "content": user_message})

        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            temperature=0.7,
            max_tokens=2048,
            response_format={"type": "json_object"},
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"LLM JSON error: {e}")
        return None


def generate_quiz(topic: str, docs: List[Dict]) -> Dict:
    """Generate a structured quiz with questions."""
    context = "\n\n".join([f"Title: {d['title']}\nContent: {d['content']}" for d in docs[:5]])

    llm_result = call_llm_json(
        "You are an educational quiz generator. Create a 5-question multiple-choice quiz. "
        "Return valid JSON in this exact format: "
        '{"title":"Quiz Title","questions":[{"question":"...","options":["A","B","C","D"],"correct":0,"explanation":"..."}]} '
        "where 'correct' is the 0-based index of the correct option.",
        f"Generate a quiz about: {topic}",
        context,
    )
    if llm_result:
        try:
            data = json.loads(llm_result)
            if "questions" in data:
                return {"type": "quiz", "data": data}
        except json.JSONDecodeError:
            pass

    # Fallback: generate from docs
    questions = []
    for i, doc in enumerate(docs[:5], 1):
        content = doc.get("content", "")
        title = doc.get("title", "")
        sentences = [s.strip() for s in re.split(r'[.!?]+', content) if len(s.strip()) > 20]
        if sentences:
            q_sentence = sentences[0]
            words = q_sentence.split()
            if len(words) > 5:
                key_word = words[len(words)//2]
                blank = q_sentence.replace(key_word, "______", 1)
                questions.append({
                    "question": f"Fill in the blank: {blank}",
                    "options": [key_word, words[0], words[-1], words[len(words)//3]],
                    "correct": 0,
                    "explanation": q_sentence,
                })
            else:
                questions.append({
                    "question": f"What is the key concept of '{title}'?",
                    "options": [sentences[0][:60], "None of these", "All of the above", "Not enough information"],
                    "correct": 0,
                    "explanation": sentences[0],
                })
    
    return {
        "type": "quiz",
        "data": {
            "title": f"Quiz: {topic.title()}",
            "questions": questions if questions else [{
                "question": f"What do you know about {topic}?",
                "options": ["I need to study more", "I'm an expert", "I've heard of it", "Never seen it"],
                "correct": 0,
                "explanation": "Keep studying to learn more!",
            }],
        },
    }


def generate_flashcards(topic: str, docs: List[Dict], user_id: str, db: Session) -> Dict:
    """Generate structured flashcards and save them to the database."""
    context = "\n\n".join([f"Title: {d['title']}\nContent: {d['content']}" for d in docs[:5]])

    cards = []
    llm_result = call_llm_json(
        "You are a flashcard creator. Create 6 flashcards from the context. "
        "Return valid JSON in this exact format: "
        '{"cards":[{"front":"question or term","back":"answer or definition"}]}',
        f"Create flashcards about: {topic}",
        context,
    )
    if llm_result:
        try:
            data = json.loads(llm_result)
            if "cards" in data:
                cards = data["cards"]
        except json.JSONDecodeError:
            pass

    # Fallback
    if not cards:
        for doc in docs[:6]:
            content = doc.get("content", "")
            title = doc.get("title", "")
            sentences = [s.strip() for s in re.split(r'[.!?]+', content) if len(s.strip()) > 15]
            if sentences:
                cards.append({"front": title, "back": sentences[0] + "."})

    # Save to database for SRS
    deck_name = topic.title() if topic else "General"
    saved_cards = []
    for c in cards:
        card = Flashcard(
            user_id=user_id,
            deck_name=deck_name,
            front=c["front"],
            back=c["back"],
        )
        db.add(card)
        db.flush()
        saved_cards.append({
            "id": card.id,
            "front": c["front"],
            "back": c["back"],
            "deck_name": deck_name,
        })
    db.commit()

    return {
        "type": "flashcards",
        "data": {
            "deck_name": deck_name,
            "cards": saved_cards,
            "saved_count": len(saved_cards),
        },
    }


def generate_summary(topic: str, docs: List[Dict]) -> str:
    """Generate a summary - returns markdown text."""
    context = "\n\n".join([f"Title: {d['title']}\nContent: {d['content']}" for d in docs[:5]])

    llm = call_llm(
        "You are an educational summarizer. Create a clear, structured summary of the topic "
        "using bullet points, key takeaways, and important concepts. Format with markdown. "
        "Do NOT include any source references or citations. Focus only on the content.",
        f"Summarize the key concepts about: {topic}",
        context,
    )
    if llm:
        return llm

    # Fallback
    summary = f"📋 **Summary: {topic.title()}**\n\n"
    for doc in docs[:4]:
        content = doc.get("content", "")
        title = doc.get("title", "")
        sentences = [s.strip() for s in re.split(r'[.!?]+', content) if len(s.strip()) > 20]
        key_points = sentences[:3]
        if key_points:
            summary += f"**{title}:**\n"
            for p in key_points:
                summary += f"• {p}.\n"
            summary += "\n"
    return summary


def generate_notes(topic: str, docs: List[Dict]) -> str:
    """Generate study notes - returns markdown text."""
    context = "\n\n".join([f"Title: {d['title']}\nContent: {d['content']}" for d in docs[:5]])

    llm = call_llm(
        "You are a study notes creator. Create well-organized, concise study notes "
        "with headers, bullet points, key formulas/concepts, and mnemonics where helpful. "
        "Format with markdown. Do NOT include source references.",
        f"Create study notes about: {topic}",
        context,
    )
    if llm:
        return llm

    # Fallback
    notes = f"📝 **Study Notes: {topic.title()}**\n\n"
    for doc in docs[:4]:
        sentences = [s.strip() for s in re.split(r'[.!?]+', doc.get("content", "")) if len(s.strip()) > 15]
        if sentences:
            notes += f"### {doc['title']}\n"
            for s in sentences[:4]:
                notes += f"- {s}.\n"
            notes += "\n"
    return notes


def handle_command(query: str, docs: List[Dict], user: User, db: Session) -> Optional[Dict]:
    """Handle slash commands. Returns structured data for rich UI."""
    lower = query.strip().lower()

    if lower.startswith("/quiz"):
        topic = query[5:].strip() or "general knowledge"
        return generate_quiz(topic, docs)

    if lower.startswith("/flashcards"):
        topic = query[11:].strip() or "general"
        return generate_flashcards(topic, docs, user.id, db)

    if lower.startswith("/summary"):
        topic = query[8:].strip() or "this topic"
        return {"type": "text", "data": generate_summary(topic, docs)}

    if lower.startswith("/notes"):
        topic = query[6:].strip() or "this topic"
        return {"type": "text", "data": generate_notes(topic, docs)}

    return None


def generate_conversational_response(query: str, docs: List[Dict], user_role: str, history: List) -> str:
    """Generate a conversational response using LLM or smart fallback."""
    context = "\n\n".join([
        f"Source: {d['title']} ({d['source_type']})\nContent: {d['content'][:500]}"
        for d in docs[:6]
    ])

    # History for multi-turn
    history_text = ""
    if history:
        recent = history[-4:]
        history_text = "Recent conversation:\n" + "\n".join([
            f"{'User' if m.get('sender') == 'user' else 'Bot'}: {m.get('text', '')[:200]}"
            for m in recent
        ])

    system_prompt = (
        "You are EduBot, an intelligent AI assistant for an educational knowledge management platform called EduKno. "
        "You help students, faculty, and staff with academic questions, study resources, and institutional information. "
        "Use the provided context to answer accurately. If the context doesn't cover the question, use your knowledge but say so. "
        "Be concise but thorough. Use markdown formatting for readability. "
        "Do NOT list source references at the end of your response — those are handled separately. "
        "Mention specific resources from the context when relevant. "
        f"The user's role is: {user_role}. "
        "Available commands: /quiz <topic>, /summary <topic>, /flashcards <topic>, /notes <topic>. "
        "If the user seems to want study help, suggest these commands."
    )

    full_context = f"{context}\n\n{history_text}" if history_text else context
    llm_response = call_llm(system_prompt, query, full_context)

    if llm_response:
        return llm_response

    # Smart fallback without LLM
    if not docs:
        return (
            "I don't have specific information about that yet, but I can help you with many topics!\n\n"
            "• **Academic resources** — courses, materials, study guides\n"
            "• **Campus info** — library, labs, facilities, WiFi\n"
            "• **Study tools** — use `/quiz`, `/summary`, `/flashcards`, `/notes` + a topic\n"
            "• **Support** — academic advising, IT help, counseling\n\n"
            "For example: `/quiz data structures` or `/summary machine learning`"
        )

    # Build response from retrieved docs
    response_parts = []
    knowledge_docs = [d for d in docs if d["source_type"] == "knowledge"]
    content_docs = [d for d in docs if d["source_type"] == "content"]

    if knowledge_docs:
        response_parts.append(knowledge_docs[0]["content"])

    if content_docs:
        response_parts.append("\n\n📚 **Relevant Resources:**")
        emojis = {"document": "📄", "video": "🎬", "article": "📰", "course": "🎓", "presentation": "📊"}
        for d in content_docs[:3]:
            emoji = emojis.get(d.get("content_type", ""), "📄")
            response_parts.append(f"\n{emoji} **{d['title']}** ({d.get('content_type', 'resource')})")

    response_parts.append(
        "\n\n💡 *Try `/quiz`, `/summary`, `/flashcards`, or `/notes` + topic for study tools!*"
    )
    return "".join(response_parts)


@router.post("/chat", response_model=ChatResponse)
def chat(
    message: ChatMessage,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = message.message
    history = message.history or []

    # Build context-enriched query for retrieval
    context_query = query
    for cmd in ["/quiz", "/summary", "/flashcards", "/notes"]:
        if query.lower().startswith(cmd):
            context_query = query[len(cmd):].strip() or query
            break

    if history:
        recent_user_msgs = " ".join([
            m.get("text", "") for m in history[-2:] if m.get("sender") == "user"
        ])
        context_query = f"{recent_user_msgs} {context_query}"

    # RAG retrieval
    docs = rag.retrieve(context_query, db, top_k=6)

    # Handle slash commands — returns structured data
    cmd_result = handle_command(query, docs, current_user, db)
    
    # Build response
    if cmd_result:
        if cmd_result["type"] == "text":
            response = cmd_result["data"]
            rich_content = None
        else:
            # For quiz/flashcards, set a text summary + attach rich content
            if cmd_result["type"] == "quiz":
                qcount = len(cmd_result["data"].get("questions", []))
                response = f"📝 Generated a **{qcount}-question quiz** about the topic! Answer the questions below."
            elif cmd_result["type"] == "flashcards":
                ccount = cmd_result["data"].get("saved_count", 0)
                deck = cmd_result["data"].get("deck_name", "")
                response = f"🎴 Created **{ccount} flashcards** in the **{deck}** deck! They've been saved to your SRS system for spaced repetition review. Flip the cards below to study!"
            else:
                response = "Here you go!"
            rich_content = cmd_result
    else:
        response = generate_conversational_response(query, docs, current_user.role, history)
        rich_content = None

    # Sources — only for normal responses, not commands
    sources = []
    if not cmd_result:
        seen = set()
        for d in docs[:3]:  # Limit to top 3 sources
            t = d.get("title", "Unknown")
            if t in seen:
                continue
            seen.add(t)
            entry = {"title": t, "type": d["source_type"]}
            if d["source_type"] == "content":
                entry["id"] = d.get("content_id", "")
                entry["type"] = d.get("content_type", "resource")
            sources.append(entry)

    # Track interaction
    db.add(Interaction(user_id=current_user.id, action="chat", query=query,
                       context={"sources": len(sources), "has_llm": groq_client is not None}))
    db.flush()

    # Auto-save to chat history
    chat_entry = ChatHistory(
        user_id=current_user.id,
        query=query,
        response=response,
        sources=sources,
        rich_content=rich_content,
    )
    db.add(chat_entry)
    db.commit()

    # Context-aware suggestions
    is_study_query = any(w in query.lower() for w in ["study", "exam", "learn", "quiz", "help"])
    if is_study_query:
        suggestions = [
            f"/quiz {context_query[:30]}",
            f"/summary {context_query[:30]}",
            f"/flashcards {context_query[:30]}",
            "What study resources are available?",
        ]
    else:
        remaining = [q for q in SUGGESTED_QUESTIONS if q.lower() != query.lower()]
        suggestions = random.sample(remaining, min(4, len(remaining)))

    result = ChatResponse(response=response, sources=sources, suggested_questions=suggestions)
    
    # Attach rich_content as extra data
    response_dict = result.model_dump()
    if rich_content:
        response_dict["rich_content"] = rich_content
    
    from fastapi.responses import JSONResponse
    return JSONResponse(content=response_dict)


@router.get("/suggestions", response_model=List[str])
def get_suggestions():
    return random.sample(SUGGESTED_QUESTIONS, min(6, len(SUGGESTED_QUESTIONS)))


# ── Chat History Endpoints ──

from fastapi import HTTPException

@router.get("/history")
def get_chat_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return the user's chat history, most recent first."""
    entries = (
        db.query(ChatHistory)
        .filter(ChatHistory.user_id == current_user.id)
        .order_by(ChatHistory.created_at.desc())
        .all()
    )
    return [
        {
            "id": e.id,
            "query": e.query,
            "response_preview": (e.response[:120] + "...") if e.response and len(e.response) > 120 else e.response,
            "created_at": e.created_at.isoformat() if e.created_at else None,
        }
        for e in entries
    ]


@router.get("/history/{history_id}")
def get_chat_history_item(
    history_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return full detail for a single chat history entry."""
    entry = (
        db.query(ChatHistory)
        .filter(ChatHistory.id == history_id, ChatHistory.user_id == current_user.id)
        .first()
    )
    if not entry:
        raise HTTPException(status_code=404, detail="Chat history item not found.")
    return {
        "id": entry.id,
        "query": entry.query,
        "response": entry.response,
        "sources": entry.sources,
        "rich_content": entry.rich_content,
        "created_at": entry.created_at.isoformat() if entry.created_at else None,
    }


@router.delete("/history/{history_id}")
def delete_chat_history_item(
    history_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a chat history item."""
    entry = (
        db.query(ChatHistory)
        .filter(ChatHistory.id == history_id, ChatHistory.user_id == current_user.id)
        .first()
    )
    if not entry:
        raise HTTPException(status_code=404, detail="Chat history item not found.")
    db.delete(entry)
    db.commit()
    return {"detail": "Chat history item deleted."}
