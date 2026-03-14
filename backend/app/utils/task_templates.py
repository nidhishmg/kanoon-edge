import json
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional

from app.utils.sections_db import classify_sections


def parse_flexible_date(value: Optional[str]) -> Optional[date]:
    if not value:
        return None
    raw = value.strip()
    if not raw:
        return None
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(raw, fmt).date()
        except ValueError:
            continue
    try:
        return datetime.fromisoformat(raw).date()
    except ValueError:
        return None


def to_iso(d: Optional[date]) -> Optional[str]:
    return d.strftime("%Y-%m-%d") if d else None


def _has_over_seven_year_section(applicable_sections: Optional[str]) -> bool:
    if not applicable_sections:
        return False
    try:
        sections = json.loads(applicable_sections)
        if not isinstance(sections, list):
            return False
        classified = classify_sections([str(s) for s in sections])
        return any(bool(s.get("over7Years")) for s in classified)
    except (TypeError, ValueError, json.JSONDecodeError):
        return False


def compute_charge_sheet_deadline(case: Any) -> Optional[date]:
    arrest = parse_flexible_date(getattr(case, "arrest_date", None))
    charge_sheet = parse_flexible_date(getattr(case, "charge_sheet_date", None))
    if not arrest or charge_sheet:
        return None
    days = 90 if _has_over_seven_year_section(getattr(case, "applicable_sections", None)) else 60
    return arrest + timedelta(days=days)


TASK_TEMPLATES: Dict[str, Dict[str, List[Dict[str, str]]]] = {
    "criminal": {
        "bail": [
            {"title": "Obtain certified copy of FIR", "description": "Collect the certified FIR copy for pleadings and annexures.", "priority": "high", "due_date_rule": "from_today_2_days", "task_type": "document_collection"},
            {"title": "Verify Section 41A compliance", "description": "Check arrest safeguards and notice compliance.", "priority": "high", "due_date_rule": "from_today_1_day", "task_type": "legal_compliance"},
            {"title": "Prepare bail application", "description": "Draft anticipatory/regular bail application with case facts.", "priority": "high", "due_date_rule": "before_next_hearing_3_days", "task_type": "drafting"},
            {"title": "File bail application", "description": "Finalize annexures and file before listing.", "priority": "high", "due_date_rule": "before_next_hearing_1_day", "task_type": "filing"},
            {"title": "Collect witness contact details", "description": "Compile witness list and contact details for prep.", "priority": "medium", "due_date_rule": "from_today_5_days", "task_type": "investigation"},
            {"title": "Review charge sheet deadlines", "description": "Check statutory timeline and default bail implications.", "priority": "high", "due_date_rule": "charge_sheet_deadline", "task_type": "legal_analysis"},
        ],
        "default": [
            {"title": "Build chronology of incident and FIR", "description": "Prepare date-wise chronology for strategy.", "priority": "high", "due_date_rule": "from_today_2_days", "task_type": "legal_analysis"},
            {"title": "Collect all prosecution documents", "description": "Ensure FIR, statements and orders are available.", "priority": "high", "due_date_rule": "from_today_3_days", "task_type": "document_collection"},
            {"title": "Prepare hearing brief", "description": "Summarize key arguments and procedural issues.", "priority": "medium", "due_date_rule": "before_next_hearing_2_days", "task_type": "hearing_prep"},
            {"title": "Identify procedural violations", "description": "Track compliance gaps and legal consequences.", "priority": "high", "due_date_rule": "from_today_2_days", "task_type": "legal_compliance"},
        ],
    },
    "civil": {
        "default": [
            {"title": "Prepare list of relied documents", "description": "Organize and index documents for filing.", "priority": "high", "due_date_rule": "before_next_hearing_5_days", "task_type": "document_collection"},
            {"title": "Draft written statement", "description": "Prepare written statement with objections and facts.", "priority": "high", "due_date_rule": "from_today_25_days", "task_type": "drafting"},
            {"title": "Serve summons follow-up", "description": "Track service and proof status.", "priority": "high", "due_date_rule": "from_today_7_days", "task_type": "filing"},
            {"title": "Prepare replication strategy", "description": "Identify points requiring replication.", "priority": "medium", "due_date_rule": "from_today_30_days", "task_type": "legal_analysis"},
        ],
    },
    "writ": {
        "default": [
            {"title": "Compile impugned order and annexures", "description": "Create complete annexure bundle for writ.", "priority": "high", "due_date_rule": "from_today_2_days", "task_type": "document_collection"},
            {"title": "Draft writ petition", "description": "Prepare grounds and reliefs under constitutional jurisdiction.", "priority": "high", "due_date_rule": "before_next_hearing_3_days", "task_type": "drafting"},
            {"title": "Prepare urgency mention note", "description": "Prepare short urgency note for listing.", "priority": "medium", "due_date_rule": "from_today_1_day", "task_type": "filing"},
            {"title": "Prepare precedent note", "description": "Collect binding precedents for maintainability and merits.", "priority": "medium", "due_date_rule": "from_today_4_days", "task_type": "research"},
        ],
    },
    "family": {
        "default": [
            {"title": "Prepare mediation brief", "description": "Summarize dispute points and settlement options.", "priority": "medium", "due_date_rule": "from_today_3_days", "task_type": "strategy"},
            {"title": "Collect financial disclosures", "description": "Gather income and expense details.", "priority": "high", "due_date_rule": "from_today_7_days", "task_type": "document_collection"},
            {"title": "Draft interim relief application", "description": "Prepare urgent interim relief submissions.", "priority": "high", "due_date_rule": "before_next_hearing_2_days", "task_type": "drafting"},
            {"title": "Prepare hearing note", "description": "Create concise hearing speaking points.", "priority": "medium", "due_date_rule": "before_next_hearing_1_day", "task_type": "hearing_prep"},
        ],
    },
    "consumer": {
        "default": [
            {"title": "Compile invoices and receipts", "description": "Collect purchase proof and payment records.", "priority": "high", "due_date_rule": "from_today_3_days", "task_type": "document_collection"},
            {"title": "Draft consumer complaint", "description": "Prepare complaint with deficiency details.", "priority": "high", "due_date_rule": "from_today_5_days", "task_type": "drafting"},
            {"title": "Prepare compensation matrix", "description": "Quantify claim heads and relief sought.", "priority": "medium", "due_date_rule": "from_today_7_days", "task_type": "legal_analysis"},
            {"title": "Prepare hearing bundle", "description": "Organize exhibits and chronology.", "priority": "medium", "due_date_rule": "before_next_hearing_2_days", "task_type": "hearing_prep"},
        ],
    },
    "corporate": {
        "default": [
            {"title": "Collect board resolutions", "description": "Gather authorization and corporate approvals.", "priority": "high", "due_date_rule": "from_today_3_days", "task_type": "document_collection"},
            {"title": "Review contractual obligations", "description": "Map key clauses and breach exposure.", "priority": "high", "due_date_rule": "from_today_5_days", "task_type": "legal_analysis"},
            {"title": "Draft response/notice", "description": "Prepare legal response for opposite side.", "priority": "high", "due_date_rule": "from_today_7_days", "task_type": "drafting"},
            {"title": "Prepare hearing brief", "description": "Create concise brief for upcoming listing.", "priority": "medium", "due_date_rule": "before_next_hearing_2_days", "task_type": "hearing_prep"},
        ],
    },
    "labour": {
        "default": [
            {"title": "Compile employment record", "description": "Collect appointment and payroll records.", "priority": "high", "due_date_rule": "from_today_5_days", "task_type": "document_collection"},
            {"title": "Draft statement of claim", "description": "Prepare factual and legal claim statement.", "priority": "high", "due_date_rule": "from_today_7_days", "task_type": "drafting"},
            {"title": "Prepare settlement position", "description": "Define acceptable settlement range.", "priority": "medium", "due_date_rule": "from_today_10_days", "task_type": "strategy"},
            {"title": "Prepare hearing notes", "description": "Create arguments for next hearing.", "priority": "medium", "due_date_rule": "before_next_hearing_2_days", "task_type": "hearing_prep"},
        ],
    },
    "appeal": {
        "default": [
            {"title": "Apply for certified copy of impugned order", "description": "Obtain certified copy for appeal set.", "priority": "high", "due_date_rule": "from_today_2_days", "task_type": "document_collection"},
            {"title": "Prepare limitation computation", "description": "Compute appeal limitation and condonation risk.", "priority": "high", "due_date_rule": "from_today_3_days", "task_type": "legal_analysis"},
            {"title": "Draft memorandum of appeal", "description": "Prepare appeal grounds and prayer.", "priority": "high", "due_date_rule": "from_today_10_days", "task_type": "drafting"},
            {"title": "Prepare stay application", "description": "Draft interim stay prayer if needed.", "priority": "medium", "due_date_rule": "before_next_hearing_3_days", "task_type": "drafting"},
        ],
    },
}


def resolve_templates(case_type: Optional[str], stage: Optional[str]) -> List[Dict[str, str]]:
    ct = (case_type or "").strip().lower()
    st = (stage or "").strip().lower()
    type_bucket = TASK_TEMPLATES.get(ct)
    if not type_bucket:
        return TASK_TEMPLATES["criminal"]["default"]
    return type_bucket.get(st, type_bucket.get("default", []))


def resolve_due_date(rule: str, case: Any, today: Optional[date] = None) -> Optional[date]:
    if not rule:
        return None
    base_today = today or date.today()
    parts = rule.split("_")

    next_hearing = parse_flexible_date(getattr(case, "next_hearing", None))
    arrest = parse_flexible_date(getattr(case, "arrest_date", None))
    fir = parse_flexible_date(getattr(case, "fir_date", None))

    if rule.startswith("before_next_hearing_") and next_hearing:
        days = int(parts[-2])
        return next_hearing - timedelta(days=days)
    if rule.startswith("from_today_"):
        days = int(parts[-2])
        return base_today + timedelta(days=days)
    if rule.startswith("from_arrest_") and arrest:
        days = int(parts[-2])
        return arrest + timedelta(days=days)
    if rule.startswith("from_fir_") and fir:
        days = int(parts[-2])
        return fir + timedelta(days=days)
    if rule == "charge_sheet_deadline":
        return compute_charge_sheet_deadline(case)

    return None
