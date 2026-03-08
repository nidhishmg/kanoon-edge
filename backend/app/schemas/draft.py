from pydantic import BaseModel
from typing import List


class DraftTemplateResponse(BaseModel):
    id: str
    name: str
    description: str
    category: str
    icon: str


class DraftRequest(BaseModel):
    template_id: str
    case_id: str


class DraftResponse(BaseModel):
    id: str
    template_id: str
    content: str
    status: str
