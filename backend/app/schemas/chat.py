from pydantic import BaseModel
from typing import List, Optional


class Citation(BaseModel):
    document: str
    page: int
    text: str


class ChatRequest(BaseModel):
    message: str


class ChatMessageResponse(BaseModel):
    id: str
    role: str
    content: str
    timestamp: str
    citations: Optional[List[Citation]] = None
