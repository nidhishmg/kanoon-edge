from pydantic import BaseModel
from typing import Optional


class TimeEntryCreate(BaseModel):
    description: str
    activity_type: Optional[str] = None
    date: str
    hours: float
    rate: Optional[float] = 0.0
    is_billable: bool = True
    notes: Optional[str] = None


class TimeEntryUpdate(BaseModel):
    description: Optional[str] = None
    activity_type: Optional[str] = None
    date: Optional[str] = None
    hours: Optional[float] = None
    rate: Optional[float] = None
    is_billable: Optional[bool] = None
    is_billed: Optional[bool] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class TimeEntryResponse(BaseModel):
    id: str
    caseId: str
    description: str
    activityType: Optional[str] = None
    date: str
    hours: float
    rate: float = 0.0
    amount: float = 0.0
    isBillable: bool = True
    isBilled: bool = False
    status: str = "draft"
    notes: Optional[str] = None
    createdAt: str
    updatedAt: str


class ExpenseCreate(BaseModel):
    description: str
    expense_type: str = "other"
    amount: float
    date: str
    vendor: Optional[str] = None
    is_billable: bool = True
    notes: Optional[str] = None


class ExpenseUpdate(BaseModel):
    description: Optional[str] = None
    expense_type: Optional[str] = None
    amount: Optional[float] = None
    date: Optional[str] = None
    vendor: Optional[str] = None
    is_billable: Optional[bool] = None
    is_reimbursed: Optional[bool] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class ExpenseResponse(BaseModel):
    id: str
    caseId: str
    description: str
    expenseType: str
    amount: float
    date: str
    vendor: Optional[str] = None
    isBillable: bool = True
    isReimbursed: bool = False
    status: str = "pending"
    notes: Optional[str] = None
    createdAt: str
    updatedAt: str
