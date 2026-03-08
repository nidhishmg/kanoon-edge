from pydantic import BaseModel
from typing import Optional, List


class CaseCreate(BaseModel):
    title: str
    case_number: Optional[str] = None
    court: Optional[str] = None
    case_type: Optional[str] = None
    stage: Optional[str] = None
    next_hearing: Optional[str] = None
    venue: Optional[str] = None
    filing_date: Optional[str] = None
    filing_number: Optional[str] = None
    fir_number: Optional[str] = None
    police_station: Optional[str] = None
    judge_name: Optional[str] = None
    court_number: Optional[str] = None
    applicable_sections: Optional[List[str]] = None
    case_description: Optional[str] = None
    priority: Optional[str] = "medium"
    client_name: Optional[str] = None
    client_phone: Optional[str] = None
    client_email: Optional[str] = None
    opposing_counsel: Optional[str] = None
    parties: List["PartyCreate"] = []


class PartyCreate(BaseModel):
    name: str
    role: str
    notes: Optional[str] = None
    party_type: Optional[str] = "individual"
    advocate_name: Optional[str] = None
    bar_council_number: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    address: Optional[str] = None


class PartyResponse(BaseModel):
    id: str
    name: str
    role: str
    notes: Optional[str] = None
    partyType: Optional[str] = "individual"
    advocateName: Optional[str] = None
    barCouncilNumber: Optional[str] = None
    contactPhone: Optional[str] = None
    contactEmail: Optional[str] = None
    address: Optional[str] = None

    model_config = {"from_attributes": True}


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
    filingDate: Optional[str] = None
    filingNumber: Optional[str] = None
    firNumber: Optional[str] = None
    policeStation: Optional[str] = None
    judgeName: Optional[str] = None
    courtNumber: Optional[str] = None
    applicableSections: Optional[List[str]] = None
    caseDescription: Optional[str] = None
    priority: str = "medium"
    clientName: Optional[str] = None
    clientPhone: Optional[str] = None
    clientEmail: Optional[str] = None
    opposingCounsel: Optional[str] = None
    hearingCount: int = 0
    taskCount: int = 0
    noteCount: int = 0
