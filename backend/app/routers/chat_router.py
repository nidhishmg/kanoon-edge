import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import User, Case, ChatSession, ChatMessage, Document, DocumentChunk
from app.schemas.chat import ChatRequest, ChatMessageResponse, Citation
from app.utils.auth import get_current_user
from app.utils.llm import chat_with_context

router = APIRouter()

SUGGESTED_QUESTIONS = [
    "What are the key contradictions in this case?",
    "Summarize the prosecution's argument",
    "What is the strongest defence argument?",
    "Are there any procedural violations?",
    "What precedents apply to this case?",
]


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

    # Gather document chunks for RAG context
    docs = db.query(Document).filter(Document.case_id == case_id).all()
    document_chunks = []
    for doc in docs:
        chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id == doc.id).all()
        for chunk in chunks[:5]:  # Limit chunks per doc
            document_chunks.append(f"[{doc.name}] {chunk.content}")
        # If no chunks, use text_content directly
        if not chunks and doc.text_content:
            document_chunks.append(f"[{doc.name}] {doc.text_content[:2000]}")

    # Get chat history
    prev_messages = db.query(ChatMessage).filter(
        ChatMessage.session_id == session.id
    ).order_by(ChatMessage.timestamp).all()
    chat_history = [{"role": m.sender_type, "content": m.content} for m in prev_messages]

    # Generate AI response (RAG with fallback)
    ai_data = chat_with_context(
        message=request.message,
        case_title=case.title or "",
        document_chunks=document_chunks,
        chat_history=chat_history,
    )

    ai_msg = ChatMessage(
        session_id=session.id,
        sender_type="assistant",
        content=ai_data["content"],
        citations_json=json.dumps(ai_data["citations"]) if ai_data["citations"] else None,
    )
    db.add(ai_msg)
    db.commit()
    db.refresh(ai_msg)

    return _msg_to_response(ai_msg)
