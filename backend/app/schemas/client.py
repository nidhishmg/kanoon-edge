from pydantic import BaseModel
from typing import Optional, List


class ClientBase(BaseModel):
    full_name: str
    date_of_birth: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    fathers_name: Optional[str] = None
    occupation: Optional[str] = None
    employer_name: Optional[str] = None
    annual_income_range: Optional[str] = None
    marital_status: Optional[str] = None
    primary_phone: str
    alternate_phone: Optional[str] = None
    email: Optional[str] = None
    permanent_address: Optional[str] = None
    current_address: Optional[str] = None
    aadhaar_last4: Optional[str] = None
    pan_number: Optional[str] = None
    passport_number: Optional[str] = None
    passport_expiry: Optional[str] = None
    voter_id: Optional[str] = None
    has_passport: Optional[bool] = False
    emergency_contact_name: Optional[str] = None
    emergency_contact_relation: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    prior_cases: Optional[bool] = False
    prior_convictions: Optional[bool] = False
    currently_on_bail: Optional[bool] = False
    bail_conditions: Optional[str] = None
    is_first_offender: Optional[bool] = None
    family_dependents_count: Optional[int] = None
    spouse_name: Optional[str] = None
    children_names: Optional[str] = None
    payment_capacity: Optional[str] = None
    lawyer_notes: Optional[str] = None


class ClientCreate(ClientBase):
    pass


class ClientUpdate(BaseModel):
    full_name: Optional[str] = None
    date_of_birth: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    fathers_name: Optional[str] = None
    occupation: Optional[str] = None
    employer_name: Optional[str] = None
    annual_income_range: Optional[str] = None
    marital_status: Optional[str] = None
    primary_phone: Optional[str] = None
    alternate_phone: Optional[str] = None
    email: Optional[str] = None
    permanent_address: Optional[str] = None
    current_address: Optional[str] = None
    aadhaar_last4: Optional[str] = None
    pan_number: Optional[str] = None
    passport_number: Optional[str] = None
    passport_expiry: Optional[str] = None
    voter_id: Optional[str] = None
    has_passport: Optional[bool] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_relation: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    prior_cases: Optional[bool] = None
    prior_convictions: Optional[bool] = None
    currently_on_bail: Optional[bool] = None
    bail_conditions: Optional[str] = None
    is_first_offender: Optional[bool] = None
    family_dependents_count: Optional[int] = None
    spouse_name: Optional[str] = None
    children_names: Optional[str] = None
    payment_capacity: Optional[str] = None
    lawyer_notes: Optional[str] = None
    profile_complete: Optional[bool] = None


class ClientResponse(ClientBase):
    id: str
    user_id: str
    profile_complete: bool = False
    client_since: Optional[str] = None
    created_at: str
    updated_at: str


class ClientListItem(BaseModel):
    id: str
    full_name: str
    primary_phone: str
    email: Optional[str] = None
    active_case_count: int = 0
    total_outstanding_fees: float = 0
    client_since: Optional[str] = None


class LinkSettings(BaseModel):
    show_hearing_date: Optional[bool] = True
    show_case_stage: Optional[bool] = True
    show_case_summary: Optional[bool] = False
    allow_document_upload: Optional[bool] = True
    allow_client_messages: Optional[bool] = True
    require_profile_completion: Optional[bool] = True


class ClientLinkCreateRequest(LinkSettings):
    pin_enabled: Optional[bool] = False
    pin: Optional[str] = None


class ClientLinkUpdateRequest(LinkSettings):
    pin_enabled: Optional[bool] = None
    pin: Optional[str] = None


class ClientLinkResponse(BaseModel):
    id: str
    case_id: str
    client_id: Optional[str] = None
    token: str
    created_at: str
    expires_at: str
    is_active: bool
    is_revoked: bool
    pin_enabled: bool
    open_count: int
    last_opened_at: Optional[str] = None
    show_hearing_date: bool
    show_case_stage: bool
    show_case_summary: bool
    allow_document_upload: bool
    allow_client_messages: bool
    require_profile_completion: bool
    profile_completed: bool
    share_url: str


class LinkClientRequest(BaseModel):
    client_id: str


class LinkClientResponse(BaseModel):
    case_id: str
    client_id: str


class ClientDocumentRequestCreate(BaseModel):
    document_name: str
    reason: Optional[str] = None
    due_date: Optional[str] = None


class ClientDocumentRequestUpdate(BaseModel):
    status: str


class ClientDocumentRequestResponse(BaseModel):
    id: str
    case_id: str
    client_id: Optional[str] = None
    document_name: str
    reason: Optional[str] = None
    due_date: Optional[str] = None
    status: str
    uploaded_document_id: Optional[str] = None
    created_at: str
    updated_at: str


class CaseMessageCreate(BaseModel):
    content: str
    attachment_document_id: Optional[str] = None


class CaseMessageResponse(BaseModel):
    id: str
    case_id: str
    client_id: Optional[str] = None
    sender_type: str
    sender_id: str
    content: str
    attachment_document_id: Optional[str] = None
    is_read: bool
    read_at: Optional[str] = None
    created_at: str


class UnreadCountResponse(BaseModel):
    count: int


class PublicTokenCaseResponse(BaseModel):
    case_title: str
    case_stage: Optional[str] = None
    next_hearing_date: Optional[str] = None
    next_hearing_purpose: Optional[str] = None
    days_until_next_hearing: Optional[int] = None
    case_summary: Optional[str] = None
    profile_complete: bool
    allow_document_upload: bool
    allow_client_messages: bool
    pin_enabled: bool


class PublicProfileSubmit(BaseModel):
    full_name: str
    date_of_birth: Optional[str] = None
    occupation: Optional[str] = None
    primary_phone: str
    permanent_address: Optional[str] = None
    current_address: Optional[str] = None
    aadhaar_last4: Optional[str] = None
    pan_number: Optional[str] = None
    passport_number: Optional[str] = None
    has_passport: Optional[bool] = False
    emergency_contact_name: Optional[str] = None
    emergency_contact_relation: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    family_dependents_count: Optional[int] = None
    prior_cases: Optional[bool] = False
    currently_on_bail: Optional[bool] = False


class PublicMessageCreate(BaseModel):
    content: str


class VerifyPinRequest(BaseModel):
    pin: str


class VerifyPinResponse(BaseModel):
    session_token: str
    expires_in_seconds: int
