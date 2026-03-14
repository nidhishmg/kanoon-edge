from pydantic import BaseModel
from typing import Optional, List


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    plan: str
    bar_council_number: Optional[str] = None
    state_bar_council: Optional[str] = None
    enrollment_year: Optional[int] = None
    specializations: List[str] = []
    years_of_practice: Optional[str] = None
    office_city: Optional[str] = None
    phone: Optional[str] = None

    model_config = {"from_attributes": True}


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class ProfileUpdateRequest(BaseModel):
    bar_council_number: str
    state_bar_council: str
    enrollment_year: int
    specializations: List[str] = []
    years_of_practice: str
    office_city: str
    phone: str
