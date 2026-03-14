import os
import re
import json
from datetime import datetime, timezone, date

from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.config import get_settings
from app.database import get_db
from app.models import User, Case, Document, DocumentChunk, TimelineEvent, Hearing, Deadline, AnalysisResult, Evidence
from app.schemas.documents import DocumentResponse
from app.utils.auth import get_current_user
from app.utils.pdf_parser import extract_text_from_pdf, get_pdf_page_count
from app.utils.chunking import chunk_text
from app.utils.strength import calculate_strength

router = APIRouter()
settings = get_settings()

_HEARING_TRIGGERS = ["next date", "adjourned to", "listed on", "fixed for", "posted on"]
_DEADLINE_TRIGGERS = ["compliance by", "to be filed by", "furnish by", "produce by", "submit by"]
_DATE_PATTERN_NUMERIC = re.compile(r"\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b")
_DATE_PATTERN_TEXTUAL = re.compile(
    r"\b(\d{1,2})(?:st|nd|rd|th)?\s+"
    r"(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)"
    r"\s+(\d{4})\b",
    re.IGNORECASE,
)
_MONTH_MAP = {
    "jan": 1, "january": 1,
    "feb": 2, "february": 2,
    "mar": 3, "march": 3,
    "apr": 4, "april": 4,
    "may": 5,
    "jun": 6, "june": 6,
    "jul": 7, "july": 7,
    "aug": 8, "august": 8,
    "sep": 9, "sept": 9, "september": 9,
    "oct": 10, "october": 10,
    "nov": 11, "november": 11,
    "dec": 12, "december": 12,
}


def _safe_date(y: int, m: int, d: int) -> date | None:
    try:
        return date(y, m, d)
    except ValueError:
        return None


def _extract_dates_with_context(text: str) -> list[tuple[date, int, int]]:
    found: list[tuple[date, int, int]] = []
    for m in _DATE_PATTERN_NUMERIC.finditer(text):
        dd = int(m.group(1))
        mm = int(m.group(2))
        yy = int(m.group(3))
        dt = _safe_date(yy, mm, dd)
        if dt:
            found.append((dt, m.start(), m.end()))

    for m in _DATE_PATTERN_TEXTUAL.finditer(text):
        dd = int(m.group(1))
        mm = _MONTH_MAP.get(m.group(2).lower())
        yy = int(m.group(3))
        if not mm:
            continue
        dt = _safe_date(yy, mm, dd)
        if dt:
            found.append((dt, m.start(), m.end()))
    return found


def _has_trigger_before(text: str, start: int, triggers: list[str], window: int = 50) -> bool:
    segment = text[max(0, start - window):start].lower()
    return any(t in segment for t in triggers)


def _extract_text_from_upload(file_path: str, file_name: str, contents: bytes) -> tuple[str | None, int]:
    lower = file_name.lower()
    if lower.endswith(".pdf"):
        text = extract_text_from_pdf(file_path)
        return text, get_pdf_page_count(file_path)
    try:
        return contents.decode("utf-8", errors="ignore"), 1
    except Exception:
        return None, 0


def _is_prosecution_supporting_argument(result: AnalysisResult) -> bool:
    text = f"{result.title or ''} {result.description or ''} {result.guidance or ''}".lower()
    prosecution_signals = ["prosecution", "incriminating", "supports complaint", "supports fir", "confirms allegation"]
    return any(sig in text for sig in prosecution_signals)


def _auto_build_evidence_entry(
    *,
    db: Session,
    case: Case,
    document: Document,
    extracted_text: str | None,
):
    # Use existing analysis results linked to this specific document reference.
    doc_results = db.query(AnalysisResult).filter(
        AnalysisResult.case_id == case.id,
        AnalysisResult.source == "document",
        AnalysisResult.document_ref.ilike(f"%{document.name}%"),
    ).all()

    party_favor = "neutral"
    if any(r.result_type in ("loophole", "contradiction") and (r.source or "document") == "document" for r in doc_results):
        party_favor = "defense"
    elif any(r.result_type == "argument" and (r.severity or "").lower() == "high" and _is_prosecution_supporting_argument(r) for r in doc_results):
        party_favor = "prosecution"

    admissibility_status = "clean"
    admissibility_note = None
    risk_tokens = ["delay", "violation", "missing", "unsigned", "tampered", "chain of custody", "section 65b", "fsl delay"]
    for r in doc_results:
        title = (r.title or "")
        if any(tok in title.lower() for tok in risk_tokens):
            admissibility_status = "risk"
            admissibility_note = title
            break

    summary = ""
    if doc_results and (doc_results[0].description or "").strip():
        summary = (doc_results[0].description or "").strip()[:300]
    elif extracted_text and extracted_text.strip():
        summary = extracted_text.strip()[:300]
    elif document.text_content and document.text_content.strip():
        summary = document.text_content.strip()[:300]
    else:
        first_chunk = db.query(DocumentChunk).filter(DocumentChunk.document_id == document.id).order_by(DocumentChunk.chunk_index.asc()).first()
        if first_chunk and (first_chunk.text_content or "").strip():
            summary = (first_chunk.text_content or "").strip()[:300]
    if not summary:
        summary = "Document uploaded. Run analysis to generate summary."

    is_favorable = True if party_favor == "defense" else False if party_favor == "prosecution" else None
    notes_meta = {
        "party_favor": party_favor,
        "is_favorable": is_favorable,
        "admissibility_note": admissibility_note,
        "auto_generated": True,
    }

    existing = db.query(Evidence).filter(
        Evidence.case_id == case.id,
        Evidence.linked_document_id == document.id,
    ).first()

    if existing:
        existing.title = document.name
        existing.evidence_type = (document.doc_type or "documentary")
        existing.description = summary
        existing.source = "document_upload"
        existing.status = "available"
        existing.admissibility_status = admissibility_status
        existing.notes = json.dumps(notes_meta)
        existing.date_collected = date.today().strftime("%Y-%m-%d")
    else:
        db.add(Evidence(
            case_id=case.id,
            user_id=case.user_id,
            title=document.name,
            evidence_type=(document.doc_type or "documentary"),
            description=summary,
            source="document_upload",
            status="available",
            linked_document_id=document.id,
            admissibility_status=admissibility_status,
            notes=json.dumps(notes_meta),
            date_collected=date.today().strftime("%Y-%m-%d"),
        ))

    # Refresh strength value after evidence update so overview reflects latest score.
    case.strength = calculate_strength(case)


def _doc_to_response(doc: Document, db: Session = None) -> DocumentResponse:
    upload_str = doc.upload_date.strftime("%Y-%m-%d") if doc.upload_date else ""
    has_text = bool(doc.text_content)
    chunk_count = 0
    if db:
        chunk_count = db.query(DocumentChunk).filter(DocumentChunk.document_id == doc.id).count()
    return DocumentResponse(
        id=doc.id,
        name=doc.name,
        type=doc.doc_type or "Document",
        size=doc.size or "0 KB",
        uploadDate=upload_str,
        status=doc.status or "uploaded",
        pages=doc.pages or 0,
        documentCategory=doc.document_category,
        isMandatory=bool(doc.is_mandatory),
        hasText=has_text,
        chunkCount=chunk_count,
        uploadedByClient=bool(doc.uploaded_by_client),
        documentRequestId=doc.document_request_id,
    )


@router.get("/{case_id}", response_model=List[DocumentResponse])
async def list_documents(
    case_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List documents for a case."""
    case = db.query(Case).filter(Case.id == case_id, Case.user_id == current_user.id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")
    docs = db.query(Document).filter(Document.case_id == case_id).order_by(Document.upload_date.desc()).all()
    return [_doc_to_response(d, db) for d in docs]


@router.post("/{case_id}/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    case_id: str,
    file: UploadFile = File(...),
    document_category: Optional[str] = Form(None),
    is_mandatory: Optional[int] = Form(0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload a document to a case room."""
    case = db.query(Case).filter(Case.id == case_id, Case.user_id == current_user.id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    # Store file locally (S3 in production)
    upload_dir = os.path.join(settings.UPLOAD_DIR, case_id)
    os.makedirs(upload_dir, exist_ok=True)

    safe_name = os.path.basename(file.filename or "uploaded_file")
    file_path = os.path.join(upload_dir, safe_name)

    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)

    size_mb = len(contents) / (1024 * 1024)
    size_str = f"{size_mb:.1f} MB" if size_mb >= 1 else f"{len(contents) / 1024:.0f} KB"

    doc = Document(
        case_id=case_id,
        name=safe_name,
        doc_type=document_category or "Uploaded Document",
        document_category=document_category,
        is_mandatory=is_mandatory or 0,
        size=size_str,
        file_path=file_path,
        status="uploaded",
        pages=0,
        uploaded_by_client=False,
        document_request_id=None,
    )
    db.add(doc)
    db.flush()

    # Extract text/chunks immediately so downstream tabs can auto-populate.
    extracted_text, page_count = _extract_text_from_upload(file_path, safe_name, contents)
    if extracted_text:
        doc.text_content = extracted_text
        doc.pages = page_count
        doc.status = "analyzed"
        chunks = chunk_text(extracted_text, chunk_size=1200, overlap=120)
        for idx, c in enumerate(chunks):
            db.add(DocumentChunk(
                document_id=doc.id,
                case_id=case_id,
                chunk_index=idx,
                text_content=c,
                token_count=max(1, len(c.split())),
            ))

        # Hearing date extraction from court-order phrases.
        seen_hearing_dates = {
            h.hearing_date for h in db.query(Hearing).filter(Hearing.case_id == case_id).all()
        }
        today = date.today()
        for dt, start, _ in _extract_dates_with_context(extracted_text):
            if dt <= today:
                continue
            date_str = dt.strftime("%Y-%m-%d")
            if date_str in seen_hearing_dates:
                continue
            if _has_trigger_before(extracted_text, start, _HEARING_TRIGGERS):
                db.add(Hearing(
                    case_id=case_id,
                    hearing_date=date_str,
                    hearing_type="Court listing",
                    notes=f"Auto-extracted from {safe_name}",
                ))
                seen_hearing_dates.add(date_str)

        # Court-ordered deadlines extraction.
        existing_deadline_keys = {
            (d.title, d.due_date) for d in db.query(Deadline).filter(Deadline.case_id == case_id).all()
        }
        for dt, start, _ in _extract_dates_with_context(extracted_text):
            if _has_trigger_before(extracted_text, start, _DEADLINE_TRIGGERS):
                due = dt.strftime("%Y-%m-%d")
                key = (f"Court Ordered Deadline ({safe_name})", due)
                if key in existing_deadline_keys:
                    continue
                db.add(Deadline(
                    case_id=case_id,
                    user_id=current_user.id,
                    title=f"Court Ordered Deadline ({safe_name})",
                    description="Auto-extracted from uploaded court document text.",
                    deadline_type="court_ordered",
                    due_date=due,
                    priority="high",
                    status="pending",
                ))
                existing_deadline_keys.add(key)

        # Timeline enrichment from document dates.
        existing_timeline_dates = {
            t.event_date for t in db.query(TimelineEvent).filter(TimelineEvent.case_id == case_id).all()
        }
        for dt, _, _ in _extract_dates_with_context(extracted_text):
            date_str = dt.strftime("%Y-%m-%d")
            if date_str in existing_timeline_dates:
                continue
            db.add(TimelineEvent(
                case_id=case_id,
                event_type="document",
                title=f"Date extracted from {safe_name}",
                description="Auto-detected date from uploaded document text.",
                event_date=date_str,
                status="upcoming" if dt >= today else "completed",
                auto_generated=True,
                linked_document_id=doc.id,
            ))
            existing_timeline_dates.add(date_str)

    # Priority 4: auto-build or update one evidence entry for this uploaded document.
    _auto_build_evidence_entry(
        db=db,
        case=case,
        document=doc,
        extracted_text=extracted_text,
    )

    # Auto timeline event for document upload
    from datetime import datetime, timezone
    event = TimelineEvent(
        case_id=case_id,
        event_type="document",
        title=f"Document uploaded: {safe_name}",
        description=f"Size: {size_str}",
        event_date=datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        auto_generated=True,
        linked_document_id=doc.id,
    )
    db.add(event)
    db.commit()
    db.refresh(doc)
    return _doc_to_response(doc, db)


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a document."""
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    # Verify ownership
    case = db.query(Case).filter(Case.id == doc.case_id, Case.user_id == current_user.id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    # Remove file from disk
    if doc.file_path and os.path.exists(doc.file_path):
        os.remove(doc.file_path)

    db.delete(doc)
    db.commit()
