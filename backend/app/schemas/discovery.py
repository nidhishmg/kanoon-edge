from pydantic import BaseModel
from typing import Optional


class DiscoveryRequestCreate(BaseModel):
    title: str
    discovery_type: str = "interrogatory"
    direction: Optional[str] = "outgoing"
    served_to: Optional[str] = None
    served_date: Optional[str] = None
    due_date: Optional[str] = None
    items_json: Optional[str] = None
    notes: Optional[str] = None


class DiscoveryRequestUpdate(BaseModel):
    title: Optional[str] = None
    discovery_type: Optional[str] = None
    direction: Optional[str] = None
    served_to: Optional[str] = None
    served_date: Optional[str] = None
    due_date: Optional[str] = None
    response_date: Optional[str] = None
    status: Optional[str] = None
    items_json: Optional[str] = None
    response_summary: Optional[str] = None
    objections: Optional[str] = None
    notes: Optional[str] = None


class DiscoveryRequestResponse(BaseModel):
    id: str
    title: str
    discoveryType: str
    direction: str = "outgoing"
    servedTo: Optional[str] = None
    servedDate: Optional[str] = None
    dueDate: Optional[str] = None
    responseDate: Optional[str] = None
    status: str = "draft"
    itemsJson: Optional[str] = None
    responseSummary: Optional[str] = None
    objections: Optional[str] = None
    notes: Optional[str] = None
    createdAt: str
    updatedAt: str
