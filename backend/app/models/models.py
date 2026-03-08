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
