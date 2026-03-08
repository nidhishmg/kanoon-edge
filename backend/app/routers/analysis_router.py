from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import User, Case, AnalysisResult
from app.schemas.analysis import AnalysisResultResponse
from app.utils.auth import get_current_user

router = APIRouter()

# Simulated AI analysis results (to be replaced with real AI pipeline)
SIMULATED_RESULTS = [
    {
        "result_type": "loophole",
        "severity": "high",
        "title": "Missing Mandatory Witness Signature on FIR",
        "description": "The FIR document lacks the mandatory witness signature as required under Section 154 of CrPC. This is a procedural violation that can be challenged.",
        "legal_basis": "Section 154 CrPC, Lalita Kumari vs. Govt. of UP (2014) 2 SCC 1",
        "guidance": "Challenge the admissibility of the FIR citing procedural irregularity. File a motion to suppress.",
        "document_ref": "FIR_Copy_2024.pdf",
        "page": 3,
    },
    {
        "result_type": "contradiction",
        "severity": "high",
        "title": "Timeline Discrepancy Between FIR and Witness Statement",
        "description": "The FIR states the incident occurred at 10:30 PM while the primary witness places it at 8:45 PM. This 1 hour 45 minute gap weakens the prosecution's timeline.",
        "legal_basis": "Section 145 Indian Evidence Act — Cross-examination as to previous statements",
        "guidance": "Use this contradiction during cross-examination to undermine witness credibility.",
        "document_ref": "Witness_Statement_1.pdf",
        "page": 5,
    },
    {
        "result_type": "loophole",
        "severity": "medium",
        "title": "Charge Sheet Filed Beyond Statutory Period",
        "description": "The charge sheet was filed 95 days after the FIR, exceeding the 90-day statutory limit for cases under Section 302 IPC.",
        "legal_basis": "Section 167(2) CrPC — Right to default bail",
        "guidance": "File application for default bail as a matter of right under the Hussainara Khatoon precedent.",
        "document_ref": "Charge_Sheet.pdf",
        "page": 1,
    },
    {
        "result_type": "argument",
        "severity": "medium",
        "title": "Medical Report Supports Alternative Theory",
        "description": "The medical examiner's report describes injuries as 'consistent with lateral impact on rough surface', which supports an accidental fall theory.",
        "legal_basis": "Section 45 Indian Evidence Act — Expert opinion",
        "guidance": "Present the medical report as evidence supporting alternative cause of injury.",
        "document_ref": "Medical_Report.pdf",
        "page": 7,
    },
    {
        "result_type": "gap",
        "severity": "low",
        "title": "No Independent Witness in Panchnama",
        "description": "The spot panchnama was conducted without any independent witness, relying solely on police personnel.",
        "legal_basis": "Section 100(4) CrPC — Requirement of independent witnesses",
        "guidance": "Challenge the validity of the panchnama and all evidence derived from it.",
        "document_ref": "FIR_Copy_2024.pdf",
        "page": 3,
    },
]


def _result_to_response(r: AnalysisResult) -> AnalysisResultResponse:
    return AnalysisResultResponse(
        id=r.id,
        type=r.result_type,
        severity=r.severity,
        title=r.title,
        description=r.description or "",
        legalBasis=r.legal_basis or "",
        guidance=r.guidance or "",
        documentRef=r.document_ref or "",
        page=r.page or 0,
    )


@router.get("/{case_id}", response_model=List[AnalysisResultResponse])
async def get_analysis(
    case_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get AI analysis results for a case."""
    case = db.query(Case).filter(Case.id == case_id, Case.user_id == current_user.id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")
    results = db.query(AnalysisResult).filter(AnalysisResult.case_id == case_id).all()
    return [_result_to_response(r) for r in results]


@router.post("/{case_id}/run", response_model=List[AnalysisResultResponse])
async def run_analysis(
    case_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Trigger AI analysis for a case (simulated)."""
    case = db.query(Case).filter(Case.id == case_id, Case.user_id == current_user.id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    # Clear previous results
    db.query(AnalysisResult).filter(AnalysisResult.case_id == case_id).delete()

    # Insert simulated analysis results
    created = []
    for data in SIMULATED_RESULTS:
        ar = AnalysisResult(case_id=case_id, **data)
        db.add(ar)
        created.append(ar)

    db.commit()
    for ar in created:
        db.refresh(ar)

    return [_result_to_response(r) for r in created]
