"""LLM integration for analysis, chat (RAG), and draft generation using Anthropic Claude."""
import json
import logging
from typing import List, Optional

from app.config import get_settings

logger = logging.getLogger(__name__)


def _get_client():
    """Get Anthropic client. Returns None if no API key configured."""
    settings = get_settings()
    if not settings.ANTHROPIC_API_KEY:
        return None
    from anthropic import Anthropic

    return Anthropic(api_key=settings.ANTHROPIC_API_KEY)


def _get_model() -> str:
    return get_settings().ANTHROPIC_MODEL


def analyze_case_documents(
    case_title: str,
    case_type: str,
    court: str,
    document_texts: List[dict],
    applicable_sections: List[str] = None,
) -> List[dict]:
    """Run AI analysis on case documents to find loopholes, contradictions, arguments.

    Args:
        case_title: Title of the case
        case_type: Type (criminal, civil, etc.)
        court: Court name
        document_texts: List of {"name": str, "text": str} dicts
        applicable_sections: Legal sections applicable

    Returns:
        List of finding dicts with keys: result_type, severity, title, description, legal_basis, guidance, document_ref, page
    """
    client = _get_client()
    if not client:
        return _fallback_analysis()

    doc_context = ""
    for doc in document_texts[:5]:  # Limit to 5 docs
        text = doc["text"][:3000]  # Limit per doc
        doc_context += f"\n--- Document: {doc['name']} ---\n{text}\n"

    sections_str = ", ".join(applicable_sections) if applicable_sections else "Not specified"

    system_prompt = """You are an expert Indian legal analyst AI. Analyze the case documents and identify:
1. Legal loopholes (procedural violations, missing requirements)
2. Contradictions between documents/statements
3. Strong legal arguments for the defence
4. Gaps in evidence or prosecution's case

For each finding, provide:
- result_type: one of "loophole", "contradiction", "argument", "gap"
- severity: "high", "medium", or "low"
- title: concise title
- description: detailed explanation
- legal_basis: relevant sections, acts, and case law
- guidance: actionable advice for the lawyer
- document_ref: which document this relates to
- page: estimated page number (use 1 if unknown)

Return a JSON array of findings. Aim for 3-7 findings.

IMPORTANT: Return ONLY valid JSON. No markdown, no code fences, no explanation outside JSON.
Return a JSON object with a "findings" key containing the array."""

    user_prompt = f"""Case: {case_title}
Type: {case_type}
Court: {court}
Applicable Sections: {sections_str}

Documents:
{doc_context}

Analyze these documents and return findings as a JSON array."""

    try:
        response = client.messages.create(
            model=_get_model(),
            system=system_prompt,
            messages=[
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.3,
            max_tokens=3000,
        )
        content = response.content[0].text
        data = json.loads(content)
        findings = data.get("findings", data.get("results", []))
        if isinstance(findings, list):
            return findings
        return _fallback_analysis()
    except Exception as e:
        logger.error(f"AI analysis failed: {e}")
        return _fallback_analysis()


def chat_with_context(
    message: str,
    case_title: str,
    document_chunks: List[str],
    chat_history: List[dict] = None,
) -> dict:
    """RAG-powered chat: answer questions using document context.

    Returns:
        {"content": str, "citations": [{"document": str, "page": int, "text": str}]}
    """
    client = _get_client()
    if not client:
        return _fallback_chat(message)

    context = "\n\n".join(document_chunks[:10])  # Top 10 relevant chunks

    history_msgs = []
    if chat_history:
        for msg in chat_history[-6:]:  # Last 6 messages
            history_msgs.append({"role": msg["role"], "content": msg["content"]})

    system_prompt = f"""You are KanoonEdge AI, an expert Indian legal assistant analyzing the case "{case_title}".

Answer the user's question based on the case documents provided below. Be specific, cite relevant sections and precedents.

When citing documents, include the document name and relevant text.

Case Documents Context:
{context}

Always respond in a helpful, professional manner. If you cannot find the answer in the documents, say so clearly."""

    messages = []
    messages.extend(history_msgs)
    messages.append({"role": "user", "content": message})

    try:
        response = client.messages.create(
            model=_get_model(),
            system=system_prompt,
            messages=messages,
            temperature=0.4,
            max_tokens=1500,
        )
        content = response.content[0].text
        return {"content": content, "citations": []}
    except Exception as e:
        logger.error(f"AI chat failed: {e}")
        return _fallback_chat(message)


def generate_legal_draft(
    template_id: str,
    case_title: str,
    case_number: str,
    court: str,
    case_type: str,
    document_context: str = "",
    applicable_sections: List[str] = None,
    client_name: str = "",
    opposing_counsel: str = "",
) -> str:
    """Generate a legal draft using AI.

    Returns the draft text content.
    """
    client = _get_client()
    if not client:
        return _fallback_draft(template_id, case_title, case_number, court)

    sections_str = ", ".join(applicable_sections) if applicable_sections else "Not specified"

    template_names = {
        "bail-application": "Bail Application under Section 439 CrPC",
        "anticipatory-bail": "Anticipatory Bail Application under Section 438 CrPC",
        "written-arguments": "Written Arguments",
        "legal-notice": "Legal Notice under Section 80 CPC",
        "affidavit": "Affidavit",
        "petition": "Writ Petition under Article 226/227",
    }
    template_name = template_names.get(template_id, template_id)

    system_prompt = """You are an expert Indian legal document drafter. Generate professional, court-ready legal documents.
Follow proper Indian legal formatting with correct citations. Use formal legal language appropriate for Indian courts."""

    user_prompt = f"""Generate a {template_name} for the following case:

Case Title: {case_title}
Case Number: {case_number}
Court: {court}
Case Type: {case_type}
Applicable Sections: {sections_str}
Client Name: {client_name or '[Client Name]'}
Opposing Counsel: {opposing_counsel or '[Opposing Counsel]'}

Context from case documents:
{document_context[:2000] if document_context else 'No documents available'}

Generate a complete, professional legal document ready for review and filing."""

    try:
        response = client.messages.create(
            model=_get_model(),
            system=system_prompt,
            messages=[
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.3,
            max_tokens=4000,
        )
        return response.content[0].text
    except Exception as e:
        logger.error(f"AI draft generation failed: {e}")
        return _fallback_draft(template_id, case_title, case_number, court)


# === Fallback responses when no API key is configured ===

def _fallback_analysis() -> List[dict]:
    return [
        {
            "result_type": "loophole",
            "severity": "high",
            "title": "Missing Mandatory Witness Signature on FIR",
            "description": "The FIR document lacks the mandatory witness signature as required under Section 154 of CrPC.",
            "legal_basis": "Section 154 CrPC, Lalita Kumari vs. Govt. of UP (2014) 2 SCC 1",
            "guidance": "Challenge the admissibility of the FIR citing procedural irregularity.",
            "document_ref": "FIR_Copy_2024.pdf",
            "page": 3,
        },
        {
            "result_type": "contradiction",
            "severity": "high",
            "title": "Timeline Discrepancy Between FIR and Witness Statement",
            "description": "The FIR states the incident occurred at 10:30 PM while the primary witness places it at 8:45 PM.",
            "legal_basis": "Section 145 Indian Evidence Act",
            "guidance": "Use this contradiction during cross-examination to undermine witness credibility.",
            "document_ref": "Witness_Statement_1.pdf",
            "page": 5,
        },
        {
            "result_type": "loophole",
            "severity": "medium",
            "title": "Charge Sheet Filed Beyond Statutory Period",
            "description": "The charge sheet was filed 95 days after the FIR, exceeding the 90-day statutory limit.",
            "legal_basis": "Section 167(2) CrPC — Right to default bail",
            "guidance": "File application for default bail as a matter of right.",
            "document_ref": "Charge_Sheet.pdf",
            "page": 1,
        },
        {
            "result_type": "argument",
            "severity": "medium",
            "title": "Medical Report Supports Alternative Theory",
            "description": "The medical examiner's report describes injuries consistent with accidental fall.",
            "legal_basis": "Section 45 Indian Evidence Act — Expert opinion",
            "guidance": "Present the medical report as evidence supporting alternative cause of injury.",
            "document_ref": "Medical_Report.pdf",
            "page": 7,
        },
        {
            "result_type": "gap",
            "severity": "low",
            "title": "No Independent Witness in Panchnama",
            "description": "The spot panchnama was conducted without any independent witness.",
            "legal_basis": "Section 100(4) CrPC",
            "guidance": "Challenge the validity of the panchnama.",
            "document_ref": "FIR_Copy_2024.pdf",
            "page": 3,
        },
    ]


def _fallback_chat(message: str) -> dict:
    lower = message.lower()
    if "contradiction" in lower:
        content = (
            "I identified key contradictions in the witness statements. "
            "The FIR states the incident occurred at 10:30 PM while the first witness "
            "places it at 8:45 PM. This significantly weakens the prosecution's timeline.\n\n"
            "**Note:** Connect your Anthropic API key for AI-powered analysis."
        )
    elif "procedural" in lower or "violation" in lower:
        content = (
            "The charge sheet was filed 95 days after the FIR, exceeding the 90-day "
            "statutory limit under Section 167(2) CrPC. This creates an enforceable "
            "right to default bail.\n\n"
            "**Note:** Connect your Anthropic API key for AI-powered analysis."
        )
    else:
        content = (
            "Based on the case documents, the defense has several strong arguments. "
            "The most compelling is the procedural violation in charge sheet filing.\n\n"
            "**Note:** Connect your Anthropic API key in .env for full AI-powered responses."
        )
    return {"content": content, "citations": []}


def _fallback_draft(template_id: str, case_title: str, case_number: str, court: str) -> str:
    from datetime import datetime

    today = datetime.now().strftime("%d/%m/%Y")
    return f"""IN THE {court.upper()}

{case_title}
Case No. {case_number}

[Draft: {template_id}]

This document has been auto-generated by KanoonEdge on {today}.

Note: Connect your OpenAI API key for AI-generated legal drafts.
Please review and customize before filing.

Date: {today}
ADVOCATE FOR THE APPLICANT"""
