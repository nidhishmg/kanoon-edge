from datetime import datetime
import json

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import User, Case, Draft, Document, AnalysisResult
from app.schemas.draft import DraftRequest, DraftResponse, DraftTemplateResponse
from app.utils.auth import get_current_user
from app.utils.llm import generate_legal_draft

router = APIRouter()

TEMPLATES = [
    DraftTemplateResponse(id="bail-application", name="Bail Application", description="Regular bail application under Section 439 CrPC", category="Criminal", icon="FileText"),
    DraftTemplateResponse(id="anticipatory-bail", name="Anticipatory Bail", description="Application for anticipatory bail under Section 438 CrPC", category="Criminal", icon="FileEdit"),
    DraftTemplateResponse(id="written-arguments", name="Written Arguments", description="Written arguments for submission during trial", category="Litigation", icon="Scale"),
    DraftTemplateResponse(id="legal-notice", name="Legal Notice", description="Formal legal notice under Section 80 CPC", category="Civil", icon="Mail"),
    DraftTemplateResponse(id="affidavit", name="Affidavit", description="Sworn affidavit for court submission", category="General", icon="UserCheck"),
    DraftTemplateResponse(id="petition", name="Writ Petition", description="Petition under Article 226/227 of the Constitution", category="Constitutional", icon="Scale"),
]


@router.get("/templates", response_model=List[DraftTemplateResponse])
async def get_templates():
    return TEMPLATES


@router.post("/generate", response_model=DraftResponse)
async def generate_draft(
    request: DraftRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    case = db.query(Case).filter(Case.id == request.case_id, Case.user_id == current_user.id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    # Gather document context
    docs = db.query(Document).filter(Document.case_id == case.id).all()
    doc_context = ""
    for doc in docs[:3]:
        if doc.text_content:
            doc_context += f"\n--- {doc.name} ---\n{doc.text_content[:1500]}\n"

    applicable_sections = []
    if case.applicable_sections:
        try:
            applicable_sections = json.loads(case.applicable_sections)
        except (json.JSONDecodeError, TypeError):
            pass

    confirmed_fields = request.confirmed_fields or {}
    selected_loophole_ids = set(request.selected_loophole_ids or [])
    selected_results = []
    if selected_loophole_ids:
        selected_results = db.query(AnalysisResult).filter(
            AnalysisResult.case_id == case.id,
            AnalysisResult.id.in_(list(selected_loophole_ids)),
        ).all()

    selected_grounds = [
        {
            "id": item.id,
            "title": item.title,
            "description": item.description,
            "guidance": item.guidance,
        }
        for item in selected_results
    ]

    content = generate_legal_draft(
        template_id=request.template_id,
        case_title=confirmed_fields.get("case_title") or case.title or "",
        case_number=confirmed_fields.get("case_number") or case.case_number or "",
        court=confirmed_fields.get("court") or case.court or "",
        case_type=confirmed_fields.get("case_type") or case.case_type or "",
        document_context=doc_context,
        applicable_sections=confirmed_fields.get("applicable_sections") or applicable_sections,
        client_name=confirmed_fields.get("client_name") or case.client_name or "",
        opposing_counsel=confirmed_fields.get("opposing_counsel") or case.opposing_counsel or "",
        confirmed_fields=confirmed_fields,
        selected_grounds=selected_grounds,
    )

    template_names = {t.id: t.name for t in TEMPLATES}
    draft = Draft(
        case_id=case.id,
        draft_type=request.template_id,
        title=template_names.get(request.template_id, request.template_id),
        content=content,
    )
    db.add(draft)
    db.commit()
    db.refresh(draft)

    return DraftResponse(
        id=draft.id,
        template_id=request.template_id,
        content=draft.content,
        status="generated",
    )


@router.get("/{case_id}", response_model=List[DraftResponse])
async def list_drafts(
    case_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all drafts for a case."""
    case = db.query(Case).filter(Case.id == case_id, Case.user_id == current_user.id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")
    drafts = db.query(Draft).filter(Draft.case_id == case_id).order_by(Draft.created_at.desc()).all()
    return [DraftResponse(id=d.id, template_id=d.draft_type, content=d.content, status="generated") for d in drafts]
