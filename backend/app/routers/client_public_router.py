import os
from datetime import datetime, timezone, timedelta
from collections import defaultdict, deque

from jose import jwt, JWTError
from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models import (
    Case,
    Client,
    ClientAccessLink,
    ClientDocumentRequest,
    ClientMessage,
    Document,
    DocumentChunk,
    Notification,
)
from app.schemas.client import (
    PublicTokenCaseResponse,
    PublicProfileSubmit,
    ClientDocumentRequestResponse,
    PublicMessageCreate,
    CaseMessageResponse,
    VerifyPinRequest,
    VerifyPinResponse,
)
from app.utils.auth import verify_password
from app.utils.pdf_parser import extract_text_from_pdf, get_pdf_page_count
from app.utils.chunking import chunk_text
from app.routers.documents_router import _auto_build_evidence_entry

router = APIRouter()
settings = get_settings()

FORBIDDEN_DETAIL = "This link is no longer active. Please contact your lawyer."
REQUEST_HISTORY: dict[str, deque[datetime]] = defaultdict(deque)
MESSAGE_HISTORY: dict[str, deque[datetime]] = defaultdict(deque)


def _iso_dt(dt: datetime | None) -> str | None:
    if not dt:
        return None
    return dt.strftime("%Y-%m-%dT%H:%M:%S")


def _forbidden() -> HTTPException:
    return HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=FORBIDDEN_DETAIL)


def _session_secret() -> str:
    return f"{settings.JWT_SECRET_KEY}:client-public"


def _create_client_session_token(link: ClientAccessLink) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "link_id": link.id,
        "token": link.token,
        "exp": now + timedelta(hours=4),
        "iat": now,
    }
    return jwt.encode(payload, _session_secret(), algorithm=settings.JWT_ALGORITHM)


def _verify_client_session_token(raw_token: str, expected_link: ClientAccessLink) -> bool:
    try:
        payload = jwt.decode(raw_token, _session_secret(), algorithms=[settings.JWT_ALGORITHM])
        return payload.get("link_id") == expected_link.id and payload.get("token") == expected_link.token
    except JWTError:
        return False


def _apply_rate_limit(token: str, history: dict[str, deque[datetime]], limit: int):
    now = datetime.now(timezone.utc)
    bucket = history[token]
    cutoff = now - timedelta(hours=1)
    while bucket and bucket[0] < cutoff:
        bucket.popleft()
    if len(bucket) >= limit:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Rate limit exceeded")
    bucket.append(now)


def _validate_token_or_403(
    db: Session,
    token: str,
    request: Request,
    *,
    require_pin_verified: bool = True,
    count_open: bool = True,
) -> tuple[ClientAccessLink, Case]:
    _apply_rate_limit(token, REQUEST_HISTORY, 100)

    now = datetime.now(timezone.utc)
    link = db.query(ClientAccessLink).filter(ClientAccessLink.token == token).first()
    if not link:
        raise _forbidden()

    expires_at = link.expires_at
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if not link.is_active or link.is_revoked or (expires_at and expires_at <= now):
        raise _forbidden()

    case = db.query(Case).filter(Case.id == link.case_id).first()
    if not case:
        raise _forbidden()

    if link.pin_enabled and require_pin_verified:
        session_token = request.headers.get("x-client-session-token")
        if not session_token or not _verify_client_session_token(session_token, link):
            raise _forbidden()

    if count_open:
        link.open_count = (link.open_count or 0) + 1
        link.last_opened_at = now
        db.commit()

    return link, case


def _to_doc_req_response(r: ClientDocumentRequest) -> ClientDocumentRequestResponse:
    return ClientDocumentRequestResponse(
        id=r.id,
        case_id=r.case_id,
        client_id=r.client_id,
        document_name=r.document_name,
        reason=r.reason,
        due_date=r.due_date,
        status=r.status,
        uploaded_document_id=r.uploaded_document_id,
        created_at=_iso_dt(r.created_at) or "",
        updated_at=_iso_dt(r.updated_at) or "",
    )


def _to_message_response(m: ClientMessage) -> CaseMessageResponse:
    return CaseMessageResponse(
        id=m.id,
        case_id=m.case_id,
        client_id=m.client_id,
        sender_type=m.sender_type,
        sender_id=m.sender_id,
        content=m.content,
        attachment_document_id=m.attachment_document_id,
        is_read=bool(m.is_read),
        read_at=_iso_dt(m.read_at),
        created_at=_iso_dt(m.created_at) or "",
    )


def _create_notification(db: Session, *, user_id: str, case_id: str | None, title: str, message: str, notification_type: str):
    db.add(Notification(
        user_id=user_id,
        case_id=case_id,
        title=title,
        message=message,
        notification_type=notification_type,
        is_read=False,
    ))


def _calc_age(dob: str | None) -> int | None:
    if not dob:
        return None
    try:
        d = datetime.strptime(dob, "%Y-%m-%d").date()
        today = datetime.now(timezone.utc).date()
        return today.year - d.year - ((today.month, today.day) < (d.month, d.day))
    except ValueError:
        return None


@router.get("/client/{token}/case", response_model=PublicTokenCaseResponse)
async def get_public_case_summary(
    token: str,
    request: Request,
    db: Session = Depends(get_db),
):
    link, case = _validate_token_or_403(db, token, request, require_pin_verified=False, count_open=True)

    if link.pin_enabled:
        session_token = request.headers.get("x-client-session-token")
        if not session_token or not _verify_client_session_token(session_token, link):
            return PublicTokenCaseResponse(
                case_title="Secure Case Update",
                case_stage=None,
                next_hearing_date=None,
                next_hearing_purpose=None,
                days_until_next_hearing=None,
                case_summary=None,
                profile_complete=bool(link.profile_completed),
                allow_document_upload=bool(link.allow_document_upload),
                allow_client_messages=bool(link.allow_client_messages),
                pin_enabled=True,
            )

    days_to_hearing = None
    if case.next_hearing:
        try:
            hearing_date = datetime.strptime(case.next_hearing, "%Y-%m-%d").date()
            days_to_hearing = (hearing_date - datetime.now(timezone.utc).date()).days
        except ValueError:
            days_to_hearing = None

    return PublicTokenCaseResponse(
        case_title=case.title,
        case_stage=case.stage if link.show_case_stage else None,
        next_hearing_date=case.next_hearing if link.show_hearing_date else None,
        next_hearing_purpose=case.hearing_purpose if link.show_hearing_date else None,
        days_until_next_hearing=days_to_hearing if link.show_hearing_date else None,
        case_summary=case.case_description if link.show_case_summary else None,
        profile_complete=bool(link.profile_completed),
        allow_document_upload=bool(link.allow_document_upload),
        allow_client_messages=bool(link.allow_client_messages),
        pin_enabled=bool(link.pin_enabled),
    )


@router.post("/client/{token}/profile", response_model=dict)
async def submit_client_profile(
    token: str,
    payload: PublicProfileSubmit,
    request: Request,
    db: Session = Depends(get_db),
):
    link, case = _validate_token_or_403(db, token, request, require_pin_verified=True, count_open=False)

    client = None
    if case.client_id:
        client = db.query(Client).filter(Client.id == case.client_id).first()

    if not client and link.client_id:
        client = db.query(Client).filter(Client.id == link.client_id).first()

    if client:
        client.full_name = payload.full_name
        client.date_of_birth = payload.date_of_birth
        client.age = _calc_age(payload.date_of_birth)
        client.occupation = payload.occupation
        client.primary_phone = payload.primary_phone
        client.permanent_address = payload.permanent_address
        client.current_address = payload.current_address
        client.aadhaar_last4 = payload.aadhaar_last4
        client.pan_number = payload.pan_number
        client.passport_number = payload.passport_number
        client.has_passport = bool(payload.has_passport)
        client.emergency_contact_name = payload.emergency_contact_name
        client.emergency_contact_relation = payload.emergency_contact_relation
        client.emergency_contact_phone = payload.emergency_contact_phone
        client.family_dependents_count = payload.family_dependents_count
        client.prior_cases = bool(payload.prior_cases)
        client.currently_on_bail = bool(payload.currently_on_bail)
        client.profile_complete = True
    else:
        client = Client(
            user_id=case.user_id,
            full_name=payload.full_name,
            date_of_birth=payload.date_of_birth,
            age=_calc_age(payload.date_of_birth),
            occupation=payload.occupation,
            primary_phone=payload.primary_phone,
            permanent_address=payload.permanent_address,
            current_address=payload.current_address,
            aadhaar_last4=payload.aadhaar_last4,
            pan_number=payload.pan_number,
            passport_number=payload.passport_number,
            has_passport=bool(payload.has_passport),
            emergency_contact_name=payload.emergency_contact_name,
            emergency_contact_relation=payload.emergency_contact_relation,
            emergency_contact_phone=payload.emergency_contact_phone,
            family_dependents_count=payload.family_dependents_count,
            prior_cases=bool(payload.prior_cases),
            currently_on_bail=bool(payload.currently_on_bail),
            profile_complete=True,
            client_since=datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        )
        db.add(client)
        db.flush()

    case.client_id = client.id
    case.client_name = client.full_name
    case.client_phone = client.primary_phone
    case.client_email = client.email

    link.client_id = client.id
    link.profile_completed = True

    _create_notification(
        db,
        user_id=case.user_id,
        case_id=case.id,
        title="Client profile completed",
        message=f"Client {client.full_name} has completed their profile for {case.title}.",
        notification_type="client_profile_complete",
    )

    db.commit()
    return {"message": "Profile submitted"}


@router.get("/client/{token}/documents", response_model=list[ClientDocumentRequestResponse])
async def get_public_document_requests(
    token: str,
    request: Request,
    db: Session = Depends(get_db),
):
    link, case = _validate_token_or_403(db, token, request, require_pin_verified=True, count_open=False)

    requests = db.query(ClientDocumentRequest).filter(
        ClientDocumentRequest.case_id == case.id,
        ClientDocumentRequest.status.in_(["requested", "uploaded"]),
    ).order_by(ClientDocumentRequest.created_at.desc()).all()

    return [_to_doc_req_response(r) for r in requests]


@router.post("/client/{token}/documents/{request_id}/upload", response_model=dict)
async def upload_client_document(
    token: str,
    request_id: str,
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    link, case = _validate_token_or_403(db, token, request, require_pin_verified=True, count_open=False)

    if not link.allow_document_upload:
        raise _forbidden()

    req = db.query(ClientDocumentRequest).filter(
        ClientDocumentRequest.id == request_id,
        ClientDocumentRequest.case_id == case.id,
    ).first()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document request not found")

    allowed_types = {"application/pdf", "image/jpeg", "image/png"}
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported file type")

    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File exceeds 10MB limit")

    upload_dir = os.path.join(settings.UPLOAD_DIR, case.id, "client")
    os.makedirs(upload_dir, exist_ok=True)
    safe_name = os.path.basename(file.filename or "client_upload")
    file_path = os.path.join(upload_dir, safe_name)

    with open(file_path, "wb") as f:
        f.write(contents)

    size_mb = len(contents) / (1024 * 1024)
    size_str = f"{size_mb:.1f} MB" if size_mb >= 1 else f"{len(contents) / 1024:.0f} KB"

    doc = Document(
        case_id=case.id,
        name=safe_name,
        doc_type=req.document_name,
        document_category=req.document_name,
        is_mandatory=1,
        size=size_str,
        file_path=file_path,
        status="uploaded",
        pages=0,
        uploaded_by_client=True,
        document_request_id=req.id,
    )
    db.add(doc)
    db.flush()

    text = None
    page_count = 0
    if safe_name.lower().endswith(".pdf"):
        text = extract_text_from_pdf(file_path)
        page_count = get_pdf_page_count(file_path)
    elif file.content_type in {"image/jpeg", "image/png"}:
        text = None
        page_count = 1

    if text:
        doc.text_content = text
        doc.pages = page_count
        doc.status = "analyzed"
        chunks = chunk_text(text, chunk_size=1200, overlap=120)
        for idx, c in enumerate(chunks):
            db.add(DocumentChunk(
                document_id=doc.id,
                case_id=case.id,
                chunk_index=idx,
                text_content=c,
                token_count=max(1, len(c.split())),
            ))

    _auto_build_evidence_entry(db=db, case=case, document=doc, extracted_text=text)

    req.status = "uploaded"
    req.uploaded_document_id = doc.id

    _create_notification(
        db,
        user_id=case.user_id,
        case_id=case.id,
        title="Client document uploaded",
        message=f"{case.client_name or 'Client'} uploaded {req.document_name} for {case.title}.",
        notification_type="client_document_uploaded",
    )

    db.commit()
    return {"message": "Uploaded successfully", "document_id": doc.id}


@router.get("/client/{token}/messages", response_model=list[CaseMessageResponse])
async def get_public_messages(
    token: str,
    request: Request,
    db: Session = Depends(get_db),
):
    link, case = _validate_token_or_403(db, token, request, require_pin_verified=True, count_open=False)

    if not link.allow_client_messages:
        raise _forbidden()

    messages = db.query(ClientMessage).filter(
        ClientMessage.case_id == case.id,
    ).order_by(ClientMessage.created_at.asc()).all()

    unread_lawyer_messages = [m for m in messages if m.sender_type == "lawyer" and not m.is_read]
    now = datetime.now(timezone.utc)
    for m in unread_lawyer_messages:
        m.is_read = True
        m.read_at = now
    if unread_lawyer_messages:
        db.commit()

    return [_to_message_response(m) for m in messages]


@router.post("/client/{token}/messages", response_model=CaseMessageResponse, status_code=status.HTTP_201_CREATED)
async def send_public_message(
    token: str,
    payload: PublicMessageCreate,
    request: Request,
    db: Session = Depends(get_db),
):
    link, case = _validate_token_or_403(db, token, request, require_pin_verified=True, count_open=False)

    if not link.allow_client_messages:
        raise _forbidden()

    _apply_rate_limit(token, MESSAGE_HISTORY, 20)

    msg = ClientMessage(
        case_id=case.id,
        client_id=case.client_id,
        sender_type="client",
        sender_id=token,
        content=payload.content.strip(),
        is_read=False,
    )
    db.add(msg)

    preview = payload.content.strip()[:50]
    _create_notification(
        db,
        user_id=case.user_id,
        case_id=case.id,
        title="New client message",
        message=f"{case.client_name or 'Client'}: {preview}...",
        notification_type="client_message_received",
    )

    db.commit()
    db.refresh(msg)
    return _to_message_response(msg)


@router.post("/client/{token}/verify-pin", response_model=VerifyPinResponse)
async def verify_pin(
    token: str,
    payload: VerifyPinRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    link, _ = _validate_token_or_403(db, token, request, require_pin_verified=False, count_open=False)

    if not link.pin_enabled:
        raise _forbidden()

    now = datetime.now(timezone.utc)
    if link.pin_locked_until and link.pin_locked_until > now:
        raise _forbidden()

    if not link.pin_hash or not verify_password(payload.pin, link.pin_hash):
        link.pin_failure_count = (link.pin_failure_count or 0) + 1
        if link.pin_failure_count >= 5:
            link.pin_locked_until = now + timedelta(minutes=30)
            link.pin_failure_count = 0
        db.commit()
        raise _forbidden()

    link.pin_failure_count = 0
    link.pin_locked_until = None
    link.open_count = (link.open_count or 0) + 1
    link.last_opened_at = now
    db.commit()

    return VerifyPinResponse(session_token=_create_client_session_token(link), expires_in_seconds=4 * 3600)
