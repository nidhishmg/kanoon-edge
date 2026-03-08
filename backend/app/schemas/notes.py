from pydantic import BaseModel
from typing import Optional


class NoteCreate(BaseModel):
    title: Optional[str] = None
    content: str
    note_type: Optional[str] = "general"
    is_private: bool = False


class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    note_type: Optional[str] = None
    is_private: Optional[bool] = None


class NoteResponse(BaseModel):
    id: str
    caseId: str
    title: Optional[str] = None
    content: str
    noteType: str = "general"
    isPrivate: bool = False
    createdAt: str
    updatedAt: str
