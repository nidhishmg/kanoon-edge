import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import User, Case, ChatSession, ChatMessage, Document, DocumentChunk, AnalysisResult, Hearing, Task
from app.schemas.chat import ChatRequest, ChatMessageResponse, Citation
from app.utils.auth import get_current_user
from app.utils.llm import chat_with_context
from app.utils.sections_db import classify_sections
from app.utils.strength import calculate_dates

router = APIRouter()


def _build_case_context(case: Case, db: Session) -> str:
    """Build comprehensive context string from all case data."""
    parts = [f"Case: {case.title}"]
    if case.case_number:
        parts.append(f"Case Number: {case.case_number}")
    if case.case_type:
        parts.append(f"Type: {case.case_type}")
    if case.stage:
        parts.append(f"Stage: {case.stage}")
    if case.court:
        parts.append(f"Court: {case.court}")
    if case.court_level:
        parts.append(f"Court Level: {case.court_level}")
    if case.lawyer_side:
        parts.append(f"Lawyer represents: {case.lawyer_side}")

    # Dates
    dates_info = []
    if case.incident_date:
        dates_info.append(f"Incident: {case.incident_date}")
    if case.fir_date:
        dates_info.append(f"FIR Filed: {case.fir_date}")
    if case.arrest_date:
        dates_info.append(f"Arrest: {case.arrest_date}")
    if case.in_custody:
        dates_info.append(f"Currently in custody since {case.custody_start_date or 'unknown date'}")
    if case.charge_sheet_date:
        dates_info.append(f"Charge Sheet: {case.charge_sheet_date}")
    if case.next_hearing:
        dates_info.append(f"Next Hearing: {case.next_hearing} ({case.hearing_purpose or 'purpose not specified'})")
    if dates_info:
        parts.append("Key Dates: " + "; ".join(dates_info))

    # Calculated dates
    calc = calculate_dates(case)
    calc_info = []
    if calc.get("firDelayDays") is not None:
        calc_info.append(f"FIR delay: {calc['firDelayDays']} days after incident")
    if calc.get("custodyDays") is not None:
        calc_info.append(f"In custody for {calc['custodyDays']} days")
    if calc.get("chargeSheetDeadlineDays") is not None:
        calc_info.append(f"Charge sheet deadline: {calc['chargeSheetDeadlineDays']} days remaining")
    if calc.get("daysToNextHearing") is not None:
        calc_info.append(f"Days to next hearing: {calc['daysToNextHearing']}")
    if calc_info:
        parts.append("Date Analysis: " + "; ".join(calc_info))

    # Sections
    if case.applicable_sections:
        try:
            sections = json.loads(case.applicable_sections)
            if sections:
                classified = classify_sections(sections)
                sec_strs = []
                for s in classified:
                    sec_strs.append(f"{s['raw']} ({s.get('title', 'Unknown')}) - Max: {s.get('max_punishment', 'N/A')}, Bailable: {s.get('bailable', 'N/A')}")
                parts.append("Sections: " + "; ".join(sec_strs))
        except (json.JSONDecodeError, TypeError):
            pass

    # Procedural checklist
    checklist = []
    if case.checklist_41a_notice:
        checklist.append(f"41A Notice served: {case.checklist_41a_notice}")
    if case.checklist_grounds_of_arrest:
        checklist.append(f"Grounds of arrest communicated: {case.checklist_grounds_of_arrest}")
    if case.checklist_magistrate_24hrs:
        checklist.append(f"Produced before magistrate within 24hrs: {case.checklist_magistrate_24hrs}")
    if case.checklist_remand_case_diary:
        checklist.append(f"Case diary shown at remand: {case.checklist_remand_case_diary}")
    if case.checklist_independent_witness:
        checklist.append(f"Independent witness in panchnama: {case.checklist_independent_witness}")
    if checklist:
        parts.append("Procedural Checklist: " + "; ".join(checklist))

    # Parties
    if case.parties:
        party_strs = [f"{p.name} ({p.role})" for p in case.parties]
        parts.append("Parties: " + ", ".join(party_strs))

    # Analysis results (loopholes and findings)
    results = db.query(AnalysisResult).filter(AnalysisResult.case_id == case.id).all()
    if results:
        findings = []
        for r in results:
            findings.append(f"[{r.source or 'document'}] {r.result_type}/{r.severity}: {r.title} - {r.description or ''}")
        parts.append("Analysis Findings:\n" + "\n".join(findings))

    # Hearings
    hearings = db.query(Hearing).filter(Hearing.case_id == case.id).order_by(Hearing.hearing_date.desc()).limit(5).all()
    if hearings:
        h_strs = [
            f"{h.hearing_date}: {h.hearing_type or 'Hearing'} - {(h.outcome or h.notes or 'Pending')}"
            for h in hearings
        ]
        parts.append("Recent Hearings: " + "; ".join(h_strs))

    # Tasks
    tasks = db.query(Task).filter(Task.case_id == case.id).all()
    if tasks:
        t_strs = [f"{t.title} (status: {t.status}, priority: {t.priority or 'normal'})" for t in tasks]
        parts.append("Tasks: " + "; ".join(t_strs))

    return "\n".join(parts)


def _generate_dynamic_questions(case: Case) -> List[str]:
    """Generate context-aware suggested questions based on case state."""
    questions = []

    if case.case_type and case.case_type.lower() in ("criminal", "bail"):
        if case.lawyer_side == "defence":
            questions.append("What are the strongest grounds for bail in this case?")
            questions.append("Can I apply for anticipatory bail based on current facts?")
        else:
            questions.append("What are the grounds to oppose bail?")

    if case.checklist_41a_notice == "no":
        questions.append("What is the legal consequence of not serving 41A notice?")

    calc = calculate_dates(case)
    if calc.get("firDelayDays") and calc["firDelayDays"] > 2:
        questions.append("How can FIR delay be used as a defence argument?")

    if calc.get("chargeSheetDeadlineDays") is not None and calc["chargeSheetDeadlineDays"] <= 0:
        questions.append("Is the accused entitled to default bail?")

    if calc.get("daysToNextHearing") is not None and calc["daysToNextHearing"] <= 3:
        questions.append("What should I prepare for the upcoming hearing?")

    # Always include some general ones
    questions.append("What are the key contradictions in this case?")
    questions.append("What precedents apply to this case?")

    return questions[:6]


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


@router.get("/{case_id}/suggested-questions")
async def get_case_suggested_questions(
    case_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    case = db.query(Case).filter(Case.id == case_id, Case.user_id == current_user.id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")
    return _generate_dynamic_questions(case)


@router.get("/suggested-questions")
async def get_suggested_questions():
    return [
        "What are the key contradictions in this case?",
        "Summarize the prosecution's argument",
        "What is the strongest defence argument?",
        "Are there any procedural violations?",
        "What precedents apply to this case?",
    ]


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

    # First chunk: full case context (structured data)
    try:
        case_context = _build_case_context(case, db)
    except Exception:
        case_context = f"Case: {case.title or ''}\nType: {case.case_type or ''}\nStage: {case.stage or ''}"
    document_chunks.append(f"[Case Data]\n{case_context}")

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
