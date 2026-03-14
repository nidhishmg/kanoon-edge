import json
from datetime import date, timedelta, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import User, Case, Party, TimelineEvent, AnalysisResult, Hearing, Task, Deadline, Client
from app.schemas.cases import CaseCreate, CaseRoomResponse, PartyCreate, PartyResponse
from app.utils.auth import get_current_user
from app.utils.strength import calculate_strength, calculate_dates, generate_recommendations, detect_rule_based_loopholes
from app.utils.sections_db import classify_sections
from app.utils.task_templates import (
    parse_flexible_date,
    to_iso,
    resolve_templates,
    resolve_due_date,
    compute_charge_sheet_deadline,
)

router = APIRouter()


def _party_to_response(p: Party) -> PartyResponse:
    return PartyResponse(
        id=p.id, name=p.name, role=p.role, notes=p.notes,
        partyType=p.party_type or "individual",
        advocateName=p.advocate_name,
        barCouncilNumber=p.bar_council_number,
        contactPhone=p.contact_phone,
        contactEmail=p.contact_email,
        address=p.address,
    )


def _case_to_response(case: Case) -> CaseRoomResponse:
    doc_count = len(case.documents) if case.documents else 0
    loopholes = len([r for r in (case.analysis_results or []) if r.result_type in ("loophole",)])
    parties = [_party_to_response(p) for p in (case.parties or [])]
    sections = None
    if case.applicable_sections:
        try:
            sections = json.loads(case.applicable_sections)
        except (json.JSONDecodeError, TypeError):
            sections = None

    # Calculate strength dynamically
    strength = calculate_strength(case)
    dates = calculate_dates(case)
    recommendations = generate_recommendations(case)

    dismissed = []
    if case.dismissed_recommendations:
        try:
            dismissed = json.loads(case.dismissed_recommendations)
        except (json.JSONDecodeError, TypeError):
            dismissed = []

    client_snapshot = None
    if case.client_profile:
        unread_client_messages = len([
            m for m in (case.client_messages or []) if m.sender_type == "client" and not m.is_read
        ])
        active_document_requests = len([
            r for r in (case.client_document_requests or []) if r.status in ("requested", "uploaded")
        ])
        client_snapshot = {
            "id": case.client_profile.id,
            "name": case.client_profile.full_name,
            "phone": case.client_profile.primary_phone,
            "profileComplete": bool(case.client_profile.profile_complete),
            "unreadMessageCount": unread_client_messages,
            "activeDocumentRequestCount": active_document_requests,
        }

    return CaseRoomResponse(
        id=case.id,
        title=case.title,
        caseNumber=case.case_number or "",
        court=case.court or "",
        caseType=case.case_type or "",
        stage=case.stage or "",
        documentCount=doc_count,
        loopholesDetected=loopholes,
        nextHearing=case.next_hearing or "",
        strength=strength,
        status=case.status or "active",
        createdAt=case.created_at.strftime("%Y-%m-%d") if case.created_at else "",
        parties=parties,
        venue=case.venue or "",
        filingDate=case.filing_date,
        filingNumber=case.filing_number,
        firNumber=case.fir_number,
        policeStation=case.police_station,
        judgeName=case.judge_name,
        courtNumber=case.court_number,
        applicableSections=sections,
        caseDescription=case.case_description,
        priority=case.priority or "medium",
        clientName=case.client_name,
        clientPhone=case.client_phone,
        clientEmail=case.client_email,
        opposingCounsel=case.opposing_counsel,
        hearingCount=len(case.hearings) if case.hearings else 0,
        taskCount=len(case.tasks) if case.tasks else 0,
        noteCount=len(case.notes) if case.notes else 0,
        incidentDate=case.incident_date,
        firDate=case.fir_date,
        arrestDate=case.arrest_date,
        inCustody=bool(case.in_custody) if case.in_custody else False,
        custodyStartDate=case.custody_start_date,
        chargeSheetDate=case.charge_sheet_date,
        hearingPurpose=case.hearing_purpose,
        courtLevel=case.court_level,
        lawyerSide=case.lawyer_side,
        checklist41aNotice=case.checklist_41a_notice,
        checklistGroundsOfArrest=case.checklist_grounds_of_arrest,
        checklistMagistrate24hrs=case.checklist_magistrate_24hrs,
        checklistRemandCaseDiary=case.checklist_remand_case_diary,
        checklistIndependentWitness=case.checklist_independent_witness,
        firDelayDays=dates.get("firDelayDays"),
        custodyDays=dates.get("custodyDays"),
        chargeSheetDeadlineDays=dates.get("chargeSheetDeadlineDays"),
        daysToNextHearing=dates.get("daysToNextHearing"),
        recommendations=recommendations,
        dismissedRecommendations=dismissed,
        client=client_snapshot,
    )


def _ensure_initial_hearing(case: Case, db: Session):
    if not case.next_hearing:
        return
    exists = db.query(Hearing).filter(
        Hearing.case_id == case.id,
        Hearing.hearing_date == case.next_hearing,
    ).first()
    if exists:
        return
    db.add(Hearing(
        case_id=case.id,
        hearing_date=case.next_hearing,
        hearing_type=case.hearing_purpose or "Upcoming Hearing",
        judge_name=case.judge_name,
        court_number=case.court_number,
        notes=f"Auto-created from case intake ({case.court or 'Court'})",
    ))


def _upsert_deadline(
    *,
    case: Case,
    db: Session,
    user_id: str,
    title: str,
    deadline_type: str,
    due_date: str | None,
    description: str,
    legal_basis: str | None = None,
):
    if not due_date:
        return
    existing = db.query(Deadline).filter(
        Deadline.case_id == case.id,
        Deadline.deadline_type == deadline_type,
        Deadline.title == title,
    ).first()
    if existing:
        existing.due_date = due_date
        existing.description = description
        existing.court_rule = legal_basis
        return
    db.add(Deadline(
        case_id=case.id,
        user_id=user_id,
        title=title,
        description=description,
        deadline_type=deadline_type,
        due_date=due_date,
        priority="high",
        court_rule=legal_basis,
        status="pending",
    ))


def _ensure_statutory_deadlines(case: Case, db: Session, user_id: str):
    charge_sheet_deadline = compute_charge_sheet_deadline(case)
    charge_sheet_deadline_str = to_iso(charge_sheet_deadline)

    if charge_sheet_deadline_str:
        _upsert_deadline(
            case=case,
            db=db,
            user_id=user_id,
            title="Charge Sheet Filing Deadline",
            deadline_type="statutory",
            due_date=charge_sheet_deadline_str,
            description="Computed from arrest date and applicable section gravity.",
            legal_basis="Section 167(2) CrPC",
        )
        _upsert_deadline(
            case=case,
            db=db,
            user_id=user_id,
            title="Default Bail Application Window Opens",
            deadline_type="statutory",
            due_date=charge_sheet_deadline_str,
            description="Default bail eligibility window based on statutory charge sheet timeline.",
            legal_basis="Section 167(2) CrPC",
        )

    is_civil = (case.case_type or "").strip().lower() == "civil"
    filing_date = parse_flexible_date(case.filing_date)
    if is_civil and filing_date:
        _upsert_deadline(
            case=case,
            db=db,
            user_id=user_id,
            title="Written Statement Deadline",
            deadline_type="statutory",
            due_date=to_iso(filing_date + timedelta(days=30)),
            description="Estimated written statement deadline from filing date.",
            legal_basis="CPC written statement timeline",
        )

    no_41a = (case.checklist_41a_notice or "").strip().lower() == "no"
    no_arrest = parse_flexible_date(case.arrest_date) is None
    if no_41a and no_arrest:
        _upsert_deadline(
            case=case,
            db=db,
            user_id=user_id,
            title="41A Non-Compliance Challenge Prep",
            deadline_type="statutory",
            due_date=to_iso(date.today() + timedelta(days=3)),
            description="Prepare anticipatory bail challenge for 41A notice non-compliance.",
            legal_basis="Section 41A CrPC",
        )


def _ensure_template_tasks(case: Case, db: Session, user_id: str):
    templates = resolve_templates(case.case_type, case.stage)
    today = date.today()
    existing_titles = {t.title for t in db.query(Task).filter(Task.case_id == case.id).all()}

    for tpl in templates:
        title = tpl["title"]
        if title in existing_titles:
            continue
        due = resolve_due_date(tpl["due_date_rule"], case, today)
        if due and due < today:
            continue
        db.add(Task(
            case_id=case.id,
            user_id=user_id,
            title=title,
            description=tpl.get("description") or "",
            due_date=to_iso(due),
            priority=tpl.get("priority") or "medium",
            status="todo",
            task_type=tpl.get("task_type") or "general",
        ))
        existing_titles.add(title)


def _ensure_hearing_proximity_tasks(case: Case, db: Session, user_id: str) -> bool:
    next_hearing = parse_flexible_date(case.next_hearing)
    if not next_hearing:
        return False
    days_to_hearing = (next_hearing - date.today()).days
    if days_to_hearing < 0 or days_to_hearing > 7:
        return False

    pending_count = db.query(Task).filter(
        Task.case_id == case.id,
        Task.status.in_(["todo", "in_progress", "pending"]),
    ).count()
    if pending_count >= 3:
        return False

    created = False
    existing_titles = {t.title for t in db.query(Task).filter(Task.case_id == case.id).all()}
    prep_tasks = [
        ("Finalize hearing brief", "Prepare concise written and oral submissions.", 2),
        ("Compile hearing bundle", "Arrange annexures, citations, and chronology.", 1),
        ("Review opposing arguments", "Prepare rebuttal points for anticipated objections.", 0),
    ]
    for title, desc, days_before in prep_tasks:
        if title in existing_titles:
            continue
        due = next_hearing - timedelta(days=days_before)
        if due < date.today():
            due = date.today()
        db.add(Task(
            case_id=case.id,
            user_id=user_id,
            title=title,
            description=desc,
            due_date=to_iso(due),
            priority="high",
            status="todo",
            task_type="hearing_prep",
        ))
        created = True
        existing_titles.add(title)
    return created


@router.get("/", response_model=List[CaseRoomResponse])
async def list_cases(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cases = db.query(Case).filter(Case.user_id == current_user.id).order_by(Case.created_at.desc()).all()
    return [_case_to_response(c) for c in cases]


@router.get("/{case_id}", response_model=CaseRoomResponse)
async def get_case(
    case_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    case = db.query(Case).filter(Case.id == case_id, Case.user_id == current_user.id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    if _ensure_hearing_proximity_tasks(case, db, current_user.id):
        db.commit()
        db.refresh(case)

    return _case_to_response(case)


@router.post("/", response_model=CaseRoomResponse, status_code=status.HTTP_201_CREATED)
async def create_case(
    data: CaseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    selected_client = None
    if data.client_id:
        selected_client = db.query(Client).filter(
            Client.id == data.client_id,
            Client.user_id == current_user.id,
        ).first()
        if not selected_client:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Selected client not found")

    if not selected_client and data.client_data:
        full_name = (data.client_data.get("full_name") or data.client_data.get("name") or "").strip()
        primary_phone = (data.client_data.get("primary_phone") or data.client_data.get("phone") or "").strip()
        if not full_name or not primary_phone:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="client_data requires full_name and primary_phone")
        selected_client = Client(
            user_id=current_user.id,
            full_name=full_name,
            primary_phone=primary_phone,
            date_of_birth=data.client_data.get("date_of_birth") or data.client_data.get("dob"),
            occupation=data.client_data.get("occupation"),
            client_since=datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            profile_complete=False,
        )
        db.add(selected_client)
        db.flush()

    sections_json = json.dumps(data.applicable_sections) if data.applicable_sections else None
    case = Case(
        user_id=current_user.id,
        title=data.title,
        case_number=data.case_number,
        court=data.court,
        case_type=data.case_type,
        stage=data.stage,
        next_hearing=data.next_hearing,
        venue=data.venue,
        filing_date=data.filing_date,
        filing_number=data.filing_number,
        fir_number=data.fir_number,
        police_station=data.police_station,
        judge_name=data.judge_name,
        court_number=data.court_number,
        applicable_sections=sections_json,
        case_description=data.case_description,
        priority=data.priority or "medium",
        client_name=(selected_client.full_name if selected_client else data.client_name),
        client_phone=(selected_client.primary_phone if selected_client else data.client_phone),
        client_email=(selected_client.email if selected_client else data.client_email),
        client_id=(selected_client.id if selected_client else None),
        opposing_counsel=data.opposing_counsel,
        incident_date=data.incident_date,
        fir_date=data.fir_date,
        arrest_date=data.arrest_date,
        in_custody=data.in_custody,
        custody_start_date=data.custody_start_date,
        charge_sheet_date=data.charge_sheet_date,
        hearing_purpose=data.hearing_purpose,
        court_level=data.court_level,
        lawyer_side=data.lawyer_side,
        checklist_41a_notice=data.checklist_41a_notice,
        checklist_grounds_of_arrest=data.checklist_grounds_of_arrest,
        checklist_magistrate_24hrs=data.checklist_magistrate_24hrs,
        checklist_remand_case_diary=data.checklist_remand_case_diary,
        checklist_independent_witness=data.checklist_independent_witness,
    )
    db.add(case)
    db.flush()

    auto_client_party_added = False
    if selected_client and selected_client.full_name:
        existing_client_party = any(
            (p.name or "").strip().lower() == selected_client.full_name.strip().lower()
            for p in (data.parties or [])
        )
        if not existing_client_party:
            role_by_side = {
                "defence": "Accused",
                "prosecution": "Complainant",
                "petitioner": "Petitioner",
                "respondent": "Respondent",
            }
            auto_role = role_by_side.get((data.lawyer_side or "").strip().lower(), "Petitioner")
            db.add(Party(case_id=case.id, name=selected_client.full_name, role=auto_role, notes="Auto-linked client"))
            auto_client_party_added = True

    for p in data.parties:
        party = Party(
            case_id=case.id, name=p.name, role=p.role, notes=p.notes,
            party_type=p.party_type, advocate_name=p.advocate_name,
            bar_council_number=p.bar_council_number,
            contact_phone=p.contact_phone, contact_email=p.contact_email,
            address=p.address,
        )
        db.add(party)

    # Auto-generate timeline events from all dates
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    te = TimelineEvent(
        case_id=case.id, event_type="filing", title="Case Room Created",
        description=f"Case '{data.title}' was created", event_date=today,
        status="completed", auto_generated=True,
    )
    db.add(te)

    if data.incident_date:
        db.add(TimelineEvent(
            case_id=case.id, event_type="incident", title="Incident / Offence Date",
            description="Date of the alleged incident or offence",
            event_date=data.incident_date, status="completed", auto_generated=True,
        ))

    if data.fir_date:
        db.add(TimelineEvent(
            case_id=case.id, event_type="fir", title="FIR Filed",
            description=f"FIR {data.fir_number or ''} filed at {data.police_station or 'Police Station'}".strip(),
            event_date=data.fir_date, status="completed", auto_generated=True,
        ))

    if data.arrest_date:
        db.add(TimelineEvent(
            case_id=case.id, event_type="arrest", title="Arrest",
            description="Accused was arrested",
            event_date=data.arrest_date, status="completed", auto_generated=True,
        ))

    if data.charge_sheet_date:
        db.add(TimelineEvent(
            case_id=case.id, event_type="charge_sheet", title="Charge Sheet Filed",
            description="Charge sheet was filed by prosecution",
            event_date=data.charge_sheet_date, status="completed", auto_generated=True,
        ))

    if data.next_hearing:
        db.add(TimelineEvent(
            case_id=case.id, event_type="hearing", title="Next Hearing",
            description=f"{data.hearing_purpose or 'Hearing'} at {data.court or 'Court'}",
            event_date=data.next_hearing, status="upcoming", auto_generated=True,
        ))

    # Run rule-based loophole detection from intake data
    loopholes = detect_rule_based_loopholes(case)
    for lp in loopholes:
        db.add(AnalysisResult(
            case_id=case.id,
            result_type=lp.get("result_type", "loophole"),
            severity=lp.get("severity", "medium"),
            title=lp.get("title", ""),
            description=lp.get("description", ""),
            legal_basis=lp.get("legal_basis", ""),
            guidance=lp.get("guidance", ""),
            source="intake",
        ))

    # Priority 1: Auto-generate first hearing from wizard data
    _ensure_initial_hearing(case, db)

    # Priority 2: Auto-generate statutory deadlines from intake dates/checklist
    _ensure_statutory_deadlines(case, db, current_user.id)

    # Priority 3: Auto-generate task templates by case type + stage
    _ensure_template_tasks(case, db, current_user.id)

    db.commit()
    db.refresh(case)
    return _case_to_response(case)


@router.post("/{case_id}/dismiss-recommendation")
async def dismiss_recommendation(
    case_id: str,
    body: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    case = db.query(Case).filter(Case.id == case_id, Case.user_id == current_user.id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")
    rec_id = body.get("recommendationId")
    if not rec_id:
        raise HTTPException(status_code=400, detail="recommendationId required")
    dismissed = []
    if case.dismissed_recommendations:
        try:
            dismissed = json.loads(case.dismissed_recommendations)
        except (json.JSONDecodeError, TypeError):
            dismissed = []
    if rec_id not in dismissed:
        dismissed.append(rec_id)
    case.dismissed_recommendations = json.dumps(dismissed)
    db.commit()
    return {"status": "ok"}


@router.get("/sections/classify")
async def classify_sections_endpoint(
    sections: str,
    current_user: User = Depends(get_current_user),
):
    section_list = [s.strip() for s in sections.split(",") if s.strip()]
    result = classify_sections(section_list)
    return result


@router.post("/{case_id}/parties", response_model=PartyResponse, status_code=status.HTTP_201_CREATED)
async def add_party(
    case_id: str,
    data: PartyCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    case = db.query(Case).filter(Case.id == case_id, Case.user_id == current_user.id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")
    party = Party(
        case_id=case.id, name=data.name, role=data.role, notes=data.notes,
        party_type=data.party_type, advocate_name=data.advocate_name,
        bar_council_number=data.bar_council_number,
        contact_phone=data.contact_phone, contact_email=data.contact_email,
        address=data.address,
    )
    db.add(party)
    db.commit()
    db.refresh(party)
    return _party_to_response(party)


@router.get("/{case_id}/parties", response_model=List[PartyResponse])
async def list_parties(
    case_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    case = db.query(Case).filter(Case.id == case_id, Case.user_id == current_user.id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")
    return [_party_to_response(p) for p in case.parties]
