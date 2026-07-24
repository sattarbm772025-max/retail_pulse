from app.models.audit_log import AuditLog


def create_audit_log(
    db,
    company_id,
    user_id,
    action,
    ip_address="Unknown",
    browser="Unknown",
    commit=True,
    entity_type=None,
    entity_name=None,
    quantity_changed=None,
):

    log = AuditLog(
        company_id=company_id,
        user_id=user_id,
        action=action,
        ip_address=ip_address,
        browser=browser
        , entity_type=entity_type
        , entity_name=entity_name
        , quantity_changed=quantity_changed
    )

    db.add(log)
    if commit:
        db.commit()
