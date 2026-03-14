from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timezone, timedelta

from app.database import get_db
from app.models import User, Case, Deadline
from app.schemas.deadlines import DeadlineCreate, DeadlineUpdate, DeadlineResponse
from app.utils.auth import get_current_user

router = APIRouter()


def _to_response(d: Deadline) -> DeadlineResponse:
    return DeadlineResponse(
        id=d.id,
        title=d.title,
        description=d.description,
        deadlineType=d.deadline_type,
        dueDate=d.due_date,
        reminderDate=d.reminder_date,
        priority=d.priority or "medium",
        status=d.status or "pending",
        courtRule=d.court_rule,
        jurisdiction=d.jurisdiction,
        extensionDate=d.extension_date,
        extensionReason=d.extension_reason,
        completedAt=d.completed_at.strftime("%Y-%m-%dT%H:%M:%S") if d.completed_at else None,
        assignee=d.assignee,
        notes=d.notes,
        createdAt=d.created_at.strftime("%Y-%m-%dT%H:%M:%S") if d.created_at else "",
        updatedAt=d.updated_at.strftime("%Y-%m-%dT%H:%M:%S") if d.updated_at else "",
    )


def _verify_case(db: Session, case_id: str, user_id: str) -> Case:
    case = db.query(Case).filter(Case.id == case_id, Case.user_id == user_id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")
    return case


@router.get("/{case_id}", response_model=List[DeadlineResponse])
async def list_deadlines(
    case_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_case(db, case_id, current_user.id)
    items = db.query(Deadline).filter(Deadline.case_id == case_id).order_by(Deadline.due_date.asc()).all()
    return [_to_response(d) for d in items]


@router.post("/{case_id}", response_model=DeadlineResponse, status_code=status.HTTP_201_CREATED)
async def create_deadline(
    case_id: str,
    data: DeadlineCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_case(db, case_id, current_user.id)
    item = Deadline(
        case_id=case_id,
        user_id=current_user.id,
        title=data.title,
        description=data.description,
        deadline_type=data.deadline_type,
        due_date=data.due_date,
        reminder_date=data.reminder_date,
        priority=data.priority,
        court_rule=data.court_rule,
        jurisdiction=data.jurisdiction,
        assignee=data.assignee,
        notes=data.notes,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return _to_response(item)


@router.post("/{case_id}/recalculate")
async def recalculate_deadlines(
    case_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_case(db, case_id, current_user.id)
    items = db.query(Deadline).filter(Deadline.case_id == case_id).all()
    today = datetime.now(timezone.utc).date()

    updated = 0
    for item in items:
        if not item.due_date:
            continue

        try:
            due_date = datetime.strptime(item.due_date, "%Y-%m-%d").date()
        except ValueError:
            continue

        if item.status != "completed":
            new_status = "missed" if due_date < today else "pending"
            if item.status != new_status:
                item.status = new_status
                updated += 1

        if not item.reminder_date:
            reminder_date = due_date - timedelta(days=3)
            if reminder_date < today:
                reminder_date = today
            item.reminder_date = reminder_date.isoformat()
            updated += 1

    if updated:
        db.commit()

    return {"status": "ok", "updated": updated, "count": len(items)}


@router.put("/{deadline_id}", response_model=DeadlineResponse)
async def update_deadline(
    deadline_id: str,
    data: DeadlineUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = db.query(Deadline).filter(Deadline.id == deadline_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deadline not found")
    _verify_case(db, item.case_id, current_user.id)
    update_data = data.model_dump(exclude_unset=True)
    if update_data.get("status") == "completed" and item.status != "completed":
        item.completed_at = datetime.now(timezone.utc)
    for field, value in update_data.items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return _to_response(item)


@router.delete("/{deadline_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_deadline(
    deadline_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = db.query(Deadline).filter(Deadline.id == deadline_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deadline not found")
    _verify_case(db, item.case_id, current_user.id)
    db.delete(item)
    db.commit()
