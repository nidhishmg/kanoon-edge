from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import User, Case, LegalResearch
from app.schemas.research import LegalResearchCreate, LegalResearchUpdate, LegalResearchResponse
from app.utils.auth import get_current_user

router = APIRouter()


def _to_response(r: LegalResearch) -> LegalResearchResponse:
    return LegalResearchResponse(
        id=r.id,
        title=r.title,
        researchType=r.research_type,
        query=r.query,
        summary=r.summary,
        citation=r.citation,
        courtName=r.court_name,
        decisionDate=r.decision_date,
        relevance=r.relevance or "medium",
        status=r.status or "found",
        keyPoints=r.key_points,
        isFavorable=r.is_favorable,
        notes=r.notes,
        createdAt=r.created_at.strftime("%Y-%m-%dT%H:%M:%S") if r.created_at else "",
        updatedAt=r.updated_at.strftime("%Y-%m-%dT%H:%M:%S") if r.updated_at else "",
    )


def _verify_case(db: Session, case_id: str, user_id: str) -> Case:
    case = db.query(Case).filter(Case.id == case_id, Case.user_id == user_id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")
    return case


@router.get("/{case_id}", response_model=List[LegalResearchResponse])
async def list_research(
    case_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_case(db, case_id, current_user.id)
    items = db.query(LegalResearch).filter(
        LegalResearch.case_id == case_id
    ).order_by(LegalResearch.created_at.desc()).all()
    return [_to_response(r) for r in items]


@router.post("/{case_id}", response_model=LegalResearchResponse, status_code=status.HTTP_201_CREATED)
async def create_research(
    case_id: str,
    data: LegalResearchCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_case(db, case_id, current_user.id)
    item = LegalResearch(
        case_id=case_id,
        user_id=current_user.id,
        title=data.title,
        research_type=data.research_type,
        query=data.query,
        summary=data.summary,
        citation=data.citation,
        court_name=data.court_name,
        decision_date=data.decision_date,
        relevance=data.relevance,
        key_points=data.key_points,
        is_favorable=data.is_favorable,
        notes=data.notes,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return _to_response(item)


@router.put("/{research_id}", response_model=LegalResearchResponse)
async def update_research(
    research_id: str,
    data: LegalResearchUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = db.query(LegalResearch).filter(LegalResearch.id == research_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Research not found")
    _verify_case(db, item.case_id, current_user.id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return _to_response(item)


@router.delete("/{research_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_research(
    research_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = db.query(LegalResearch).filter(LegalResearch.id == research_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Research not found")
    _verify_case(db, item.case_id, current_user.id)
    db.delete(item)
    db.commit()
