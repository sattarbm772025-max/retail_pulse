import csv
import io
import json
from datetime import datetime

from fastapi import HTTPException
from sqlalchemy import String, cast, or_

from app.models.audit_log import AuditLog
from app.models.user import User


def _query(db, user, search=None, user_id=None, action=None, resource_type=None, status=None, date_from=None, date_to=None):
    query = db.query(AuditLog).join(User, User.id == AuditLog.user_id).filter(AuditLog.company_id == user.company_id)
    if search:
        term = f"%{search.strip()}%"
        query = query.filter(or_(User.name.ilike(term), AuditLog.action.ilike(term), AuditLog.entity_type.ilike(term), AuditLog.entity_name.ilike(term), AuditLog.description.ilike(term), cast(AuditLog.resource_id, String).ilike(term)))
    if user_id: query = query.filter(AuditLog.user_id == user_id)
    if action: query = query.filter(AuditLog.action == action.upper())
    if resource_type: query = query.filter(AuditLog.entity_type == resource_type.upper())
    if status: query = query.filter(AuditLog.status == status.upper())
    if date_from: query = query.filter(AuditLog.created_at >= date_from)
    if date_to: query = query.filter(AuditLog.created_at <= date_to)
    return query


def _row(log):
    return {"id": log.id, "user": {"id": log.user_id, "name": log.user.name, "email": log.user.email}, "action": log.action, "resource_type": log.entity_type, "resource_id": log.resource_id, "resource": log.entity_name, "description": log.description or log.action, "ip_address": log.ip_address, "user_agent": log.browser, "timestamp": log.created_at, "status": log.status, "before_values": json.loads(log.before_values) if log.before_values else None, "after_values": json.loads(log.after_values) if log.after_values else None}


def list_logs(db, user, page=1, page_size=25, sort="newest", **filters):
    query = _query(db, user, **filters)
    total = query.count()
    ordering = AuditLog.created_at.asc() if sort == "oldest" else AuditLog.created_at.desc()
    logs = query.order_by(ordering).offset((max(page, 1) - 1) * min(max(page_size, 1), 100)).limit(min(max(page_size, 1), 100)).all()
    return {"items": [_row(log) for log in logs], "total": total, "page": page, "page_size": page_size, "total_pages": max((total + page_size - 1) // page_size, 1)}


def detail(db, user, log_id):
    log = _query(db, user).filter(AuditLog.id == log_id).first()
    if not log: raise HTTPException(status_code=404, detail="Audit log not found")
    return _row(log)


def export_csv(db, user, **filters):
    output = io.StringIO(); writer = csv.writer(output)
    writer.writerow(["User", "Action", "Resource Type", "Resource ID", "Resource", "Description", "IP Address", "Timestamp", "Status"])
    for log in _query(db, user, **filters).order_by(AuditLog.created_at.desc()).limit(10_000).all():
        item = _row(log); writer.writerow([item["user"]["name"], item["action"], item["resource_type"], item["resource_id"], item["resource"], item["description"], item["ip_address"], item["timestamp"], item["status"]])
    return output.getvalue()


def export_rows(db, user, **filters):
    return [[item["user"]["name"], item["action"], item["resource_type"] or "-", item["resource_id"] or "-", item["description"], str(item["timestamp"]), item["status"]] for item in [_row(log) for log in _query(db, user, **filters).order_by(AuditLog.created_at.desc()).limit(10_000).all()]]
