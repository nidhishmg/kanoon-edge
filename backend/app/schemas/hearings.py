from pydantic import BaseModel
from typing import Optional


class HearingCreate(BaseModel):
    hearing_date: str
    hearing_type: Optional[str] = None
    judge_name: Optional[str] = None
    court_number: Optional[str] = None
    outcome: Optional[str] = None
    next_date: Optional[str] = None
    notes: Optional[str] = None
    adjourned: bool = False
    adjournment_reason: Optional[str] = None
    order_text: Optional[str] = None


class HearingUpdate(BaseModel):
    outcome: Optional[str] = None
    next_date: Optional[str] = None
    notes: Optional[str] = None
    adjourned: Optional[bool] = None
    adjournment_reason: Optional[str] = None
    order_text: Optional[str] = None


class HearingResponse(BaseModel):
    id: str
    hearingDate: str
    hearingType: Optional[str] = None
    judgeName: Optional[str] = None
    courtNumber: Optional[str] = None
    outcome: Optional[str] = None
    nextDate: Optional[str] = None
    notes: Optional[str] = None
    adjourned: bool = False
    adjournmentReason: Optional[str] = None
    orderText: Optional[str] = None
    orderDocumentId: Optional[str] = None
    createdAt: str
