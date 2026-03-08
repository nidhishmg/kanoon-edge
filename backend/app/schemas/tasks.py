from pydantic import BaseModel
from typing import Optional


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: Optional[str] = None
    priority: Optional[str] = "medium"
    assignee: Optional[str] = None
    task_type: Optional[str] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    assignee: Optional[str] = None


class TaskResponse(BaseModel):
    id: str
    caseId: str
    title: str
    description: Optional[str] = None
    dueDate: Optional[str] = None
    priority: str = "medium"
    status: str = "todo"
    assignee: Optional[str] = None
    taskType: Optional[str] = None
    createdAt: str
    completedAt: Optional[str] = None
