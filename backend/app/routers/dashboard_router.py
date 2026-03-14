from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import User, Case, AnalysisResult, Draft
from app.utils.auth import get_current_user

router = APIRouter()


@router.get("/stats")
async def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    total_cases = db.query(func.count(Case.id)).filter(Case.user_id == current_user.id).scalar() or 0
    hearings_today = db.query(func.count(Case.id)).filter(
        Case.user_id == current_user.id,
        Case.next_hearing == today,
    ).scalar() or 0

    ai_analyses = db.query(func.count(AnalysisResult.id)).join(
        Case, Case.id == AnalysisResult.case_id
    ).filter(Case.user_id == current_user.id).scalar() or 0

    drafts_generated = db.query(func.count(Draft.id)).join(
        Case, Case.id == Draft.case_id
    ).filter(Case.user_id == current_user.id).scalar() or 0

    return {
        "caseRooms": int(total_cases),
        "hearingsToday": int(hearings_today),
        "aiAnalyses": int(ai_analyses),
        "draftsGenerated": int(drafts_generated),
    }
