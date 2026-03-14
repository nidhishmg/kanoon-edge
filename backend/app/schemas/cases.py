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
    client_id: Optional[str] = None
    client_data: Optional[dict] = None
    opposing_counsel: Optional[str] = None
    # Critical dates
    incident_date: Optional[str] = None
    fir_date: Optional[str] = None
    arrest_date: Optional[str] = None
    in_custody: Optional[bool] = False
    custody_start_date: Optional[str] = None
    charge_sheet_date: Optional[str] = None
    hearing_purpose: Optional[str] = None
    # Wizard metadata
    court_level: Optional[str] = None
    lawyer_side: Optional[str] = None
    # Procedural checklist
    checklist_41a_notice: Optional[str] = None
    checklist_grounds_of_arrest: Optional[str] = None
    checklist_magistrate_24hrs: Optional[str] = None
    checklist_remand_case_diary: Optional[str] = None
    checklist_independent_witness: Optional[str] = None
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
    # Critical dates
    incidentDate: Optional[str] = None
    firDate: Optional[str] = None
    arrestDate: Optional[str] = None
    inCustody: bool = False
    custodyStartDate: Optional[str] = None
    chargeSheetDate: Optional[str] = None
    hearingPurpose: Optional[str] = None
    # Wizard metadata
    courtLevel: Optional[str] = None
    lawyerSide: Optional[str] = None
    # Procedural checklist
    checklist41aNotice: Optional[str] = None
    checklistGroundsOfArrest: Optional[str] = None
    checklistMagistrate24hrs: Optional[str] = None
    checklistRemandCaseDiary: Optional[str] = None
    checklistIndependentWitness: Optional[str] = None
    # Calculated fields
    firDelayDays: Optional[int] = None
    custodyDays: Optional[int] = None
    chargeSheetDeadlineDays: Optional[int] = None
    daysToNextHearing: Optional[int] = None
    # Recommendations
    recommendations: List[dict] = []
    dismissedRecommendations: List[str] = []
    client: Optional[dict] = None
