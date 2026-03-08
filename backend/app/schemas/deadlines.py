from pydantic import BaseModel
from typing import Optional


class DeadlineCreate(BaseModel):
    title: str
    description: Optional[str] = None
    deadline_type: str = "filing"
    due_date: str
    reminder_date: Optional[str] = None
    priority: Optional[str] = "medium"
    court_rule: Optional[str] = None
    jurisdiction: Optional[str] = None
    assignee: Optional[str] = None
    notes: Optional[str] = None


class DeadlineUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    deadline_type: Optional[str] = None
    due_date: Optional[str] = None
    reminder_date: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    court_rule: Optional[str] = None
    jurisdiction: Optional[str] = None
    extension_date: Optional[str] = None
    extension_reason: Optional[str] = None
    assignee: Optional[str] = None
    notes: Optional[str] = None


class DeadlineResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    deadlineType: str
    dueDate: str
    reminderDate: Optional[str] = None
    priority: str = "medium"
    status: str = "pending"
    courtRule: Optional[str] = None
    jurisdiction: Optional[str] = None
    extensionDate: Optional[str] = None
    extensionReason: Optional[str] = None
    completedAt: Optional[str] = None
    assignee: Optional[str] = None
    notes: Optional[str] = None
    createdAt: str
    updatedAt: str
