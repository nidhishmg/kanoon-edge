from pydantic import BaseModel
from typing import Optional


class JudgeProfileCreate(BaseModel):
    name: str
    court: Optional[str] = None
    bench: Optional[str] = None
    specialization: Optional[str] = None
    tenure_start: Optional[str] = None
    ruling_tendencies: Optional[str] = None
    motion_grant_rate: Optional[float] = None
    avg_sentence_severity: Optional[str] = None
    preferred_arguments: Optional[str] = None
    notable_rulings: Optional[str] = None
    temperament: Optional[str] = None
    notes: Optional[str] = None


class JudgeProfileUpdate(BaseModel):
    name: Optional[str] = None
    court: Optional[str] = None
    bench: Optional[str] = None
    specialization: Optional[str] = None
    tenure_start: Optional[str] = None
    ruling_tendencies: Optional[str] = None
    motion_grant_rate: Optional[float] = None
    avg_sentence_severity: Optional[str] = None
    preferred_arguments: Optional[str] = None
    notable_rulings: Optional[str] = None
    temperament: Optional[str] = None
    notes: Optional[str] = None


class JudgeProfileResponse(BaseModel):
    id: str
    name: str
    court: Optional[str] = None
    bench: Optional[str] = None
    specialization: Optional[str] = None
    tenureStart: Optional[str] = None
    rulingTendencies: Optional[str] = None
    motionGrantRate: Optional[float] = None
    avgSentenceSeverity: Optional[str] = None
    preferredArguments: Optional[str] = None
    notableRulings: Optional[str] = None
    temperament: Optional[str] = None
    notes: Optional[str] = None
    createdAt: str
    updatedAt: str
