from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import User, Case, Task
from app.schemas.tasks import TaskCreate, TaskUpdate, TaskResponse
from app.utils.auth import get_current_user

router = APIRouter()


def _task_to_response(t: Task) -> TaskResponse:
    return TaskResponse(
        id=t.id,
        caseId=t.case_id,
        title=t.title,
        description=t.description or "",
        dueDate=t.due_date,
        priority=t.priority or "medium",
        status=t.status or "todo",
        assignee=t.assignee or "",
        taskType=t.task_type or "general",
        completedAt=t.completed_at.strftime("%Y-%m-%dT%H:%M:%S") if t.completed_at else None,
        createdAt=t.created_at.strftime("%Y-%m-%dT%H:%M:%S") if t.created_at else "",
    )


@router.get("/{case_id}", response_model=List[TaskResponse])
async def list_tasks(
    case_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    case = db.query(Case).filter(Case.id == case_id, Case.user_id == current_user.id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")
    tasks = db.query(Task).filter(Task.case_id == case_id).order_by(Task.due_date.asc()).all()
    return [_task_to_response(t) for t in tasks]


@router.post("/{case_id}", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    case_id: str,
    data: TaskCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    case = db.query(Case).filter(Case.id == case_id, Case.user_id == current_user.id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")
    task = Task(
        case_id=case_id,
        user_id=current_user.id,
        title=data.title,
        description=data.description,
        due_date=data.due_date,
        priority=data.priority or "medium",
        status="todo",
        assignee=data.assignee,
        task_type=data.task_type or "general",
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return _task_to_response(task)


@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: str,
    data: TaskUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    case = db.query(Case).filter(Case.id == task.case_id, Case.user_id == current_user.id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    for field in ["title", "description", "due_date", "priority", "assignee", "task_type"]:
        val = getattr(data, field, None)
        if val is not None:
            setattr(task, field, val)
    if data.status is not None:
        task.status = data.status
        if data.status == "done":
            task.completed_at = datetime.utcnow()
        else:
            task.completed_at = None
    db.commit()
    db.refresh(task)
    return _task_to_response(task)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    case = db.query(Case).filter(Case.id == task.case_id, Case.user_id == current_user.id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    db.delete(task)
    db.commit()
