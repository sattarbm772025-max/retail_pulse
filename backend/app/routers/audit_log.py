from datetime import datetime

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_role
from app.services import audit_log_service
from app.services.audit_service import create_audit_log
from app.utils.pdf import build_pdf

router = APIRouter(prefix="/audit-logs", tags=["Audit Logs"])
admin = require_role("SUPER_ADMIN", "COMPANY_ADMIN")


def filters(
    search=None,
    user_id=None,
    action=None,
    resource_type=None,
    status=None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
):
    return {
        "search": search,
        "user_id": user_id,
        "action": action,
        "resource_type": resource_type,
        "status": status,
        "date_from": date_from,
        "date_to": date_to,
    }


@router.get("/")
def logs(
    page: int = 1,
    page_size: int = 25,
    sort: str = "newest",
    search: str | None = None,
    user_id: int | None = None,
    action: str | None = None,
    resource_type: str | None = None,
    status: str | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    db: Session = Depends(get_db),
    current_user=Depends(admin),
):
    return audit_log_service.list_logs(
        db,
        current_user,
        page,
        page_size,
        sort,
        **filters(search, user_id, action, resource_type, status, date_from, date_to)
    )


@router.get("/export/csv")
def csv_export(
    search: str | None = None,
    user_id: int | None = None,
    action: str | None = None,
    resource_type: str | None = None,
    status: str | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    db: Session = Depends(get_db),
    current_user=Depends(admin),
):
    create_audit_log(db, current_user.company_id, current_user.id, "EXPORT", commit=False, entity_type="AUDIT_LOG", description="Exported audit logs as CSV")
    db.commit()
    return StreamingResponse(
        iter(
            audit_log_service.export_csv_chunks(db, current_user, **filters(search, user_id, action, resource_type, status, date_from, date_to))
        ),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=audit-logs.csv"},
    )


@router.delete("/clear")
def clear_logs(confirm: bool = False, db: Session = Depends(get_db), current_user=Depends(admin)):
    if not confirm:
        from fastapi import HTTPException
        raise HTTPException(status_code=422, detail="Set confirm=true to clear this company's audit records")
    return {"deleted": audit_log_service.clear_company_logs(db, current_user)}


@router.get("/export/pdf")
def pdf_export(
    search: str | None = None,
    user_id: int | None = None,
    action: str | None = None,
    resource_type: str | None = None,
    status: str | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    db: Session = Depends(get_db),
    current_user=Depends(admin),
):
    create_audit_log(db, current_user.company_id, current_user.id, "EXPORT", commit=False, entity_type="AUDIT_LOG", description="Exported audit logs as PDF")
    db.commit()
    return StreamingResponse(
        build_pdf(
            "RetailPulse Audit Log Report",
            ["User", "Action", "Type", "ID", "Description", "Time", "Status"],
            audit_log_service.export_rows(
                db,
                current_user,
                **filters(
                    search, user_id, action, resource_type, status, date_from, date_to
                )
            ),
        ),
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=audit-logs.pdf"},
    )


@router.get("/{log_id}")
def log_detail(log_id: int, db: Session = Depends(get_db), current_user=Depends(admin)):
    return audit_log_service.detail(db, current_user, log_id)
