"""Case strength calculation and recommendation engine — rule-based, no AI needed."""

import json
from datetime import datetime, date


def _parse_date(d: str | None) -> date | None:
    if not d:
        return None
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(d, fmt).date()
        except ValueError:
            continue
    return None


def calculate_strength(case) -> int:
    """Calculate case strength from 0-100 based on available data."""
    score = 0

    # Procedural checklist filled (+10)
    checklist_fields = [
        case.checklist_41a_notice,
        case.checklist_grounds_of_arrest,
        case.checklist_magistrate_24hrs,
        case.checklist_remand_case_diary,
        case.checklist_independent_witness,
    ]
    filled = sum(1 for f in checklist_fields if f and f != "unknown")
    if filled > 0:
        score += 10  # Checklist partially or fully filled

    # Each "no" answer = a potential loophole ground
    nos = sum(1 for f in checklist_fields if f == "no")
    score += nos * 6  # Up to 30 points from procedural violations

    # FIR delay detected (+8)
    incident = _parse_date(getattr(case, "incident_date", None))
    fir = _parse_date(getattr(case, "fir_date", None))
    if incident and fir and (fir - incident).days > 0:
        score += 8

    # Charge sheet deadline exceeded (+15)
    arrest = _parse_date(getattr(case, "arrest_date", None))
    cs = _parse_date(getattr(case, "charge_sheet_date", None))
    if arrest:
        # Check if any section is >7 years (90-day limit) else 60-day limit
        deadline_days = 90  # default for serious
        sections_json = getattr(case, "applicable_sections", None)
        if sections_json:
            try:
                sections = json.loads(sections_json) if isinstance(sections_json, str) else sections_json
                from app.utils.sections_db import classify_sections
                classified = classify_sections(sections)
                has_over7 = any(s.get("over7Years") for s in classified)
                deadline_days = 90 if has_over7 else 60
            except Exception:
                pass
        if cs:
            days_to_cs = (cs - arrest).days if isinstance(cs, date) else 0
            cs_date = _parse_date(cs) if isinstance(cs, str) else cs
            if cs_date:
                days_to_cs = (cs_date - arrest).days
            if days_to_cs > deadline_days:
                score += 15
        else:
            # No charge sheet filed — check if deadline passed
            today = date.today()
            days_in_custody = (today - arrest).days
            if days_in_custody > deadline_days:
                score += 15

    # Documents uploaded (+3 each, max +15)
    doc_count = len(case.documents) if case.documents else 0
    score += min(doc_count * 3, 15)

    # FIR uploaded and analyzed (+15)
    if case.documents:
        for doc in case.documents:
            dtype = (doc.doc_type or "").lower()
            cat = (doc.document_category or "").lower()
            if "fir" in dtype or "fir" in cat:
                score += 15 if doc.status == "analyzed" else 5
                break

    # Loopholes found from analysis (+2 each max +10)
    loophole_count = sum(1 for r in (case.analysis_results or []) if r.result_type == "loophole")
    score += min(loophole_count * 2, 10)

    return min(score, 100)


def calculate_dates(case) -> dict:
    """Calculate derived date fields."""
    result = {
        "firDelayDays": None,
        "custodyDays": None,
        "chargeSheetDeadlineDays": None,
        "daysToNextHearing": None,
    }
    today = date.today()

    incident = _parse_date(getattr(case, "incident_date", None))
    fir = _parse_date(getattr(case, "fir_date", None))
    arrest = _parse_date(getattr(case, "arrest_date", None))
    cs = _parse_date(getattr(case, "charge_sheet_date", None))
    nh = _parse_date(getattr(case, "next_hearing", None))

    if incident and fir:
        result["firDelayDays"] = (fir - incident).days

    if arrest:
        result["custodyDays"] = (today - arrest).days

        # Determine deadline
        deadline_days = 90
        sections_json = getattr(case, "applicable_sections", None)
        if sections_json:
            try:
                sections = json.loads(sections_json) if isinstance(sections_json, str) else sections_json
                from app.utils.sections_db import classify_sections
                classified = classify_sections(sections)
                has_over7 = any(s.get("over7Years") for s in classified)
                deadline_days = 90 if has_over7 else 60
            except Exception:
                pass
        if not cs:
            result["chargeSheetDeadlineDays"] = deadline_days - (today - arrest).days
        else:
            cs_date = _parse_date(cs) if isinstance(cs, str) else cs
            if cs_date:
                filed_in = (cs_date - arrest).days
                result["chargeSheetDeadlineDays"] = deadline_days - filed_in

    if nh:
        result["daysToNextHearing"] = (nh - today).days

    return result


def generate_recommendations(case) -> list[dict]:
    """Generate rule-based recommendations based on case state."""
    recs = []
    dismissed = []
    if case.dismissed_recommendations:
        try:
            dismissed = json.loads(case.dismissed_recommendations)
        except (json.JSONDecodeError, TypeError):
            dismissed = []

    today = date.today()

    doc_types_uploaded = set()
    if case.documents:
        for doc in case.documents:
            dtype = (doc.doc_type or "").lower()
            cat = (doc.document_category or "").lower()
            doc_types_uploaded.add(dtype)
            doc_types_uploaded.add(cat)

    has_fir = "fir" in doc_types_uploaded
    has_charge_sheet = "charge sheet" in doc_types_uploaded or "chargesheet" in doc_types_uploaded
    has_witness = "witness" in doc_types_uploaded or "witness statement" in doc_types_uploaded
    has_medical = "medical" in doc_types_uploaded or "medical report" in doc_types_uploaded

    analysis_count = len(case.analysis_results) if case.analysis_results else 0
    task_count = len(case.tasks) if case.tasks else 0
    draft_count = len(case.drafts) if case.drafts else 0

    nh = _parse_date(getattr(case, "next_hearing", None))
    days_to_hearing = (nh - today).days if nh else None

    cs = _parse_date(getattr(case, "charge_sheet_date", None))

    # Rule 1: FIR uploaded but no charge sheet, and CS date in past
    r1_id = "upload-charge-sheet"
    if has_fir and not has_charge_sheet and not cs and r1_id not in dismissed:
        recs.append({
            "id": r1_id,
            "action": "Upload the Charge Sheet",
            "reason": "We need to verify whether the 90-day deadline was met. This could be your strongest argument.",
            "button": "Upload Document",
            "tab": "documents",
        })

    # Rule 2: 41A violation but no witness statement
    r2_id = "upload-witness-41a"
    has_41a_violation = getattr(case, "checklist_41a_notice", None) == "no"
    if has_41a_violation and not has_witness and r2_id not in dismissed:
        recs.append({
            "id": r2_id,
            "action": "Upload witness statements",
            "reason": "Contradiction between witness and FIR will significantly strengthen your bail argument.",
            "button": "Upload Document",
            "tab": "documents",
        })

    # Rule 3: Charge sheet mentions medical report but not uploaded
    r3_id = "upload-medical"
    if has_charge_sheet and not has_medical and r3_id not in dismissed:
        recs.append({
            "id": r3_id,
            "action": "Upload Medical Report",
            "reason": "The charge sheet may reference a medical report. Upload it to check for timeline inconsistencies.",
            "button": "Upload Document",
            "tab": "documents",
        })

    # Rule 4: Hearing within 3 days and no draft
    r4_id = "generate-draft"
    if days_to_hearing is not None and 0 <= days_to_hearing <= 3 and draft_count == 0 and r4_id not in dismissed:
        hearing_purpose = getattr(case, "hearing_purpose", "") or "hearing"
        recs.append({
            "id": r4_id,
            "action": f"Generate your {hearing_purpose} application now",
            "reason": f"Your hearing is in {days_to_hearing} day{'s' if days_to_hearing != 1 else ''}. The AI will use all identified loopholes as grounds.",
            "button": "Generate Draft",
            "tab": "draft",
        })

    # Rule 5: No FIR uploaded
    r5_id = "upload-fir"
    if not has_fir and r5_id not in dismissed:
        recs.append({
            "id": r5_id,
            "action": "Upload the FIR",
            "reason": "Upload your FIR to verify procedural compliance and detect loopholes automatically.",
            "button": "Upload Document",
            "tab": "documents",
        })

    # Rule 6: Case open 7+ days, no tasks
    r6_id = "add-tasks"
    created = _parse_date(case.created_at.strftime("%Y-%m-%d") if case.created_at else None)
    if created and (today - created).days >= 7 and task_count == 0 and r6_id not in dismissed:
        recs.append({
            "id": r6_id,
            "action": "Add preparation tasks",
            "reason": "No tasks have been added. Add preparation tasks for your upcoming hearing to stay on track.",
            "button": "Add Task",
            "tab": "tasks",
        })

    # Rule 7: Has documents but no analysis run
    r7_id = "run-analysis"
    doc_count = len(case.documents) if case.documents else 0
    if doc_count > 0 and analysis_count == 0 and r7_id not in dismissed:
        recs.append({
            "id": r7_id,
            "action": "Run AI Analysis",
            "reason": f"You have {doc_count} document{'s' if doc_count != 1 else ''} uploaded but no analysis yet. Run analysis to find loopholes and contradictions.",
            "button": "Run Analysis",
            "tab": "analysis",
        })

    return recs


def detect_rule_based_loopholes(case) -> list[dict]:
    """Detect loopholes from intake data alone (no documents needed)."""
    loopholes = []

    # 41A violation
    if getattr(case, "checklist_41a_notice", None) == "no":
        severity = "high"
        # Strengthen if offence < 7 years
        sections_json = getattr(case, "applicable_sections", None)
        if sections_json:
            try:
                sections = json.loads(sections_json) if isinstance(sections_json, str) else sections_json
                from app.utils.sections_db import classify_sections
                classified = classify_sections(sections)
                all_under7 = all(not s.get("over7Years") for s in classified if s.get("code") != "Unknown")
                if all_under7 and classified:
                    severity = "critical"
            except Exception:
                pass
        loopholes.append({
            "result_type": "loophole",
            "severity": severity,
            "title": "Section 41A CrPC Violation — No Notice Before Arrest",
            "description": "The accused was not served a notice under Section 41A CrPC before arrest. Per the Supreme Court's directive in Arnesh Kumar vs State of Bihar (2014), police must issue a notice of appearance before arresting in cases punishable with less than 7 years.",
            "legal_basis": "Section 41A CrPC; Arnesh Kumar vs State of Bihar (2014) 8 SCC 273",
            "guidance": "File an application highlighting the non-compliance with Section 41A. This is a strong ground for bail, especially for offences under 7 years.",
            "document_ref": "Procedural Checklist",
            "page": 0,
            "source": "intake",
        })

    # Grounds of arrest not informed
    if getattr(case, "checklist_grounds_of_arrest", None) == "no":
        loopholes.append({
            "result_type": "loophole",
            "severity": "high",
            "title": "Grounds of Arrest Not Communicated",
            "description": "The accused was not informed of the grounds of arrest as mandated under Article 22(1) of the Constitution and Section 50 CrPC.",
            "legal_basis": "Article 22(1) Constitution of India; Section 50 CrPC; DK Basu vs State of West Bengal (1997) 1 SCC 416",
            "guidance": "This is a fundamental rights violation. Use this to argue that the arrest is illegal and unconstitutional.",
            "document_ref": "Procedural Checklist",
            "page": 0,
            "source": "intake",
        })

    # Not produced before magistrate within 24 hours
    if getattr(case, "checklist_magistrate_24hrs", None) == "no":
        loopholes.append({
            "result_type": "loophole",
            "severity": "high",
            "title": "Not Produced Before Magistrate Within 24 Hours",
            "description": "The accused was not produced before a magistrate within 24 hours of arrest as required under Article 22(2) of the Constitution and Section 167 CrPC.",
            "legal_basis": "Article 22(2) Constitution; Section 167 CrPC",
            "guidance": "This renders the continued detention illegal. Argue for immediate release on this constitutional violation.",
            "document_ref": "Procedural Checklist",
            "page": 0,
            "source": "intake",
        })

    # No remand case diary
    if getattr(case, "checklist_remand_case_diary", None) == "no":
        loopholes.append({
            "result_type": "loophole",
            "severity": "medium",
            "title": "Remand Without Case Diary",
            "description": "The remand application was not accompanied by a case diary. The Magistrate may have granted remand without proper application of mind.",
            "legal_basis": "Section 167 CrPC; CBI vs Anupam Kulkarni (1992) 3 SCC 141",
            "guidance": "Challenge the remand order as mechanical and without proper judicial scrutiny.",
            "document_ref": "Procedural Checklist",
            "page": 0,
            "source": "intake",
        })

    # No independent witness in panchnama
    if getattr(case, "checklist_independent_witness", None) == "no":
        loopholes.append({
            "result_type": "loophole",
            "severity": "medium",
            "title": "No Independent Witness in Search/Seizure Panchnama",
            "description": "The search/seizure panchnama was conducted without independent witnesses as required under Section 100(4) CrPC.",
            "legal_basis": "Section 100(4) CrPC; State of Rajasthan vs Rehman (1960) 2 SCR 855",
            "guidance": "Challenge the validity of search/seizure evidence. Argue that the panchnama lacks credibility.",
            "document_ref": "Procedural Checklist",
            "page": 0,
            "source": "intake",
        })

    # FIR delay
    incident = _parse_date(getattr(case, "incident_date", None))
    fir = _parse_date(getattr(case, "fir_date", None))
    if incident and fir:
        delay = (fir - incident).days
        if delay > 0:
            severity = "high" if delay > 2 else "medium"
            loopholes.append({
                "result_type": "loophole",
                "severity": severity,
                "title": f"FIR Delay — {delay} Days After Incident",
                "description": f"The FIR was filed {delay} day{'s' if delay != 1 else ''} after the alleged incident. Delayed FIR registration raises questions about the veracity of the complaint and allows for fabrication.",
                "legal_basis": "Thulia Kali vs State of Tamil Nadu (1972) 3 SCC 393; State of AP vs M Madhusudhan Rao (2008) 15 SCC 582",
                "guidance": f"Argue that the {delay}-day delay in FIR registration casts serious doubt on the prosecution's case. The delay suggests possible after-thought or fabrication.",
                "document_ref": "Case Dates",
                "page": 0,
                "source": "intake",
            })

    # Default bail — charge sheet deadline
    arrest = _parse_date(getattr(case, "arrest_date", None))
    cs = _parse_date(getattr(case, "charge_sheet_date", None))
    if arrest:
        deadline_days = 90
        sections_json = getattr(case, "applicable_sections", None)
        if sections_json:
            try:
                sections = json.loads(sections_json) if isinstance(sections_json, str) else sections_json
                from app.utils.sections_db import classify_sections
                classified = classify_sections(sections)
                has_over7 = any(s.get("over7Years") for s in classified)
                deadline_days = 90 if has_over7 else 60
            except Exception:
                pass

        today = date.today()
        if cs:
            cs_date = _parse_date(cs) if isinstance(cs, str) else cs
            if cs_date and (cs_date - arrest).days > deadline_days:
                over_by = (cs_date - arrest).days - deadline_days
                loopholes.append({
                    "result_type": "loophole",
                    "severity": "critical",
                    "title": f"Default Bail — Charge Sheet Filed {over_by} Days Late",
                    "description": f"The charge sheet was filed {(cs_date - arrest).days} days after arrest, exceeding the {deadline_days}-day statutory limit. The accused has an indefeasible right to default bail under Section 167(2) CrPC.",
                    "legal_basis": "Section 167(2) CrPC; Uday Mohanlal Acharya vs State of Maharashtra (2001) 5 SCC 453; Rakesh Kumar Paul vs State of Assam (2017) 15 SCC 67",
                    "guidance": "File an application for default bail immediately. This is an indefeasible right that cannot be taken away once it has accrued.",
                    "document_ref": "Case Dates",
                    "page": 0,
                    "source": "intake",
                })
        else:
            days_since_arrest = (today - arrest).days
            if days_since_arrest > deadline_days:
                over_by = days_since_arrest - deadline_days
                loopholes.append({
                    "result_type": "loophole",
                    "severity": "critical",
                    "title": f"Default Bail — No Charge Sheet After {days_since_arrest} Days",
                    "description": f"The accused has been in custody for {days_since_arrest} days and no charge sheet has been filed. The {deadline_days}-day limit under Section 167(2) CrPC has been exceeded by {over_by} days.",
                    "legal_basis": "Section 167(2) CrPC; Uday Mohanlal Acharya vs State of Maharashtra (2001) 5 SCC 453",
                    "guidance": "File for default bail as a matter of right. The right to default bail is indefeasible once the period has expired.",
                    "document_ref": "Case Dates",
                    "page": 0,
                    "source": "intake",
                })

    # Vague allegation for 498A — if the only section is 498A and case type is criminal
    sections_json = getattr(case, "applicable_sections", None)
    if sections_json:
        try:
            sections = json.loads(sections_json) if isinstance(sections_json, str) else sections_json
            section_strs = [str(s).lower().replace(" ", "") for s in sections]
            if "498a" in section_strs or "ipc498a" in section_strs:
                loopholes.append({
                    "result_type": "argument",
                    "severity": "medium",
                    "title": "Section 498A — Potential Vague Allegations",
                    "description": "Section 498A IPC is often invoked with general and vague allegations of cruelty. Courts have repeatedly held that non-specific allegations cannot sustain a charge under 498A.",
                    "legal_basis": "Arnesh Kumar vs State of Bihar (2014) 8 SCC 273; Rajesh Sharma vs State of UP (2017) 10 SCC 294",
                    "guidance": "Examine the FIR and complaint for vague/general allegations. If no specific incidents of cruelty are mentioned, argue for quashing under Section 482 CrPC.",
                    "document_ref": "Sections Applied",
                    "page": 0,
                    "source": "intake",
                })
        except Exception:
            pass

    return loopholes
