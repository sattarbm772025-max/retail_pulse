"""Task 16 Data Quality & Reconciliation API."""

from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_role
from app.schemas.data_quality import IssueStatusUpdate
from app.services import data_quality_service

router = APIRouter(prefix="/data-quality", tags=["Data Quality"])
viewer = require_role("SUPER_ADMIN", "COMPANY_ADMIN", "ANALYST")
admin = require_role("SUPER_ADMIN", "COMPANY_ADMIN")


@router.get("/dashboard")
def quality_dashboard(db: Session = Depends(get_db), current_user=Depends(viewer)):
    """Company-scoped reconciliation KPI cards."""
    return data_quality_service.dashboard(db, current_user)


@router.post("/reconcile")
def reconcile(db: Session = Depends(get_db), current_user=Depends(admin)):
    """Run all configured reconciliation checks on existing business data."""
    return data_quality_service.run_reconciliation(db, current_user)


@router.get("/issues")
def issues(
    page: int = 1, page_size: int = 25, search: str | None = None,
    issue_type: str | None = None, severity: str | None = None,
    module: str | None = None, status: str | None = None,
    date_from: datetime | None = None, date_to: datetime | None = None,
    db: Session = Depends(get_db), current_user=Depends(viewer),
):
    return data_quality_service.list_issues(db, current_user, {
        "page": page, "page_size": page_size, "search": search,
        "issue_type": issue_type, "severity": severity, "module": module,
        "status": status, "date_from": date_from, "date_to": date_to,
    })


@router.get("/issues/{issue_id}")
def issue_detail(issue_id: int, db: Session = Depends(get_db), current_user=Depends(viewer)):
    return data_quality_service.issue_detail(db, current_user, issue_id)


@router.patch("/issues/{issue_id}")
def update_issue(issue_id: int, payload: IssueStatusUpdate, db: Session = Depends(get_db), current_user=Depends(admin)):
    return data_quality_service.update_issue_status(db, current_user, issue_id, payload.status, payload.resolution_note)


@router.get("/history")
def reconciliation_history(page: int = 1, page_size: int = 20, db: Session = Depends(get_db), current_user=Depends(viewer)):
    return data_quality_service.history(db, current_user, page, page_size)
