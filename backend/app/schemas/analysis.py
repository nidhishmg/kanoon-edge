from pydantic import BaseModel


class AnalysisResultResponse(BaseModel):
    id: str
    type: str
    severity: str
    title: str
    description: str
    legalBasis: str
    guidance: str
    documentRef: str
    page: int
    source: str = "document"
