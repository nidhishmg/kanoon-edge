from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import json
from datetime import datetime, timezone, timedelta
import logging

from app.database import get_db
from app.models import User, Case, Document, AnalysisResult, TimelineEvent, CaseNote
from app.schemas.analysis import AnalysisResultResponse
from app.utils.auth import get_current_user
from app.utils.llm import analyze_case_documents, generate_research_brief_text

router = APIRouter()
logger = logging.getLogger(__name__)


def _result_to_response(r: AnalysisResult) -> AnalysisResultResponse:
    return AnalysisResultResponse(
        id=r.id,
        type=r.result_type,
        severity=r.severity,
        title=r.title,
        description=r.description or "",
        legalBasis=r.legal_basis or "",
        guidance=r.guidance or "",
        documentRef=r.document_ref or "",
        page=r.page or 0,
        source=r.source or "document",
    )


def _upsert_auto_research_note(
    db: Session,
    *,
    case: Case,
    user_id: str,
    findings: List[AnalysisResult],
) -> None:
    """Create or refresh one auto-generated research note with a 24h cool-down."""
    now = datetime.now(timezone.utc)
    existing = (
        db.query(CaseNote)
        .filter(
            CaseNote.case_id == case.id,
            CaseNote.note_type == "research",
            CaseNote.title == "Auto Research Brief",
        )
        .order_by(CaseNote.updated_at.desc())
        .first()
    )

    if existing and existing.updated_at:
        last_update = existing.updated_at
        if last_update.tzinfo is None:
            last_update = last_update.replace(tzinfo=timezone.utc)
        if now - last_update < timedelta(hours=24):
            return

    findings_payload = [
        {
            "type": item.result_type,
            "severity": item.severity,
            "title": item.title,
            "description": item.description,
            "legal_basis": item.legal_basis,
            "guidance": item.guidance,
        }
        for item in findings
    ]

    sections = []
    if case.applicable_sections:
        try:
            sections = json.loads(case.applicable_sections)
        except (json.JSONDecodeError, TypeError):
            sections = []

    brief = generate_research_brief_text(
        case_type=case.case_type or "",
        stage=case.stage or "",
        client_name=case.client_name or "",
        sections=sections,
        findings=findings_payload,
    )
    if not brief:
        return

    if existing:
        existing.content = brief
        existing.is_private = False
    else:
        note = CaseNote(
            case_id=case.id,
            user_id=user_id,
            title="Auto Research Brief",
            content=brief,
            note_type="research",
            is_private=False,
        )
        db.add(note)


@router.get("/{case_id}", response_model=List[AnalysisResultResponse])
async def get_analysis(
    case_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    case = db.query(Case).filter(Case.id == case_id, Case.user_id == current_user.id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")
    results = db.query(AnalysisResult).filter(AnalysisResult.case_id == case_id).all()
    return [_result_to_response(r) for r in results]


@router.post("/{case_id}/run", response_model=List[AnalysisResultResponse])
async def run_analysis(
    case_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    case = db.query(Case).filter(Case.id == case_id, Case.user_id == current_user.id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    # Gather document texts
    docs = db.query(Document).filter(Document.case_id == case_id).all()
    doc_texts = []
    for doc in docs:
        if doc.text_content:
            doc_texts.append({"name": doc.name, "text": doc.text_content})

    applicable_sections = []
    if case.applicable_sections:
        try:
            applicable_sections = json.loads(case.applicable_sections)
        except (json.JSONDecodeError, TypeError):
            pass

    # Run AI analysis (with fallback)
    findings = analyze_case_documents(
        case_title=case.title or "",
        case_type=case.case_type or "",
        court=case.court or "",
        document_texts=doc_texts,
        applicable_sections=applicable_sections,
    )

    # Clear previous AI-generated results but preserve intake loopholes
    db.query(AnalysisResult).filter(
        AnalysisResult.case_id == case_id,
        AnalysisResult.source != "intake",
    ).delete()

    # Insert findings
    created = []
    for data in findings:
        ar = AnalysisResult(
            case_id=case_id,
            result_type=data.get("result_type", "gap"),
            severity=data.get("severity", "medium"),
            title=data.get("title", ""),
            description=data.get("description", ""),
            legal_basis=data.get("legal_basis", ""),
            guidance=data.get("guidance", ""),
            document_ref=data.get("document_ref", ""),
            page=data.get("page", 0),
            source="document",
        )
        db.add(ar)
        created.append(ar)

    # Auto timeline event
    event = TimelineEvent(
        case_id=case_id,
        event_type="analysis",
        title=f"AI Analysis completed — {len(created)} findings",
        description=f"Found {sum(1 for f in findings if f.get('severity') == 'high')} high severity issues",
        event_date=datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        auto_generated=True,
    )
    db.add(event)

    # Priority 5: generate a single auto-research note from saved findings.
    try:
        _upsert_auto_research_note(
            db,
            case=case,
            user_id=current_user.id,
            findings=created,
        )
    except Exception as exc:
        logger.error("Auto research brief generation failed for case %s: %s", case_id, exc)

    db.commit()
    for ar in created:
        db.refresh(ar)

    return [_result_to_response(r) for r in created]
