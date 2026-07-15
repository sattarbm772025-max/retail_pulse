from app.models.audit_log import AuditLog


def create_audit_log(
    db,
    company_id,
    user_id,
    action,
    ip_address="Unknown",
    browser="Unknown",
    commit=True,
):

    log = AuditLog(
        company_id=company_id,
        user_id=user_id,
        action=action,
        ip_address=ip_address,
        browser=browser
    )

    db.add(log)
    if commit:
        db.commit()
