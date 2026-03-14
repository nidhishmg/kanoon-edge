from pydantic import BaseModel
from typing import Optional


class DocumentResponse(BaseModel):
    id: str
    name: str
    type: str
    size: str
    uploadDate: str
    status: str
    pages: int
    documentCategory: Optional[str] = None
    isMandatory: bool = False
    hasText: bool = False
    chunkCount: int = 0
    uploadedByClient: bool = False
    documentRequestId: Optional[str] = None
