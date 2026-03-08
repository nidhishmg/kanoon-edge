from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import json

from app.database import get_db
from app.models import User, Case, Document, AnalysisResult, TimelineEvent
from app.schemas.analysis import AnalysisResultResponse
from app.utils.auth import get_current_user
from app.utils.llm import analyze_case_documents

router = APIRouter()


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
    )


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

    # Clear previous results
    db.query(AnalysisResult).filter(AnalysisResult.case_id == case_id).delete()

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
        )
        db.add(ar)
        created.append(ar)

    # Auto timeline event
    from datetime import datetime, timezone
    event = TimelineEvent(
        case_id=case_id,
        event_type="analysis",
        title=f"AI Analysis completed — {len(created)} findings",
        description=f"Found {sum(1 for f in findings if f.get('severity') == 'high')} high severity issues",
        event_date=datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        auto_generated=True,
    )
    db.add(event)

    db.commit()
    for ar in created:
        db.refresh(ar)

    return [_result_to_response(r) for r in created]
