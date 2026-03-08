from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import User, JudgeProfile
from app.schemas.judge_profiles import JudgeProfileCreate, JudgeProfileUpdate, JudgeProfileResponse
from app.utils.auth import get_current_user

router = APIRouter()


def _to_response(j: JudgeProfile) -> JudgeProfileResponse:
    return JudgeProfileResponse(
        id=j.id,
        name=j.name,
        court=j.court,
        bench=j.bench,
        specialization=j.specialization,
        tenureStart=j.tenure_start,
        rulingTendencies=j.ruling_tendencies,
        motionGrantRate=j.motion_grant_rate,
        avgSentenceSeverity=j.avg_sentence_severity,
        preferredArguments=j.preferred_arguments,
        notableRulings=j.notable_rulings,
        temperament=j.temperament,
        notes=j.notes,
        createdAt=j.created_at.strftime("%Y-%m-%dT%H:%M:%S") if j.created_at else "",
        updatedAt=j.updated_at.strftime("%Y-%m-%dT%H:%M:%S") if j.updated_at else "",
    )


@router.get("/", response_model=List[JudgeProfileResponse])
async def list_judge_profiles(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    items = db.query(JudgeProfile).filter(
        JudgeProfile.user_id == current_user.id
    ).order_by(JudgeProfile.name.asc()).all()
    return [_to_response(j) for j in items]


@router.post("/", response_model=JudgeProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_judge_profile(
    data: JudgeProfileCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = JudgeProfile(
        user_id=current_user.id,
        name=data.name,
        court=data.court,
        bench=data.bench,
        specialization=data.specialization,
        tenure_start=data.tenure_start,
        ruling_tendencies=data.ruling_tendencies,
        motion_grant_rate=data.motion_grant_rate,
        avg_sentence_severity=data.avg_sentence_severity,
        preferred_arguments=data.preferred_arguments,
        notable_rulings=data.notable_rulings,
        temperament=data.temperament,
        notes=data.notes,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return _to_response(item)


@router.put("/{judge_id}", response_model=JudgeProfileResponse)
async def update_judge_profile(
    judge_id: str,
    data: JudgeProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = db.query(JudgeProfile).filter(
        JudgeProfile.id == judge_id, JudgeProfile.user_id == current_user.id
    ).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Judge profile not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return _to_response(item)


@router.delete("/{judge_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_judge_profile(
    judge_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = db.query(JudgeProfile).filter(
        JudgeProfile.id == judge_id, JudgeProfile.user_id == current_user.id
    ).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Judge profile not found")
    db.delete(item)
    db.commit()
