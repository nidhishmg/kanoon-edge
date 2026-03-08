from pydantic import BaseModel
from typing import Optional


class CommunicationCreate(BaseModel):
    comm_type: str = "email"
    direction: Optional[str] = "outgoing"
    subject: Optional[str] = None
    contact_name: Optional[str] = None
    contact_role: Optional[str] = None
    comm_date: str
    summary: Optional[str] = None
    follow_up_date: Optional[str] = None
    linked_document_id: Optional[str] = None
    is_privileged: bool = False
    notes: Optional[str] = None


class CommunicationUpdate(BaseModel):
    comm_type: Optional[str] = None
    direction: Optional[str] = None
    subject: Optional[str] = None
    contact_name: Optional[str] = None
    contact_role: Optional[str] = None
    comm_date: Optional[str] = None
    summary: Optional[str] = None
    follow_up_date: Optional[str] = None
    follow_up_done: Optional[bool] = None
    linked_document_id: Optional[str] = None
    is_privileged: Optional[bool] = None
    notes: Optional[str] = None


class CommunicationResponse(BaseModel):
    id: str
    commType: str
    direction: str = "outgoing"
    subject: Optional[str] = None
    contactName: Optional[str] = None
    contactRole: Optional[str] = None
    commDate: str
    summary: Optional[str] = None
    followUpDate: Optional[str] = None
    followUpDone: bool = False
    linkedDocumentId: Optional[str] = None
    isPrivileged: bool = False
    notes: Optional[str] = None
    createdAt: str
