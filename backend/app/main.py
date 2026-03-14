from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text

from app.database import engine, SessionLocal, Base
from app.routers import (
    auth_router,
    cases_router,
    documents_router,
    analysis_router,
    draft_router,
    chat_router,
    timeline_router,
    hearings_router,
    tasks_router,
    notes_router,
    notifications_router,
    evidence_router,
    deadlines_router,
    discovery_router,
    billing_router,
    research_router,
    communications_router,
    judge_router,
    client_router,
    client_public_router,
)
from app.utils.seed import seed_dev_user

# Import models so Base.metadata knows about them
import app.models  # noqa: F401


def _ensure_legacy_columns():
    """Backfill new columns on existing deployments without Alembic migrations."""
    inspector = inspect(engine)

    def has_col(table_name: str, col_name: str) -> bool:
        try:
            cols = inspector.get_columns(table_name)
        except Exception:
            return False
        return any(c.get("name") == col_name for c in cols)

    statements: list[str] = []

    if not has_col("cases", "client_id"):
        statements.append("ALTER TABLE cases ADD COLUMN client_id VARCHAR(36)")
    if not has_col("cases", "client_link_id"):
        statements.append("ALTER TABLE cases ADD COLUMN client_link_id VARCHAR(36)")
    if not has_col("documents", "uploaded_by_client"):
        statements.append("ALTER TABLE documents ADD COLUMN uploaded_by_client BOOLEAN DEFAULT 0")
    if not has_col("documents", "document_request_id"):
        statements.append("ALTER TABLE documents ADD COLUMN document_request_id VARCHAR(36)")

    if not statements:
        return

    with engine.begin() as conn:
        for stmt in statements:
            try:
                conn.execute(text(stmt))
            except Exception:
                # Safe best-effort migration for local/dev runtime bootstrap.
                pass


@asynccontextmanager
async def lifespan(application: FastAPI):
    # Startup: create tables and seed dev user
    Base.metadata.create_all(bind=engine)
    _ensure_legacy_columns()
    db = SessionLocal()
    try:
        seed_dev_user(db)
    finally:
        db.close()
    yield
    # Shutdown


app = FastAPI(
    title="KanoonEdge API",
    description="AI-powered legal analysis platform backend",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://localhost:3003"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(cases_router.router, prefix="/api/cases", tags=["Cases"])
app.include_router(documents_router.router, prefix="/api/documents", tags=["Documents"])
app.include_router(analysis_router.router, prefix="/api/analysis", tags=["Analysis"])
app.include_router(draft_router.router, prefix="/api/drafts", tags=["Drafts"])
app.include_router(chat_router.router, prefix="/api/chat", tags=["Chat"])
app.include_router(timeline_router.router, prefix="/api/timeline", tags=["Timeline"])
app.include_router(hearings_router.router, prefix="/api/hearings", tags=["Hearings"])
app.include_router(tasks_router.router, prefix="/api/tasks", tags=["Tasks"])
app.include_router(notes_router.router, prefix="/api/notes", tags=["Notes"])
app.include_router(notifications_router.router, prefix="/api/notifications", tags=["Notifications"])
app.include_router(evidence_router.router, prefix="/api/evidence", tags=["Evidence"])
app.include_router(deadlines_router.router, prefix="/api/deadlines", tags=["Deadlines"])
app.include_router(discovery_router.router, prefix="/api/discovery", tags=["Discovery"])
app.include_router(billing_router.router, prefix="/api/billing", tags=["Billing"])
app.include_router(research_router.router, prefix="/api/research", tags=["Research"])
app.include_router(communications_router.router, prefix="/api/communications", tags=["Communications"])
app.include_router(judge_router.router, prefix="/api/judges", tags=["Judges"])
app.include_router(client_router.router, prefix="/api", tags=["Clients"])
app.include_router(client_public_router.router, prefix="/api", tags=["Client Public"])


@app.get("/")
async def root():
    return {"message": "KanoonEdge API", "version": "0.1.0"}


@app.get("/health")
async def health():
    return {"status": "healthy"}
