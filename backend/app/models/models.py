import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Column, String, Integer, Text, DateTime, ForeignKey, Index, Float, Boolean
)
from sqlalchemy.orm import relationship

from app.database import Base


def utcnow():
    return datetime.now(timezone.utc)


def new_uuid():
    return str(uuid.uuid4())


# ── Users ─────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=new_uuid)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default="lawyer")
    plan = Column(String(50), default="free")
    created_at = Column(DateTime(timezone=True), default=utcnow)
    last_login = Column(DateTime(timezone=True), nullable=True)

    cases = relationship("Case", back_populates="owner", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")


# ── Cases ─────────────────────────────────────────────────────

class Case(Base):
    __tablename__ = "cases"

    id = Column(String(36), primary_key=True, default=new_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(500), nullable=False)
    case_number = Column(String(100), nullable=True)
    court = Column(String(255), nullable=True)
    case_type = Column(String(50), nullable=True)
    stage = Column(String(50), nullable=True)
    next_hearing = Column(String(20), nullable=True)
    strength = Column(Integer, default=0)
    status = Column(String(20), default="active")
    venue = Column(Text, nullable=True)

    # New fields
    filing_date = Column(String(20), nullable=True)
    filing_number = Column(String(100), nullable=True)
    fir_number = Column(String(100), nullable=True)
    police_station = Column(String(255), nullable=True)
    judge_name = Column(String(255), nullable=True)
    court_number = Column(String(50), nullable=True)
    applicable_sections = Column(Text, nullable=True)       # JSON array: ["302 IPC", "34 IPC"]
    case_description = Column(Text, nullable=True)
    priority = Column(String(20), default="medium")         # high, medium, low
    client_name = Column(String(255), nullable=True)
    client_phone = Column(String(20), nullable=True)
    client_email = Column(String(255), nullable=True)
    opposing_counsel = Column(String(255), nullable=True)

    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    owner = relationship("User", back_populates="cases")
    parties = relationship("Party", back_populates="case", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="case", cascade="all, delete-orphan")
    analysis_results = relationship("AnalysisResult", back_populates="case", cascade="all, delete-orphan")
    drafts = relationship("Draft", back_populates="case", cascade="all, delete-orphan")
    chat_sessions = relationship("ChatSession", back_populates="case", cascade="all, delete-orphan")
    timeline_events = relationship("TimelineEvent", back_populates="case", cascade="all, delete-orphan")
    hearings = relationship("Hearing", back_populates="case", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="case", cascade="all, delete-orphan")
    notes = relationship("CaseNote", back_populates="case", cascade="all, delete-orphan")
    evidence_items = relationship("Evidence", back_populates="case", cascade="all, delete-orphan")
    deadlines = relationship("Deadline", back_populates="case", cascade="all, delete-orphan")
    discovery_requests = relationship("DiscoveryRequest", back_populates="case", cascade="all, delete-orphan")
    time_entries = relationship("TimeEntry", back_populates="case", cascade="all, delete-orphan")
    expenses = relationship("Expense", back_populates="case", cascade="all, delete-orphan")
    legal_research = relationship("LegalResearch", back_populates="case", cascade="all, delete-orphan")
    communications = relationship("Communication", back_populates="case", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_cases_user_id", "user_id"),
    )


# ── Parties ───────────────────────────────────────────────────

class Party(Base):
    __tablename__ = "parties"

    id = Column(String(36), primary_key=True, default=new_uuid)
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)
    notes = Column(Text, nullable=True)
    party_type = Column(String(50), default="individual")    # individual, organization, government
    advocate_name = Column(String(255), nullable=True)
    bar_council_number = Column(String(100), nullable=True)
    contact_phone = Column(String(20), nullable=True)
    contact_email = Column(String(255), nullable=True)
    address = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    case = relationship("Case", back_populates="parties")


# ── Documents ─────────────────────────────────────────────────

class Document(Base):
    __tablename__ = "documents"

    id = Column(String(36), primary_key=True, default=new_uuid)
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(500), nullable=False)
    doc_type = Column(String(100), nullable=True)
    document_category = Column(String(100), nullable=True)
    is_mandatory = Column(Integer, default=0)
    associated_party = Column(String(255), nullable=True)
    size = Column(String(20), nullable=True)
    pages = Column(Integer, default=0)
    file_path = Column(Text, nullable=True)
    text_content = Column(Text, nullable=True)               # Extracted full text
    status = Column(String(20), default="uploaded")
    upload_date = Column(DateTime(timezone=True), default=utcnow)
    version = Column(Integer, default=1)

    case = relationship("Case", back_populates="documents")
    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_documents_case_id", "case_id"),
    )


# ── Document Chunks ──────────────────────────────────────────

class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(String(36), primary_key=True, default=new_uuid)
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    text_content = Column(Text, nullable=False)
    embedding_json = Column(Text, nullable=True)              # JSON-encoded embedding vector
    token_count = Column(Integer, default=0)

    document = relationship("Document", back_populates="chunks")

    __table_args__ = (
        Index("ix_document_chunks_case_id", "case_id"),
        Index("ix_document_chunks_document_id", "document_id"),
    )


# ── Analysis Results ─────────────────────────────────────────

class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id = Column(String(36), primary_key=True, default=new_uuid)
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    result_type = Column(String(50), nullable=False)
    severity = Column(String(20), nullable=False)
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    legal_basis = Column(Text, nullable=True)
    guidance = Column(Text, nullable=True)
    document_ref = Column(String(500), nullable=True)
    page = Column(Integer, nullable=True)
    confidence = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    case = relationship("Case", back_populates="analysis_results")


# ── Drafts ────────────────────────────────────────────────────

class Draft(Base):
    __tablename__ = "drafts"

    id = Column(String(36), primary_key=True, default=new_uuid)
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    draft_type = Column(String(100), nullable=False)
    title = Column(String(500), nullable=True)
    content = Column(Text, nullable=False)
    version = Column(Integer, default=1)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    case = relationship("Case", back_populates="drafts")


# ── Timeline Events ──────────────────────────────────────────

class TimelineEvent(Base):
    __tablename__ = "timeline_events"

    id = Column(String(36), primary_key=True, default=new_uuid)
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    event_type = Column(String(50), nullable=False)           # hearing, filing, order, document, analysis, custom
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    event_date = Column(String(20), nullable=False)           # YYYY-MM-DD
    status = Column(String(20), default="completed")          # completed, current, upcoming, missed
    auto_generated = Column(Boolean, default=False)
    linked_document_id = Column(String(36), nullable=True)
    linked_hearing_id = Column(String(36), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    case = relationship("Case", back_populates="timeline_events")

    __table_args__ = (
        Index("ix_timeline_events_case_id", "case_id"),
    )


# ── Hearings ─────────────────────────────────────────────────

class Hearing(Base):
    __tablename__ = "hearings"

    id = Column(String(36), primary_key=True, default=new_uuid)
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    hearing_date = Column(String(20), nullable=False)
    hearing_type = Column(String(100), nullable=True)         # arguments, evidence, order, bail, misc
    judge_name = Column(String(255), nullable=True)
    court_number = Column(String(50), nullable=True)
    outcome = Column(Text, nullable=True)
    next_date = Column(String(20), nullable=True)
    notes = Column(Text, nullable=True)
    adjourned = Column(Boolean, default=False)
    adjournment_reason = Column(Text, nullable=True)
    order_text = Column(Text, nullable=True)
    order_document_id = Column(String(36), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    case = relationship("Case", back_populates="hearings")

    __table_args__ = (
        Index("ix_hearings_case_id", "case_id"),
    )


# ── Tasks ─────────────────────────────────────────────────────

class Task(Base):
    __tablename__ = "tasks"

    id = Column(String(36), primary_key=True, default=new_uuid)
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    due_date = Column(String(20), nullable=True)
    priority = Column(String(20), default="medium")
    status = Column(String(20), default="todo")               # todo, in_progress, done, blocked
    assignee = Column(String(255), nullable=True)
    task_type = Column(String(50), nullable=True)             # filing, drafting, research, hearing_prep, client_meeting
    created_at = Column(DateTime(timezone=True), default=utcnow)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    case = relationship("Case", back_populates="tasks")

    __table_args__ = (
        Index("ix_tasks_case_id", "case_id"),
        Index("ix_tasks_user_id", "user_id"),
    )


# ── Case Notes ────────────────────────────────────────────────

class CaseNote(Base):
    __tablename__ = "case_notes"

    id = Column(String(36), primary_key=True, default=new_uuid)
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(500), nullable=True)
    content = Column(Text, nullable=False)
    note_type = Column(String(50), default="general")         # general, hearing, client_meeting, research, strategy
    is_private = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    case = relationship("Case", back_populates="notes")

    __table_args__ = (
        Index("ix_case_notes_case_id", "case_id"),
    )


# ── Notifications ────────────────────────────────────────────

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=new_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    case_id = Column(String(36), nullable=True)
    title = Column(String(500), nullable=False)
    message = Column(Text, nullable=True)
    notification_type = Column(String(50), nullable=False)    # hearing_reminder, deadline, analysis_complete, task_due
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    user = relationship("User", back_populates="notifications")

    __table_args__ = (
        Index("ix_notifications_user_id", "user_id"),
    )


# ── Chat Sessions ────────────────────────────────────────────

class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(String(36), primary_key=True, default=new_uuid)
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    case = relationship("Case", back_populates="chat_sessions")
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_chat_sessions_case_id", "case_id"),
    )


# ── Chat Messages ────────────────────────────────────────────

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(String(36), primary_key=True, default=new_uuid)
    session_id = Column(String(36), ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False)
    sender_type = Column(String(20), nullable=False)
    content = Column(Text, nullable=False)
    citations_json = Column(Text, nullable=True)
    timestamp = Column(DateTime(timezone=True), default=utcnow)

    session = relationship("ChatSession", back_populates="messages")


# ── Evidence ─────────────────────────────────────────────────

class Evidence(Base):
    __tablename__ = "evidence"

    id = Column(String(36), primary_key=True, default=new_uuid)
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    evidence_type = Column(String(50), nullable=False)        # physical, documentary, testimonial, digital, forensic
    exhibit_number = Column(String(100), nullable=True)
    bates_start = Column(String(50), nullable=True)
    bates_end = Column(String(50), nullable=True)
    source = Column(String(255), nullable=True)
    custodian = Column(String(255), nullable=True)
    date_collected = Column(String(20), nullable=True)
    date_received = Column(String(20), nullable=True)
    chain_of_custody = Column(Text, nullable=True)            # JSON array of custody events
    location = Column(String(500), nullable=True)
    is_privileged = Column(Boolean, default=False)
    privilege_type = Column(String(100), nullable=True)       # attorney-client, work-product, spousal
    admissibility_status = Column(String(50), default="pending")  # admitted, objected, pending, excluded
    objection_details = Column(Text, nullable=True)
    linked_document_id = Column(String(36), nullable=True)
    status = Column(String(50), default="collected")          # collected, reviewed, submitted, admitted, excluded
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    case = relationship("Case", back_populates="evidence_items")

    __table_args__ = (
        Index("ix_evidence_case_id", "case_id"),
    )


# ── Deadlines ────────────────────────────────────────────────

class Deadline(Base):
    __tablename__ = "deadlines"

    id = Column(String(36), primary_key=True, default=new_uuid)
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    deadline_type = Column(String(50), nullable=False)        # filing, response, discovery, motion, appeal, statutory
    due_date = Column(String(20), nullable=False)
    reminder_date = Column(String(20), nullable=True)
    priority = Column(String(20), default="medium")
    status = Column(String(20), default="pending")            # pending, completed, extended, missed
    court_rule = Column(String(255), nullable=True)
    jurisdiction = Column(String(255), nullable=True)
    extension_date = Column(String(20), nullable=True)
    extension_reason = Column(Text, nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    assignee = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    case = relationship("Case", back_populates="deadlines")

    __table_args__ = (
        Index("ix_deadlines_case_id", "case_id"),
        Index("ix_deadlines_due_date", "due_date"),
    )


# ── Discovery Requests ──────────────────────────────────────

class DiscoveryRequest(Base):
    __tablename__ = "discovery_requests"

    id = Column(String(36), primary_key=True, default=new_uuid)
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(500), nullable=False)
    discovery_type = Column(String(50), nullable=False)       # interrogatory, rfp, rfa, deposition, subpoena
    direction = Column(String(20), default="outgoing")        # outgoing, incoming
    served_to = Column(String(255), nullable=True)
    served_date = Column(String(20), nullable=True)
    due_date = Column(String(20), nullable=True)
    response_date = Column(String(20), nullable=True)
    status = Column(String(50), default="draft")              # draft, served, responded, overdue, objected, completed
    items_json = Column(Text, nullable=True)                  # JSON array of individual items
    response_summary = Column(Text, nullable=True)
    objections = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    case = relationship("Case", back_populates="discovery_requests")

    __table_args__ = (
        Index("ix_discovery_requests_case_id", "case_id"),
    )


# ── Time Entries ─────────────────────────────────────────────

class TimeEntry(Base):
    __tablename__ = "time_entries"

    id = Column(String(36), primary_key=True, default=new_uuid)
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    description = Column(Text, nullable=False)
    activity_type = Column(String(50), nullable=True)         # research, drafting, court_appearance, meeting, travel, review
    date = Column(String(20), nullable=False)
    hours = Column(Float, nullable=False)
    rate = Column(Float, default=0.0)
    amount = Column(Float, default=0.0)
    is_billable = Column(Boolean, default=True)
    is_billed = Column(Boolean, default=False)
    invoice_id = Column(String(36), nullable=True)
    timer_start = Column(DateTime(timezone=True), nullable=True)
    timer_end = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(20), default="draft")              # draft, submitted, approved, billed
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    case = relationship("Case", back_populates="time_entries")

    __table_args__ = (
        Index("ix_time_entries_case_id", "case_id"),
        Index("ix_time_entries_user_id", "user_id"),
    )


# ── Expenses ─────────────────────────────────────────────────

class Expense(Base):
    __tablename__ = "expenses"

    id = Column(String(36), primary_key=True, default=new_uuid)
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    description = Column(Text, nullable=False)
    expense_type = Column(String(50), nullable=False)         # filing_fee, courier, travel, printing, expert_fee, other
    amount = Column(Float, nullable=False)
    date = Column(String(20), nullable=False)
    vendor = Column(String(255), nullable=True)
    receipt_path = Column(Text, nullable=True)
    is_billable = Column(Boolean, default=True)
    is_reimbursed = Column(Boolean, default=False)
    status = Column(String(20), default="pending")            # pending, approved, reimbursed, rejected
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    case = relationship("Case", back_populates="expenses")

    __table_args__ = (
        Index("ix_expenses_case_id", "case_id"),
    )


# ── Legal Research ───────────────────────────────────────────

class LegalResearch(Base):
    __tablename__ = "legal_research"

    id = Column(String(36), primary_key=True, default=new_uuid)
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(500), nullable=False)
    research_type = Column(String(50), nullable=False)        # case_law, statute, regulation, commentary, article
    query = Column(Text, nullable=True)
    summary = Column(Text, nullable=True)
    citation = Column(String(500), nullable=True)
    court_name = Column(String(255), nullable=True)
    decision_date = Column(String(20), nullable=True)
    relevance = Column(String(20), default="medium")          # high, medium, low
    status = Column(String(20), default="found")              # found, reviewing, applied, discarded
    key_points = Column(Text, nullable=True)                  # JSON array of key points
    is_favorable = Column(Boolean, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    case = relationship("Case", back_populates="legal_research")

    __table_args__ = (
        Index("ix_legal_research_case_id", "case_id"),
    )


# ── Communications ───────────────────────────────────────────

class Communication(Base):
    __tablename__ = "communications"

    id = Column(String(36), primary_key=True, default=new_uuid)
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    comm_type = Column(String(50), nullable=False)            # email, phone, meeting, letter, court_filing
    direction = Column(String(20), default="outgoing")        # incoming, outgoing
    subject = Column(String(500), nullable=True)
    contact_name = Column(String(255), nullable=True)
    contact_role = Column(String(100), nullable=True)
    comm_date = Column(String(20), nullable=False)
    summary = Column(Text, nullable=True)
    follow_up_date = Column(String(20), nullable=True)
    follow_up_done = Column(Boolean, default=False)
    linked_document_id = Column(String(36), nullable=True)
    is_privileged = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    case = relationship("Case", back_populates="communications")

    __table_args__ = (
        Index("ix_communications_case_id", "case_id"),
    )


# ── Audit Log ────────────────────────────────────────────────

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=new_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    case_id = Column(String(36), nullable=True)
    action = Column(String(100), nullable=False)              # create, update, delete, view, export, login
    entity_type = Column(String(100), nullable=True)          # case, document, evidence, hearing, etc.
    entity_id = Column(String(36), nullable=True)
    old_values = Column(Text, nullable=True)                  # JSON of previous values
    new_values = Column(Text, nullable=True)                  # JSON of new values
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    __table_args__ = (
        Index("ix_audit_logs_user_id", "user_id"),
        Index("ix_audit_logs_case_id", "case_id"),
        Index("ix_audit_logs_action", "action"),
    )


# ── Judge Profiles ───────────────────────────────────────────

class JudgeProfile(Base):
    __tablename__ = "judge_profiles"

    id = Column(String(36), primary_key=True, default=new_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    court = Column(String(255), nullable=True)
    bench = Column(String(255), nullable=True)
    specialization = Column(String(255), nullable=True)
    tenure_start = Column(String(20), nullable=True)
    ruling_tendencies = Column(Text, nullable=True)           # JSON of tendencies
    motion_grant_rate = Column(Float, nullable=True)
    avg_sentence_severity = Column(String(50), nullable=True)
    preferred_arguments = Column(Text, nullable=True)         # JSON array
    notable_rulings = Column(Text, nullable=True)             # JSON array of ruling summaries
    temperament = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    __table_args__ = (
        Index("ix_judge_profiles_user_id", "user_id"),
    )
