from datetime import datetime, timezone
import json

from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas.auth import LoginRequest, LoginResponse, RegisterRequest, UserResponse, ProfileUpdateRequest
from app.utils.auth import verify_password, hash_password, create_access_token, get_current_user

router = APIRouter()


def _to_user_response(user: User) -> UserResponse:
    specializations = []
    if user.specializations:
        try:
            specializations = json.loads(user.specializations)
        except Exception:
            specializations = []
    return UserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        plan=user.plan,
        bar_council_number=user.bar_council_number,
        state_bar_council=user.state_bar_council,
        enrollment_year=user.enrollment_year,
        specializations=specializations,
        years_of_practice=user.years_of_practice,
        office_city=user.office_city,
        phone=user.phone,
    )


@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate user and return access token."""
    user = db.query(User).filter(User.email == request.email).first()
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    user.last_login = datetime.now(timezone.utc)
    db.commit()

    token = create_access_token(user.id)
    return LoginResponse(access_token=token, user=_to_user_response(user))


@router.post("/register", response_model=LoginResponse, status_code=status.HTTP_201_CREATED)
async def register(request: RegisterRequest, db: Session = Depends(get_db)):
    """Create a new user account."""
    existing = db.query(User).filter(User.email == request.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(
        name=request.name,
        email=request.email,
        password_hash=hash_password(request.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id)
    return LoginResponse(access_token=token, user=_to_user_response(user))


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current authenticated user."""
    return _to_user_response(current_user)


@router.put("/profile", response_model=UserResponse)
async def update_profile(
    request: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update professional profile details for the authenticated lawyer."""
    current_user.bar_council_number = request.bar_council_number
    current_user.state_bar_council = request.state_bar_council
    current_user.enrollment_year = request.enrollment_year
    current_user.specializations = json.dumps(request.specializations or [])
    current_user.years_of_practice = request.years_of_practice
    current_user.office_city = request.office_city
    current_user.phone = request.phone
    db.commit()
    db.refresh(current_user)
    return _to_user_response(current_user)
