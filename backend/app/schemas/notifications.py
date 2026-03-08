from pydantic import BaseModel
from typing import Optional


class NotificationResponse(BaseModel):
    id: str
    caseId: Optional[str] = None
    title: str
    message: Optional[str] = None
    notificationType: str
    isRead: bool = False
    createdAt: str
