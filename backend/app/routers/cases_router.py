from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import User, Case, Party
from app.schemas.cases import CaseCreate, CaseRoomResponse, PartyCreate, PartyResponse
from app.utils.auth import get_current_user

router = APIRouter()


def _case_to_response(case: Case) -> CaseRoomResponse:
    doc_count = len(case.documents) if case.documents else 0
    loopholes = len([r for r in (case.analysis_results or []) if r.result_type == "loophole"])
    parties = [PartyResponse(id=p.id, name=p.name, role=p.role, notes=p.notes) for p in (case.parties or [])]
    return CaseRoomResponse(
        id=case.id,
        title=case.title,
        caseNumber=case.case_number or "",
        court=case.court or "",
        caseType=case.case_type or "",
        stage=case.stage or "",
        documentCount=doc_count,
        loopholesDetected=loopholes,
        nextHearing=case.next_hearing or "",
        strength=case.strength or 0,
        status=case.status or "active",
        createdAt=case.created_at.strftime("%Y-%m-%d") if case.created_at else "",
        parties=parties,
        venue=case.venue or "",
    )


@router.get("/", response_model=List[CaseRoomResponse])
async def list_cases(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all case rooms for the authenticated user."""
    cases = db.query(Case).filter(Case.user_id == current_user.id).order_by(Case.created_at.desc()).all()
    return [_case_to_response(c) for c in cases]


@router.get("/{case_id}", response_model=CaseRoomResponse)
async def get_case(
    case_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a single case room by ID."""
    case = db.query(Case).filter(Case.id == case_id, Case.user_id == current_user.id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")
    return _case_to_response(case)


@router.post("/", response_model=CaseRoomResponse, status_code=status.HTTP_201_CREATED)
async def create_case(
    data: CaseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new case room."""
    case = Case(
        user_id=current_user.id,
        title=data.title,
        case_number=data.case_number,
        court=data.court,
        case_type=data.case_type,
        stage=data.stage,
        next_hearing=data.next_hearing,
        venue=data.venue,
    )
    db.add(case)
    db.flush()

    for p in data.parties:
        party = Party(case_id=case.id, name=p.name, role=p.role, notes=p.notes)
        db.add(party)

    db.commit()
    db.refresh(case)
    return _case_to_response(case)


@router.post("/{case_id}/parties", response_model=PartyResponse, status_code=status.HTTP_201_CREATED)
async def add_party(
    case_id: str,
    data: PartyCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add a party to a case."""
    case = db.query(Case).filter(Case.id == case_id, Case.user_id == current_user.id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    party = Party(case_id=case.id, name=data.name, role=data.role, notes=data.notes)
    db.add(party)
    db.commit()
    db.refresh(party)
    return PartyResponse(id=party.id, name=party.name, role=party.role, notes=party.notes)


@router.get("/{case_id}/parties", response_model=List[PartyResponse])
async def list_parties(
    case_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all parties for a case."""
    case = db.query(Case).filter(Case.id == case_id, Case.user_id == current_user.id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")
    return [PartyResponse(id=p.id, name=p.name, role=p.role, notes=p.notes) for p in case.parties]
