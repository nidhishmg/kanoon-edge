import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import User, Case, ChatSession, ChatMessage
from app.schemas.chat import ChatRequest, ChatMessageResponse, Citation
from app.utils.auth import get_current_user

router = APIRouter()

SUGGESTED_QUESTIONS = [
    "What are the key contradictions in this case?",
    "Summarize the prosecution's argument",
    "What is the strongest defence argument?",
    "Are there any procedural violations?",
    "What precedents apply to this case?",
]


def _simulate_ai_response(message: str) -> dict:
    """Simulate AI chat response (to be replaced with RAG pipeline)."""
    if "contradiction" in message.lower():
        content = (
            "I identified 2 key contradictions in the witness statements.\n\n"
            "The primary contradiction relates to the timeline of events — the FIR states the incident "
            "occurred at 10:30 PM, while the first witness statement places it at 8:45 PM. This 1 hour "
            "45 minute gap significantly weakens the prosecution's narrative.\n\n"
            "The second contradiction involves the description of the accused's clothing, which differs "
            "between the FIR and the spot panchnama."
        )
        citations = [
            {"document": "FIR_Copy_2024.pdf", "page": 3, "text": "Time of incident reported as 22:30 hours"},
            {"document": "Witness_Statement_1.pdf", "page": 5, "text": "Witness observed events at approximately 8:45 PM"},
        ]
    elif "procedural" in message.lower() or "violation" in message.lower():
        content = (
            "I found a significant procedural violation: the charge sheet was filed 95 days after "
            "the FIR, exceeding the 90-day statutory limit under Section 167(2) CrPC.\n\n"
            "This creates an enforceable right to default bail. The Supreme Court in Hussainara Khatoon "
            "established that this is a fundamental right that cannot be denied."
        )
        citations = [
            {"document": "Charge_Sheet.pdf", "page": 1, "text": "Charge sheet filing date exceeds statutory period"},
        ]
    else:
        content = (
            "Based on my analysis of the case documents, the defense has several strong arguments "
            "available.\n\n"
            "The most compelling is the procedural violation in the charge sheet filing — it was submitted "
            "95 days after the FIR, exceeding the 90-day statutory limit under Section 167(2) CrPC.\n\n"
            "Additionally, the medical report supports an alternative theory of accidental injury rather "
            "than assault, which directly contradicts the prosecution's case theory.\n\n"
            "Would you like me to elaborate on any of these points?"
        )
        citations = [
            {"document": "FIR_Copy_2024.pdf", "page": 3, "text": "Time of incident reported as 22:30 hours"},
            {"document": "Witness_Statement_1.pdf", "page": 5, "text": "Witness observed events at approximately 8:45 PM"},
        ]
    return {"content": content, "citations": citations}


def _get_or_create_session(db: Session, case_id: str) -> ChatSession:
    session = db.query(ChatSession).filter(ChatSession.case_id == case_id).first()
    if not session:
        session = ChatSession(case_id=case_id)
        db.add(session)
        db.commit()
        db.refresh(session)
    return session


def _msg_to_response(msg: ChatMessage) -> ChatMessageResponse:
    citations = None
    if msg.citations_json:
        citations = [Citation(**c) for c in json.loads(msg.citations_json)]
    return ChatMessageResponse(
        id=msg.id,
        role=msg.sender_type,
        content=msg.content,
        timestamp=msg.timestamp.isoformat() if msg.timestamp else "",
        citations=citations,
    )


@router.get("/suggested-questions")
async def get_suggested_questions():
    return SUGGESTED_QUESTIONS


@router.get("/{case_id}", response_model=List[ChatMessageResponse])
async def get_messages(
    case_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get chat history for a case."""
    case = db.query(Case).filter(Case.id == case_id, Case.user_id == current_user.id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    session = db.query(ChatSession).filter(ChatSession.case_id == case_id).first()
    if not session:
        return []

    messages = db.query(ChatMessage).filter(
        ChatMessage.session_id == session.id
    ).order_by(ChatMessage.timestamp).all()
    return [_msg_to_response(m) for m in messages]


@router.post("/{case_id}", response_model=ChatMessageResponse)
async def send_message(
    case_id: str,
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Send a message to the AI case assistant."""
    case = db.query(Case).filter(Case.id == case_id, Case.user_id == current_user.id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    session = _get_or_create_session(db, case_id)

    # Store user message
    user_msg = ChatMessage(
        session_id=session.id,
        sender_type="user",
        content=request.message,
    )
    db.add(user_msg)

    # Generate AI response (simulated)
    ai_data = _simulate_ai_response(request.message)

    ai_msg = ChatMessage(
        session_id=session.id,
        sender_type="assistant",
        content=ai_data["content"],
        citations_json=json.dumps(ai_data["citations"]),
    )
    db.add(ai_msg)
    db.commit()
    db.refresh(ai_msg)

    return _msg_to_response(ai_msg)
