from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import User, Case, Communication
from app.schemas.communications import CommunicationCreate, CommunicationUpdate, CommunicationResponse
from app.utils.auth import get_current_user

router = APIRouter()


def _to_response(c: Communication) -> CommunicationResponse:
    return CommunicationResponse(
        id=c.id,
        commType=c.comm_type,
        direction=c.direction or "outgoing",
        subject=c.subject,
        contactName=c.contact_name,
        contactRole=c.contact_role,
        commDate=c.comm_date,
        summary=c.summary,
        followUpDate=c.follow_up_date,
        followUpDone=c.follow_up_done or False,
        linkedDocumentId=c.linked_document_id,
        isPrivileged=c.is_privileged or False,
        notes=c.notes,
        createdAt=c.created_at.strftime("%Y-%m-%dT%H:%M:%S") if c.created_at else "",
    )


def _verify_case(db: Session, case_id: str, user_id: str) -> Case:
    case = db.query(Case).filter(Case.id == case_id, Case.user_id == user_id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")
    return case


@router.get("/{case_id}", response_model=List[CommunicationResponse])
async def list_communications(
    case_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_case(db, case_id, current_user.id)
    items = db.query(Communication).filter(
        Communication.case_id == case_id
    ).order_by(Communication.comm_date.desc()).all()
    return [_to_response(c) for c in items]


@router.post("/{case_id}", response_model=CommunicationResponse, status_code=status.HTTP_201_CREATED)
async def create_communication(
    case_id: str,
    data: CommunicationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_case(db, case_id, current_user.id)
    item = Communication(
        case_id=case_id,
        user_id=current_user.id,
        comm_type=data.comm_type,
        direction=data.direction,
        subject=data.subject,
        contact_name=data.contact_name,
        contact_role=data.contact_role,
        comm_date=data.comm_date,
        summary=data.summary,
        follow_up_date=data.follow_up_date,
        linked_document_id=data.linked_document_id,
        is_privileged=data.is_privileged,
        notes=data.notes,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return _to_response(item)


@router.put("/{comm_id}", response_model=CommunicationResponse)
async def update_communication(
    comm_id: str,
    data: CommunicationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = db.query(Communication).filter(Communication.id == comm_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Communication not found")
    _verify_case(db, item.case_id, current_user.id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return _to_response(item)


@router.delete("/{comm_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_communication(
    comm_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = db.query(Communication).filter(Communication.id == comm_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Communication not found")
    _verify_case(db, item.case_id, current_user.id)
    db.delete(item)
    db.commit()
