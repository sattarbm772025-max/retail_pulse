from fastapi import APIRouter, Depends, File, Form, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_role
from app.services import import_service

router = APIRouter(prefix="/imports", tags=["Data Imports"])
admin = require_role("SUPER_ADMIN", "COMPANY_ADMIN")


@router.post("/upload")
async def upload_file(import_type: str = Form(...), file: UploadFile = File(...), db: Session = Depends(get_db), current_user=Depends(admin)):
    return import_service.upload(db, current_user, import_type, file.filename or "upload.csv", await file.read())


@router.post("/{import_id}/validate")
def validate_import(import_id: int, db: Session = Depends(get_db), current_user=Depends(admin)):
    return import_service.validate(db, current_user, import_id)


@router.post("/{import_id}/process")
def process_import(import_id: int, db: Session = Depends(get_db), current_user=Depends(admin)):
    return import_service.process(db, current_user, import_id)


@router.get("/history")
def import_history(page: int = 1, page_size: int = 10, db: Session = Depends(get_db), current_user=Depends(admin)):
    return import_service.history(db, current_user, page, page_size)


@router.get("/{import_id}/errors")
def download_errors(import_id: int, db: Session = Depends(get_db), current_user=Depends(admin)):
    content, filename = import_service.errors_csv(db, current_user, import_id)
    return StreamingResponse(iter([content]), media_type="text/csv", headers={"Content-Disposition": f"attachment; filename={filename}"})


@router.get("/{import_id}")
def import_detail(import_id: int, db: Session = Depends(get_db), current_user=Depends(admin)):
    return import_service.detail(db, current_user, import_id)
