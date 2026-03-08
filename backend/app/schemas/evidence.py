from pydantic import BaseModel
from typing import Optional


class EvidenceCreate(BaseModel):
    title: str
    description: Optional[str] = None
    evidence_type: str = "documentary"
    exhibit_number: Optional[str] = None
    bates_start: Optional[str] = None
    bates_end: Optional[str] = None
    source: Optional[str] = None
    custodian: Optional[str] = None
    date_collected: Optional[str] = None
    date_received: Optional[str] = None
    chain_of_custody: Optional[str] = None
    location: Optional[str] = None
    is_privileged: bool = False
    privilege_type: Optional[str] = None
    admissibility_status: Optional[str] = "pending"
    objection_details: Optional[str] = None
    linked_document_id: Optional[str] = None
    status: Optional[str] = "collected"
    notes: Optional[str] = None


class EvidenceUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    evidence_type: Optional[str] = None
    exhibit_number: Optional[str] = None
    bates_start: Optional[str] = None
    bates_end: Optional[str] = None
    source: Optional[str] = None
    custodian: Optional[str] = None
    date_collected: Optional[str] = None
    date_received: Optional[str] = None
    chain_of_custody: Optional[str] = None
    location: Optional[str] = None
    is_privileged: Optional[bool] = None
    privilege_type: Optional[str] = None
    admissibility_status: Optional[str] = None
    objection_details: Optional[str] = None
    linked_document_id: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class EvidenceResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    evidenceType: str
    exhibitNumber: Optional[str] = None
    batesStart: Optional[str] = None
    batesEnd: Optional[str] = None
    source: Optional[str] = None
    custodian: Optional[str] = None
    dateCollected: Optional[str] = None
    dateReceived: Optional[str] = None
    chainOfCustody: Optional[str] = None
    location: Optional[str] = None
    isPrivileged: bool = False
    privilegeType: Optional[str] = None
    admissibilityStatus: str = "pending"
    objectionDetails: Optional[str] = None
    linkedDocumentId: Optional[str] = None
    status: str = "collected"
    notes: Optional[str] = None
    createdAt: str
    updatedAt: str
