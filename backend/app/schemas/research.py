from pydantic import BaseModel
from typing import Optional


class LegalResearchCreate(BaseModel):
    title: str
    research_type: str = "case_law"
    query: Optional[str] = None
    summary: Optional[str] = None
    citation: Optional[str] = None
    court_name: Optional[str] = None
    decision_date: Optional[str] = None
    relevance: Optional[str] = "medium"
    key_points: Optional[str] = None
    is_favorable: Optional[bool] = None
    notes: Optional[str] = None


class LegalResearchUpdate(BaseModel):
    title: Optional[str] = None
    research_type: Optional[str] = None
    query: Optional[str] = None
    summary: Optional[str] = None
    citation: Optional[str] = None
    court_name: Optional[str] = None
    decision_date: Optional[str] = None
    relevance: Optional[str] = None
    status: Optional[str] = None
    key_points: Optional[str] = None
    is_favorable: Optional[bool] = None
    notes: Optional[str] = None


class LegalResearchResponse(BaseModel):
    id: str
    title: str
    researchType: str
    query: Optional[str] = None
    summary: Optional[str] = None
    citation: Optional[str] = None
    courtName: Optional[str] = None
    decisionDate: Optional[str] = None
    relevance: str = "medium"
    status: str = "found"
    keyPoints: Optional[str] = None
    isFavorable: Optional[bool] = None
    notes: Optional[str] = None
    createdAt: str
    updatedAt: str
