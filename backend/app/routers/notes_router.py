from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import User, Case, CaseNote
from app.schemas.notes import NoteCreate, NoteUpdate, NoteResponse
from app.utils.auth import get_current_user

router = APIRouter()


def _note_to_response(n: CaseNote) -> NoteResponse:
    return NoteResponse(
        id=n.id,
        caseId=n.case_id,
        title=n.title or "",
        content=n.content,
        noteType=n.note_type or "general",
        isPrivate=n.is_private or False,
        createdAt=n.created_at.strftime("%Y-%m-%dT%H:%M:%S") if n.created_at else "",
        updatedAt=n.updated_at.strftime("%Y-%m-%dT%H:%M:%S") if n.updated_at else "",
    )


@router.get("/{case_id}", response_model=List[NoteResponse])
async def list_notes(
    case_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    case = db.query(Case).filter(Case.id == case_id, Case.user_id == current_user.id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")
    notes = db.query(CaseNote).filter(CaseNote.case_id == case_id).order_by(CaseNote.created_at.desc()).all()
    return [_note_to_response(n) for n in notes]


@router.post("/{case_id}", response_model=NoteResponse, status_code=status.HTTP_201_CREATED)
async def create_note(
    case_id: str,
    data: NoteCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    case = db.query(Case).filter(Case.id == case_id, Case.user_id == current_user.id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")
    note = CaseNote(
        case_id=case_id,
        user_id=current_user.id,
        title=data.title,
        content=data.content,
        note_type=data.note_type or "general",
        is_private=data.is_private or False,
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return _note_to_response(note)


@router.put("/{note_id}", response_model=NoteResponse)
async def update_note(
    note_id: str,
    data: NoteUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    note = db.query(CaseNote).filter(CaseNote.id == note_id).first()
    if not note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
    case = db.query(Case).filter(Case.id == note.case_id, Case.user_id == current_user.id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    for field in ["title", "content", "note_type", "is_private"]:
        val = getattr(data, field, None)
        if val is not None:
            setattr(note, field, val)
    db.commit()
    db.refresh(note)
    return _note_to_response(note)


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note(
    note_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    note = db.query(CaseNote).filter(CaseNote.id == note_id).first()
    if not note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
    case = db.query(Case).filter(Case.id == note.case_id, Case.user_id == current_user.id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    db.delete(note)
    db.commit()
