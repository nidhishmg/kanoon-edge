"""PDF text extraction using PyMuPDF (fitz)."""
import os
from typing import Optional


def extract_text_from_pdf(file_path: str) -> Optional[str]:
    """Extract all text from a PDF file. Returns None if extraction fails."""
    if not os.path.exists(file_path):
        return None
    try:
        import fitz  # PyMuPDF

        doc = fitz.open(file_path)
        pages_text = []
        for page in doc:
            pages_text.append(page.get_text())
        doc.close()
        full_text = "\n\n".join(pages_text).strip()
        return full_text if full_text else None
    except Exception:
        return None


def get_pdf_page_count(file_path: str) -> int:
    """Get number of pages in a PDF."""
    if not os.path.exists(file_path):
        return 0
    try:
        import fitz

        doc = fitz.open(file_path)
        count = len(doc)
        doc.close()
        return count
    except Exception:
        return 0
