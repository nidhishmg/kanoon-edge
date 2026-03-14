from datetime import datetime, timezone, timedelta
import secrets

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from app.config import get_settings
from app.database import get_db
from app.models import (
    User,
    Case,
    Client,
    ClientAccessLink,
    ClientDocumentRequest,
    ClientMessage,
    Document,
    Expense,
    Notification,
)
from app.schemas.client import (
    ClientCreate,
    ClientUpdate,
    ClientResponse,
    ClientListItem,
    LinkClientRequest,
    LinkClientResponse,
    ClientLinkCreateRequest,
    ClientLinkUpdateRequest,
    ClientLinkResponse,
    ClientDocumentRequestCreate,
    ClientDocumentRequestUpdate,
    ClientDocumentRequestResponse,
    CaseMessageCreate,
    CaseMessageResponse,
    UnreadCountResponse,
)
from app.utils.auth import get_current_user, hash_password

router = APIRouter()
settings = get_settings()


def _iso_dt(dt: datetime | None) -> str | None:
    if not dt:
        return None
    return dt.strftime("%Y-%m-%dT%H:%M:%S")


def _iso_date_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _calc_age(dob: str | None) -> int | None:
    if not dob:
        return None
    try:
        d = datetime.strptime(dob, "%Y-%m-%d").date()
        today = datetime.now(timezone.utc).date()
        return today.year - d.year - ((today.month, today.day) < (d.month, d.day))
    except ValueError:
        return None


def _to_client_response(c: Client) -> ClientResponse:
    return ClientResponse(
        id=c.id,
        user_id=c.user_id,
        full_name=c.full_name,
        date_of_birth=c.date_of_birth,
        age=c.age,
        gender=c.gender,
        fathers_name=c.fathers_name,
        occupation=c.occupation,
        employer_name=c.employer_name,
        annual_income_range=c.annual_income_range,
        marital_status=c.marital_status,
        primary_phone=c.primary_phone,
        alternate_phone=c.alternate_phone,
        email=c.email,
        permanent_address=c.permanent_address,
        current_address=c.current_address,
        aadhaar_last4=c.aadhaar_last4,
        pan_number=c.pan_number,
        passport_number=c.passport_number,
        passport_expiry=c.passport_expiry,
        voter_id=c.voter_id,
        has_passport=bool(c.has_passport),
        emergency_contact_name=c.emergency_contact_name,
        emergency_contact_relation=c.emergency_contact_relation,
        emergency_contact_phone=c.emergency_contact_phone,
        prior_cases=bool(c.prior_cases),
        prior_convictions=bool(c.prior_convictions),
        currently_on_bail=bool(c.currently_on_bail),
        bail_conditions=c.bail_conditions,
        is_first_offender=c.is_first_offender,
        family_dependents_count=c.family_dependents_count,
        spouse_name=c.spouse_name,
        children_names=c.children_names,
        payment_capacity=c.payment_capacity,
        lawyer_notes=c.lawyer_notes,
        profile_complete=bool(c.profile_complete),
        client_since=c.client_since,
        created_at=_iso_dt(c.created_at) or "",
        updated_at=_iso_dt(c.updated_at) or "",
    )


def _to_link_response(link: ClientAccessLink) -> ClientLinkResponse:
    base = settings.FRONTEND_BASE_URL.rstrip("/")
    return ClientLinkResponse(
        id=link.id,
        case_id=link.case_id,
        client_id=link.client_id,
        token=link.token,
        created_at=_iso_dt(link.created_at) or "",
        expires_at=_iso_dt(link.expires_at) or "",
        is_active=bool(link.is_active),
        is_revoked=bool(link.is_revoked),
        pin_enabled=bool(link.pin_enabled),
        open_count=link.open_count or 0,
        last_opened_at=_iso_dt(link.last_opened_at),
        show_hearing_date=bool(link.show_hearing_date),
        show_case_stage=bool(link.show_case_stage),
        show_case_summary=bool(link.show_case_summary),
        allow_document_upload=bool(link.allow_document_upload),
        allow_client_messages=bool(link.allow_client_messages),
        require_profile_completion=bool(link.require_profile_completion),
        profile_completed=bool(link.profile_completed),
        share_url=f"{base}/client/{link.token}",
    )


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


@router.post("/clients/", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
async def create_client(
    payload: ClientCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    client = Client(
        user_id=current_user.id,
        client_since=_iso_date_now(),
        **payload.model_dump(),
    )
    if payload.date_of_birth and not payload.age:
        client.age = _calc_age(payload.date_of_birth)
    db.add(client)
    db.commit()
    db.refresh(client)
    return _to_client_response(client)


@router.put("/clients/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: str,
    payload: ClientUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    client = db.query(Client).filter(Client.id == client_id, Client.user_id == current_user.id).first()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")

    updates = payload.model_dump(exclude_unset=True)
    for k, v in updates.items():
        setattr(client, k, v)
    if "date_of_birth" in updates and "age" not in updates:
        client.age = _calc_age(updates.get("date_of_birth"))

    db.commit()
    db.refresh(client)
    return _to_client_response(client)


@router.get("/clients/", response_model=list[ClientListItem])
async def list_clients(
    search: str | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Client).filter(Client.user_id == current_user.id)
    if search:
        needle = f"%{search.strip()}%"
        query = query.filter(or_(Client.full_name.ilike(needle), Client.primary_phone.ilike(needle)))

    clients = query.order_by(Client.updated_at.desc()).all()

    out: list[ClientListItem] = []
    for client in clients:
        active_case_count = db.query(func.count(Case.id)).filter(
            Case.user_id == current_user.id,
            Case.client_id == client.id,
            Case.status == "active",
        ).scalar() or 0

        total_outstanding = db.query(func.coalesce(func.sum(Expense.amount), 0)).join(
            Case, Case.id == Expense.case_id
        ).filter(
            Case.user_id == current_user.id,
            Case.client_id == client.id,
            Expense.is_billable == True,
            Expense.is_reimbursed == False,
        ).scalar() or 0

        out.append(ClientListItem(
            id=client.id,
            full_name=client.full_name,
            primary_phone=client.primary_phone,
            email=client.email,
            active_case_count=int(active_case_count),
            total_outstanding_fees=float(total_outstanding),
            client_since=client.client_since,
        ))

    return out


@router.post("/cases/{case_id}/link-client", response_model=LinkClientResponse)
async def link_client_to_case(
    case_id: str,
    payload: LinkClientRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    case = db.query(Case).filter(Case.id == case_id, Case.user_id == current_user.id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    client = db.query(Client).filter(Client.id == payload.client_id, Client.user_id == current_user.id).first()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")

    case.client_id = client.id
    case.client_name = client.full_name
    case.client_phone = client.primary_phone
    case.client_email = client.email
    db.commit()

    return LinkClientResponse(case_id=case.id, client_id=client.id)


@router.get("/cases/{case_id}/client-link", response_model=ClientLinkResponse | None)
async def get_active_link(
    case_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    case = db.query(Case).filter(Case.id == case_id, Case.user_id == current_user.id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    link = db.query(ClientAccessLink).filter(
        ClientAccessLink.case_id == case_id,
        ClientAccessLink.is_active == True,
        ClientAccessLink.is_revoked == False,
    ).order_by(ClientAccessLink.created_at.desc()).first()
    if not link:
        return None
    return _to_link_response(link)


@router.post("/cases/{case_id}/client-link", response_model=ClientLinkResponse)
async def generate_client_link(
    case_id: str,
    payload: ClientLinkCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    case = db.query(Case).filter(Case.id == case_id, Case.user_id == current_user.id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    active = db.query(ClientAccessLink).filter(
        ClientAccessLink.case_id == case_id,
        ClientAccessLink.is_active == True,
        ClientAccessLink.is_revoked == False,
        ClientAccessLink.expires_at > now,
    ).order_by(ClientAccessLink.created_at.desc()).first()
    if active:
        return _to_link_response(active)

    token = secrets.token_urlsafe(32)
    pin_hash = None
    pin_enabled = bool(payload.pin_enabled)
    if pin_enabled:
        if not payload.pin:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="PIN is required when PIN is enabled")
        pin_hash = hash_password(payload.pin)

    link = ClientAccessLink(
        case_id=case_id,
        client_id=case.client_id,
        token=token,
        created_by=current_user.id,
        expires_at=now + timedelta(days=30),
        is_active=True,
        is_revoked=False,
        pin_enabled=pin_enabled,
        pin_hash=pin_hash,
        show_hearing_date=payload.show_hearing_date if payload.show_hearing_date is not None else True,
        show_case_stage=payload.show_case_stage if payload.show_case_stage is not None else True,
        show_case_summary=payload.show_case_summary if payload.show_case_summary is not None else True,
        allow_document_upload=payload.allow_document_upload if payload.allow_document_upload is not None else True,
        allow_client_messages=payload.allow_client_messages if payload.allow_client_messages is not None else True,
        require_profile_completion=payload.require_profile_completion if payload.require_profile_completion is not None else True,
    )
    db.add(link)
    db.flush()

    case.client_link_id = link.id
    db.commit()
    db.refresh(link)
    return _to_link_response(link)


@router.put("/cases/{case_id}/client-link", response_model=ClientLinkResponse)
async def update_client_link_settings(
    case_id: str,
    payload: ClientLinkUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    case = db.query(Case).filter(Case.id == case_id, Case.user_id == current_user.id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    link = db.query(ClientAccessLink).filter(
        ClientAccessLink.case_id == case_id,
        ClientAccessLink.is_active == True,
        ClientAccessLink.is_revoked == False,
    ).order_by(ClientAccessLink.created_at.desc()).first()
    if not link:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No active client link")

    if payload.show_hearing_date is not None:
        link.show_hearing_date = payload.show_hearing_date
    if payload.show_case_stage is not None:
        link.show_case_stage = payload.show_case_stage
    if payload.show_case_summary is not None:
        link.show_case_summary = payload.show_case_summary
    if payload.allow_document_upload is not None:
        link.allow_document_upload = payload.allow_document_upload
    if payload.allow_client_messages is not None:
        link.allow_client_messages = payload.allow_client_messages
    if payload.require_profile_completion is not None:
        link.require_profile_completion = payload.require_profile_completion

    if payload.pin_enabled is not None:
        link.pin_enabled = payload.pin_enabled
        if payload.pin_enabled:
            if not payload.pin:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="PIN is required when PIN is enabled")
            link.pin_hash = hash_password(payload.pin)
        else:
            link.pin_hash = None
            link.pin_failure_count = 0
            link.pin_locked_until = None

    db.commit()
    db.refresh(link)
    return _to_link_response(link)


@router.delete("/cases/{case_id}/client-link")
async def revoke_client_link(
    case_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    case = db.query(Case).filter(Case.id == case_id, Case.user_id == current_user.id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    link = db.query(ClientAccessLink).filter(
        ClientAccessLink.case_id == case_id,
        ClientAccessLink.is_active == True,
        ClientAccessLink.is_revoked == False,
    ).order_by(ClientAccessLink.created_at.desc()).first()
    if not link:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No active client link")

    link.is_revoked = True
    link.is_active = False
    if case.client_link_id == link.id:
        case.client_link_id = None
    db.commit()
    return {"message": "Client link revoked"}


@router.post("/cases/{case_id}/client-link/regenerate", response_model=ClientLinkResponse)
async def regenerate_client_link(
    case_id: str,
    payload: ClientLinkCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    case = db.query(Case).filter(Case.id == case_id, Case.user_id == current_user.id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    active_links = db.query(ClientAccessLink).filter(
        ClientAccessLink.case_id == case_id,
        ClientAccessLink.is_active == True,
        ClientAccessLink.is_revoked == False,
    ).all()
    for l in active_links:
        l.is_revoked = True
        l.is_active = False

    now = datetime.now(timezone.utc)
    token = secrets.token_urlsafe(32)
    pin_hash = None
    pin_enabled = bool(payload.pin_enabled)
    if pin_enabled:
        if not payload.pin:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="PIN is required when PIN is enabled")
        pin_hash = hash_password(payload.pin)

    link = ClientAccessLink(
        case_id=case_id,
        client_id=case.client_id,
        token=token,
        created_by=current_user.id,
        expires_at=now + timedelta(days=30),
        is_active=True,
        is_revoked=False,
        pin_enabled=pin_enabled,
        pin_hash=pin_hash,
        show_hearing_date=payload.show_hearing_date if payload.show_hearing_date is not None else True,
        show_case_stage=payload.show_case_stage if payload.show_case_stage is not None else True,
        show_case_summary=payload.show_case_summary if payload.show_case_summary is not None else True,
        allow_document_upload=payload.allow_document_upload if payload.allow_document_upload is not None else True,
        allow_client_messages=payload.allow_client_messages if payload.allow_client_messages is not None else True,
        require_profile_completion=payload.require_profile_completion if payload.require_profile_completion is not None else True,
    )
    db.add(link)
    db.flush()

    case.client_link_id = link.id
    db.commit()
    db.refresh(link)
    return _to_link_response(link)


@router.get("/cases/{case_id}/document-requests", response_model=list[ClientDocumentRequestResponse])
async def list_document_requests(
    case_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    case = db.query(Case).filter(Case.id == case_id, Case.user_id == current_user.id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    requests = db.query(ClientDocumentRequest).filter(
        ClientDocumentRequest.case_id == case_id,
    ).order_by(ClientDocumentRequest.created_at.desc()).all()
    return [_to_doc_req_response(r) for r in requests]


@router.post("/cases/{case_id}/document-requests", response_model=ClientDocumentRequestResponse, status_code=status.HTTP_201_CREATED)
async def create_document_request(
    case_id: str,
    payload: ClientDocumentRequestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    case = db.query(Case).filter(Case.id == case_id, Case.user_id == current_user.id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    req = ClientDocumentRequest(
        case_id=case_id,
        client_id=case.client_id,
        requested_by=current_user.id,
        document_name=payload.document_name,
        reason=payload.reason,
        due_date=payload.due_date,
        status="requested",
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return _to_doc_req_response(req)


@router.put("/document-requests/{request_id}", response_model=ClientDocumentRequestResponse)
async def update_document_request(
    request_id: str,
    payload: ClientDocumentRequestUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    req = db.query(ClientDocumentRequest).join(Case, Case.id == ClientDocumentRequest.case_id).filter(
        ClientDocumentRequest.id == request_id,
        Case.user_id == current_user.id,
    ).first()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document request not found")

    req.status = payload.status
    db.commit()
    db.refresh(req)
    return _to_doc_req_response(req)


@router.get("/cases/{case_id}/messages", response_model=list[CaseMessageResponse])
async def list_messages(
    case_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    case = db.query(Case).filter(Case.id == case_id, Case.user_id == current_user.id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    msgs = db.query(ClientMessage).filter(
        ClientMessage.case_id == case_id,
    ).order_by(ClientMessage.created_at.asc()).all()

    unread_client_messages = [m for m in msgs if m.sender_type == "client" and not m.is_read]
    now = datetime.now(timezone.utc)
    for m in unread_client_messages:
        m.is_read = True
        m.read_at = now
    if unread_client_messages:
        db.commit()

    return [_to_message_response(m) for m in msgs]


@router.post("/cases/{case_id}/messages", response_model=CaseMessageResponse, status_code=status.HTTP_201_CREATED)
async def send_message(
    case_id: str,
    payload: CaseMessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    case = db.query(Case).filter(Case.id == case_id, Case.user_id == current_user.id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    if payload.attachment_document_id:
        doc = db.query(Document).filter(Document.id == payload.attachment_document_id, Document.case_id == case_id).first()
        if not doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attachment document not found")

    msg = ClientMessage(
        case_id=case_id,
        client_id=case.client_id,
        sender_type="lawyer",
        sender_id=current_user.id,
        content=payload.content.strip(),
        attachment_document_id=payload.attachment_document_id,
        is_read=False,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return _to_message_response(msg)


@router.get("/cases/{case_id}/messages/unread-count", response_model=UnreadCountResponse)
async def unread_message_count(
    case_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    case = db.query(Case).filter(Case.id == case_id, Case.user_id == current_user.id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    count = db.query(ClientMessage).filter(
        ClientMessage.case_id == case_id,
        ClientMessage.sender_type == "client",
        ClientMessage.is_read == False,
    ).count()
    return UnreadCountResponse(count=count)
