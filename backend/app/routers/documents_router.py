import os
from datetime import datetime, timezone

from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.config import get_settings
from app.database import get_db
from app.models import User, Case, Document, DocumentChunk, TimelineEvent
from app.schemas.documents import DocumentResponse
from app.utils.auth import get_current_user

router = APIRouter()
settings = get_settings()


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
    )
    db.add(doc)
    db.flush()
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
