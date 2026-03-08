from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import User, Case, Hearing, TimelineEvent
from app.schemas.hearings import HearingCreate, HearingUpdate, HearingResponse
from app.utils.auth import get_current_user

router = APIRouter()


def _hearing_to_response(h: Hearing) -> HearingResponse:
    return HearingResponse(
        id=h.id,
        caseId=h.case_id,
        hearingDate=h.hearing_date,
        hearingType=h.hearing_type or "",
        judgeName=h.judge_name or "",
        courtNumber=h.court_number or "",
        outcome=h.outcome or "",
        nextDate=h.next_date,
        notes=h.notes or "",
        adjourned=h.adjourned or False,
        adjournmentReason=h.adjournment_reason or "",
        orderText=h.order_text or "",
        orderDocumentId=h.order_document_id,
        createdAt=h.created_at.strftime("%Y-%m-%dT%H:%M:%S") if h.created_at else "",
    )


def _auto_timeline_hearing(db: Session, case_id: str, hearing: Hearing, action: str):
    title = f"Hearing {action}: {hearing.hearing_type or 'General'}"
    desc = f"Date: {hearing.hearing_date}"
    if hearing.outcome:
        desc += f" | Outcome: {hearing.outcome}"
    event = TimelineEvent(
        case_id=case_id,
        event_type="hearing",
        title=title,
        description=desc,
        event_date=hearing.hearing_date,
        status="completed" if action == "recorded" else "upcoming",
        auto_generated=True,
        linked_hearing_id=hearing.id,
    )
    db.add(event)


@router.get("/{case_id}", response_model=List[HearingResponse])
async def list_hearings(
    case_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    case = db.query(Case).filter(Case.id == case_id, Case.user_id == current_user.id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")
    hearings = db.query(Hearing).filter(Hearing.case_id == case_id).order_by(Hearing.hearing_date.desc()).all()
    return [_hearing_to_response(h) for h in hearings]


@router.post("/{case_id}", response_model=HearingResponse, status_code=status.HTTP_201_CREATED)
async def add_hearing(
    case_id: str,
    data: HearingCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    case = db.query(Case).filter(Case.id == case_id, Case.user_id == current_user.id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")
    hearing = Hearing(
        case_id=case_id,
        hearing_date=data.hearing_date,
        hearing_type=data.hearing_type,
        judge_name=data.judge_name,
        court_number=data.court_number,
        outcome=data.outcome,
        next_date=data.next_date,
        notes=data.notes,
        adjourned=data.adjourned or False,
        adjournment_reason=data.adjournment_reason,
        order_text=data.order_text,
    )
    db.add(hearing)
    db.flush()
    # Update case next_hearing
    if data.next_date:
        case.next_hearing = data.next_date
    _auto_timeline_hearing(db, case_id, hearing, "recorded")
    db.commit()
    db.refresh(hearing)
    return _hearing_to_response(hearing)


@router.put("/{hearing_id}", response_model=HearingResponse)
async def update_hearing(
    hearing_id: str,
    data: HearingUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    hearing = db.query(Hearing).filter(Hearing.id == hearing_id).first()
    if not hearing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hearing not found")
    case = db.query(Case).filter(Case.id == hearing.case_id, Case.user_id == current_user.id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    for field in ["hearing_date", "hearing_type", "judge_name", "court_number", "outcome", "next_date", "notes", "adjourned", "adjournment_reason", "order_text"]:
        val = getattr(data, field, None)
        if val is not None:
            setattr(hearing, field, val)
    if data.next_date:
        case.next_hearing = data.next_date
    db.commit()
    db.refresh(hearing)
    return _hearing_to_response(hearing)


@router.delete("/{hearing_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_hearing(
    hearing_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    hearing = db.query(Hearing).filter(Hearing.id == hearing_id).first()
    if not hearing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hearing not found")
    case = db.query(Case).filter(Case.id == hearing.case_id, Case.user_id == current_user.id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    db.delete(hearing)
    db.commit()
