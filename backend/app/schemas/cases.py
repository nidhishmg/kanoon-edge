from pydantic import BaseModel
from typing import List, Optional


class PartyCreate(BaseModel):
    name: str
    role: str
    notes: Optional[str] = None


class PartyResponse(BaseModel):
    id: str
    name: str
    role: str
    notes: Optional[str] = None

    model_config = {"from_attributes": True}


class CaseCreate(BaseModel):
    title: str
    case_number: Optional[str] = None
    court: Optional[str] = None
    case_type: Optional[str] = None
    stage: Optional[str] = None
    next_hearing: Optional[str] = None
    venue: Optional[str] = None
    parties: List[PartyCreate] = []


class CaseRoomResponse(BaseModel):
    id: str
    title: str
    caseNumber: str
    court: str
    caseType: str
    stage: str
    documentCount: int
    loopholesDetected: int
    nextHearing: str
    strength: int
    status: str
    createdAt: str
    parties: List[PartyResponse]
    venue: str
