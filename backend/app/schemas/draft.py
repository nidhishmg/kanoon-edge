from pydantic import BaseModel
from typing import List, Optional, Dict, Any


class DraftTemplateResponse(BaseModel):
    id: str
    name: str
    description: str
    category: str
    icon: str


class DraftRequest(BaseModel):
    template_id: str
    case_id: str
    confirmed_fields: Optional[Dict[str, Any]] = None
    selected_loophole_ids: Optional[List[str]] = None


class DraftResponse(BaseModel):
    id: str
    template_id: str
    content: str
    status: str
