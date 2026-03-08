from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import User, Case, TimeEntry, Expense
from app.schemas.time_tracking import (
    TimeEntryCreate, TimeEntryUpdate, TimeEntryResponse,
    ExpenseCreate, ExpenseUpdate, ExpenseResponse,
)
from app.utils.auth import get_current_user

router = APIRouter()


# ── Time Entry helpers ───────────────────────────────────────

def _time_entry_response(t: TimeEntry) -> TimeEntryResponse:
    return TimeEntryResponse(
        id=t.id,
        caseId=t.case_id,
        description=t.description,
        activityType=t.activity_type,
        date=t.date,
        hours=t.hours,
        rate=t.rate or 0.0,
        amount=t.amount or (t.hours * (t.rate or 0.0)),
        isBillable=t.is_billable if t.is_billable is not None else True,
        isBilled=t.is_billed or False,
        status=t.status or "draft",
        notes=t.notes,
        createdAt=t.created_at.strftime("%Y-%m-%dT%H:%M:%S") if t.created_at else "",
        updatedAt=t.updated_at.strftime("%Y-%m-%dT%H:%M:%S") if t.updated_at else "",
    )


def _expense_response(e: Expense) -> ExpenseResponse:
    return ExpenseResponse(
        id=e.id,
        caseId=e.case_id,
        description=e.description,
        expenseType=e.expense_type,
        amount=e.amount,
        date=e.date,
        vendor=e.vendor,
        isBillable=e.is_billable if e.is_billable is not None else True,
        isReimbursed=e.is_reimbursed or False,
        status=e.status or "pending",
        notes=e.notes,
        createdAt=e.created_at.strftime("%Y-%m-%dT%H:%M:%S") if e.created_at else "",
        updatedAt=e.updated_at.strftime("%Y-%m-%dT%H:%M:%S") if e.updated_at else "",
    )


def _verify_case(db: Session, case_id: str, user_id: str) -> Case:
    case = db.query(Case).filter(Case.id == case_id, Case.user_id == user_id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")
    return case


# ── Time Entries ─────────────────────────────────────────────

@router.get("/time/{case_id}", response_model=List[TimeEntryResponse])
async def list_time_entries(
    case_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_case(db, case_id, current_user.id)
    items = db.query(TimeEntry).filter(TimeEntry.case_id == case_id).order_by(TimeEntry.date.desc()).all()
    return [_time_entry_response(t) for t in items]


@router.post("/time/{case_id}", response_model=TimeEntryResponse, status_code=status.HTTP_201_CREATED)
async def create_time_entry(
    case_id: str,
    data: TimeEntryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_case(db, case_id, current_user.id)
    item = TimeEntry(
        case_id=case_id,
        user_id=current_user.id,
        description=data.description,
        activity_type=data.activity_type,
        date=data.date,
        hours=data.hours,
        rate=data.rate or 0.0,
        amount=data.hours * (data.rate or 0.0),
        is_billable=data.is_billable,
        notes=data.notes,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return _time_entry_response(item)


@router.put("/time/{entry_id}", response_model=TimeEntryResponse)
async def update_time_entry(
    entry_id: str,
    data: TimeEntryUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = db.query(TimeEntry).filter(TimeEntry.id == entry_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Time entry not found")
    _verify_case(db, item.case_id, current_user.id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    item.amount = item.hours * (item.rate or 0.0)
    db.commit()
    db.refresh(item)
    return _time_entry_response(item)


@router.delete("/time/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_time_entry(
    entry_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = db.query(TimeEntry).filter(TimeEntry.id == entry_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Time entry not found")
    _verify_case(db, item.case_id, current_user.id)
    db.delete(item)
    db.commit()


# ── Expenses ─────────────────────────────────────────────────

@router.get("/expenses/{case_id}", response_model=List[ExpenseResponse])
async def list_expenses(
    case_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_case(db, case_id, current_user.id)
    items = db.query(Expense).filter(Expense.case_id == case_id).order_by(Expense.date.desc()).all()
    return [_expense_response(e) for e in items]


@router.post("/expenses/{case_id}", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
async def create_expense(
    case_id: str,
    data: ExpenseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_case(db, case_id, current_user.id)
    item = Expense(
        case_id=case_id,
        user_id=current_user.id,
        description=data.description,
        expense_type=data.expense_type,
        amount=data.amount,
        date=data.date,
        vendor=data.vendor,
        is_billable=data.is_billable,
        notes=data.notes,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return _expense_response(item)


@router.put("/expenses/{expense_id}", response_model=ExpenseResponse)
async def update_expense(
    expense_id: str,
    data: ExpenseUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = db.query(Expense).filter(Expense.id == expense_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")
    _verify_case(db, item.case_id, current_user.id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return _expense_response(item)


@router.delete("/expenses/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_expense(
    expense_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = db.query(Expense).filter(Expense.id == expense_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")
    _verify_case(db, item.case_id, current_user.id)
    db.delete(item)
    db.commit()
