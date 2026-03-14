import re
from typing import List
from urllib.parse import quote_plus

import requests
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.utils.auth import get_current_user

router = APIRouter()


def _html_fallback_search(query: str, page: int) -> List[dict]:
    # Fallback for environments without API access: parse Indiankanoon result page.
    url = f"https://indiankanoon.org/search/?formInput={quote_plus(query)}&pagenum={page}"
    resp = requests.get(url, timeout=20)
    resp.raise_for_status()
    html = resp.text

    results: List[dict] = []
    blocks = re.findall(r'<div class="result\">([\s\S]*?)</div>\s*</div>', html)
    if not blocks:
        blocks = re.findall(r'<div class="result_title">([\s\S]*?)<div class="snippet">([\s\S]*?)</div>', html)

    for block in blocks[:15]:
        chunk = "".join(block) if isinstance(block, tuple) else block
        title_match = re.search(r'>([^<]{8,220})</a>', chunk)
        href_match = re.search(r'href="([^"]+)"', chunk)
        snippet_match = re.search(r'<div class="snippet">([\s\S]*?)</div>', chunk)
        doc_id_match = re.search(r'/doc/(\d+)/', chunk)

        title = title_match.group(1).strip() if title_match else "Judgment"
        href = href_match.group(1).strip() if href_match else ""
        if href and href.startswith("/"):
            href = f"https://indiankanoon.org{href}"

        snippet = ""
        if snippet_match:
            snippet = re.sub(r"<[^>]+>", " ", snippet_match.group(1))
            snippet = re.sub(r"\s+", " ", snippet).strip()

        citation = doc_id_match.group(1) if doc_id_match else ""
        results.append(
            {
                "title": title,
                "court": "Indian Kanoon",
                "date": "",
                "citation": citation,
                "summary": snippet,
                "url": href or url,
            }
        )

    return results


@router.get("/")
async def legal_search(
    query: str = Query(..., min_length=2),
    page: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Try API style endpoint first, then fallback to HTML scraping.
    api_url = f"https://api.indiankanoon.org/search/?formInput={quote_plus(query)}&pagenum={page}"
    try:
        r = requests.get(api_url, timeout=15)
        if r.ok and r.headers.get("content-type", "").lower().startswith("application/json"):
            payload = r.json()
            docs = payload.get("docs") or payload.get("results") or []
            cleaned = []
            for d in docs[:20]:
                cleaned.append(
                    {
                        "title": d.get("title") or d.get("doc_title") or "Judgment",
                        "court": d.get("court") or d.get("docsource") or "Indian Kanoon",
                        "date": d.get("publishdate") or d.get("date") or "",
                        "citation": d.get("citation") or d.get("docid") or "",
                        "summary": d.get("headline") or d.get("snippet") or "",
                        "url": d.get("url") or f"https://indiankanoon.org/doc/{d.get('docid', '')}/",
                    }
                )
            return {"query": query, "page": page, "results": cleaned}
    except Exception:
        pass

    fallback = _html_fallback_search(query, page)
    return {"query": query, "page": page, "results": fallback}
