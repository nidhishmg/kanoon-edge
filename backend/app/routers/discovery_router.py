from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import User, Case, DiscoveryRequest
from app.schemas.discovery import DiscoveryRequestCreate, DiscoveryRequestUpdate, DiscoveryRequestResponse
from app.utils.auth import get_current_user

router = APIRouter()


def _to_response(d: DiscoveryRequest) -> DiscoveryRequestResponse:
    return DiscoveryRequestResponse(
        id=d.id,
        title=d.title,
        discoveryType=d.discovery_type,
        direction=d.direction or "outgoing",
        servedTo=d.served_to,
        servedDate=d.served_date,
        dueDate=d.due_date,
        responseDate=d.response_date,
        status=d.status or "draft",
        itemsJson=d.items_json,
        responseSummary=d.response_summary,
        objections=d.objections,
        notes=d.notes,
        createdAt=d.created_at.strftime("%Y-%m-%dT%H:%M:%S") if d.created_at else "",
        updatedAt=d.updated_at.strftime("%Y-%m-%dT%H:%M:%S") if d.updated_at else "",
    )


def _verify_case(db: Session, case_id: str, user_id: str) -> Case:
    case = db.query(Case).filter(Case.id == case_id, Case.user_id == user_id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")
    return case


@router.get("/{case_id}", response_model=List[DiscoveryRequestResponse])
async def list_discovery(
    case_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_case(db, case_id, current_user.id)
    items = db.query(DiscoveryRequest).filter(
        DiscoveryRequest.case_id == case_id
    ).order_by(DiscoveryRequest.created_at.desc()).all()
    return [_to_response(d) for d in items]


@router.post("/{case_id}", response_model=DiscoveryRequestResponse, status_code=status.HTTP_201_CREATED)
async def create_discovery(
    case_id: str,
    data: DiscoveryRequestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_case(db, case_id, current_user.id)
    item = DiscoveryRequest(
        case_id=case_id,
        user_id=current_user.id,
        title=data.title,
        discovery_type=data.discovery_type,
        direction=data.direction,
        served_to=data.served_to,
        served_date=data.served_date,
        due_date=data.due_date,
        items_json=data.items_json,
        notes=data.notes,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return _to_response(item)


@router.put("/{discovery_id}", response_model=DiscoveryRequestResponse)
async def update_discovery(
    discovery_id: str,
    data: DiscoveryRequestUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = db.query(DiscoveryRequest).filter(DiscoveryRequest.id == discovery_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Discovery request not found")
    _verify_case(db, item.case_id, current_user.id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return _to_response(item)


@router.delete("/{discovery_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_discovery(
    discovery_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = db.query(DiscoveryRequest).filter(DiscoveryRequest.id == discovery_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Discovery request not found")
    _verify_case(db, item.case_id, current_user.id)
    db.delete(item)
    db.commit()
