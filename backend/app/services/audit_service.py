import json

from app.core.audit_context import audit_agent, audit_ip
from app.models.audit_log import AuditLog


def create_audit_log(
    db,
    company_id,
    user_id,
    action,
    ip_address=None,
    browser=None,
    commit=True,
    entity_type=None,
    entity_name=None,
    quantity_changed=None,
    resource_id=None,
    description=None,
    before_values=None,
    after_values=None,
    status="SUCCESS",
):

    log = AuditLog(
        company_id=company_id,
        user_id=user_id,
        action=action,
        ip_address=ip_address or audit_ip.get(),
        browser=browser or audit_agent.get(),
        entity_type=entity_type,
        entity_name=entity_name,
        quantity_changed=quantity_changed,
        resource_id=resource_id,
        description=description,
        before_values=json.dumps(before_values, default=str) if before_values is not None else None,
        after_values=json.dumps(after_values, default=str) if after_values is not None else None,
        status=status,
    )

    db.add(log)
    if commit:
        db.commit()
