"""Task 16 reconciliation checks over live RetailPulse business tables.

The service stores only issue metadata.  Sales, product, inventory and customer
facts remain in their existing tables and are read at reconciliation time.
"""

from datetime import datetime, timezone
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import String, func, or_
from sqlalchemy.orm import Session

from app.models.customer import Customer, CustomerPurchaseSummary
from app.models.data_quality import DataQualityIssue, ReconciliationRun
from app.models.inventory import Inventory, InventoryMovement
from app.models.product import Product
from app.models.sale import Sale, SaleItem
from app.models.user import User
from app.services.audit_service import create_audit_log


def _json_value(value):
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, datetime):
        return value.isoformat()
    return value


def _serialize_issue(issue: DataQualityIssue, user_name: str | None = None):
    return {
        "id": issue.id, "issue_type": issue.issue_type, "severity": issue.severity,
        "module": issue.module, "record_type": issue.record_type,
        "record_id": issue.record_id, "record_label": issue.record_label,
        "description": issue.description, "details": issue.details or {},
        "status": issue.status, "detected_at": issue.detected_at,
        "last_detected_at": issue.last_detected_at, "resolved_at": issue.resolved_at,
        "resolved_by": issue.resolved_by, "resolved_by_name": user_name,
        "resolution_note": issue.resolution_note, "previous_status": issue.previous_status,
    }


def _serialize_run(run: ReconciliationRun, user_name: str | None = None):
    return {
        "id": run.id, "started_at": run.started_at, "completed_at": run.completed_at,
        "triggered_by": run.triggered_by, "triggered_by_name": user_name,
        "records_checked": run.records_checked, "issues_detected": run.issues_detected,
        "issues_resolved": run.issues_resolved, "failed_checks": run.failed_checks,
        "status": run.status, "error_message": run.error_message,
    }


def _upsert_issue(db: Session, company_id: int, payload: dict) -> DataQualityIssue:
    """Keep one company-scoped issue per unresolved data problem."""
    now = datetime.now(timezone.utc)
    issue = db.query(DataQualityIssue).filter(
        DataQualityIssue.company_id == company_id,
        DataQualityIssue.dedupe_key == payload["dedupe_key"],
    ).first()
    if issue is None:
        issue = DataQualityIssue(company_id=company_id, detected_at=now, last_detected_at=now, **payload)
        db.add(issue)
        return issue
    issue.severity = payload["severity"]
    issue.module = payload["module"]
    issue.record_type = payload.get("record_type")
    issue.record_id = payload.get("record_id")
    issue.record_label = payload.get("record_label")
    issue.description = payload["description"]
    issue.details = payload["details"]
    issue.last_detected_at = now
    # A previously resolved/ignored issue becomes actionable again only if the
    # same mismatch is detected in a later reconciliation run.
    if issue.status in {"RESOLVED", "IGNORED"}:
        issue.previous_status = issue.status
        issue.status = "OPEN"
        issue.resolved_at = None
        issue.resolved_by = None
        issue.resolution_note = None
    return issue


def _issue(issue_type, severity, module, record_type, record_id, record_label, description, details):
    return {
        "issue_type": issue_type, "severity": severity, "module": module,
        "record_type": record_type, "record_id": record_id,
        "record_label": record_label, "description": description,
        "details": {key: _json_value(value) for key, value in details.items()},
        "dedupe_key": f"{issue_type}:{record_type}:{record_id}",
    }


def check_product_after_change(db: Session, user, product: Product):
    """Low-cost product check used after product updates and imports.

    This is intentionally targeted; the full data set is checked only by the
    manual reconciliation endpoint.
    """
    sku = (product.sku or "").strip().upper()
    if not (product.name or "").strip() or not sku or product.unit_price is None:
        _upsert_issue(db, user.company_id, _issue("MISSING_PRODUCT_DATA", "HIGH", "PRODUCTS", "PRODUCT", product.id, product.name or product.sku, "Product is missing a required name, SKU, or unit price.", {"name": product.name, "sku": product.sku, "unit_price": product.unit_price}))
    duplicates = db.query(Product.id).filter(Product.company_id == user.company_id, func.upper(Product.sku) == sku, Product.id != product.id).count()
    if sku and duplicates:
        _upsert_issue(db, user.company_id, _issue("DUPLICATE_SKU", "HIGH", "PRODUCTS", "PRODUCT", product.id, product.name, f"SKU {sku} is used by more than one product.", {"sku": sku, "duplicate_count": duplicates + 1}))


def check_inventory_after_change(db: Session, user, inventory: Inventory):
    """Low-cost movement-to-inventory check after a stock adjustment."""
    movement = db.query(InventoryMovement).filter(InventoryMovement.inventory_id == inventory.id).order_by(InventoryMovement.created_at.desc(), InventoryMovement.id.desc()).first()
    if movement and inventory.current_stock != movement.updated_quantity:
        _upsert_issue(db, user.company_id, _issue("INVENTORY_MOVEMENT_MISMATCH", "CRITICAL", "INVENTORY", "INVENTORY", inventory.id, inventory.product.name if inventory.product else f"Inventory {inventory.id}", "Current inventory does not match the latest stock movement result.", {"current_stock": inventory.current_stock, "expected_stock": movement.updated_quantity, "difference": inventory.current_stock - movement.updated_quantity, "movement_id": movement.id}))


def check_customer_after_change(db: Session, user, customer: Customer):
    """Low-cost mandatory-field validation after customer updates/imports."""
    if not (customer.full_name or "").strip() or not (customer.email or "").strip() or not (customer.phone or "").strip():
        _upsert_issue(db, user.company_id, _issue("MISSING_CUSTOMER_DATA", "MEDIUM", "CUSTOMERS", "CUSTOMER", customer.id, customer.full_name, "Customer is missing a required name, email, or phone value.", {"name": customer.full_name, "email": customer.email, "phone": customer.phone}))


def _collect_issues(db: Session, company_id: int):
    """Return (records_checked, issues) using existing operational data."""
    records_checked, issues = 0, []

    # Product integrity: legacy/imported records can miss required values even
    # though current API validation prevents it for new records.
    products = db.query(Product).filter(Product.company_id == company_id).all()
    records_checked += len(products)
    sku_groups = {}
    for product in products:
        sku_key = (product.sku or "").strip().upper()
        sku_groups.setdefault(sku_key, []).append(product)
        missing = not (product.name or "").strip() or not sku_key or product.unit_price is None
        if missing:
            issues.append(_issue("MISSING_PRODUCT_DATA", "HIGH", "PRODUCTS", "PRODUCT", product.id, product.name or product.sku, "Product is missing a required name, SKU, or unit price.", {"name": product.name, "sku": product.sku, "unit_price": product.unit_price}))
    for sku, duplicate_products in sku_groups.items():
        if sku and len(duplicate_products) > 1:
            for product in duplicate_products:
                issues.append(_issue("DUPLICATE_SKU", "HIGH", "PRODUCTS", "PRODUCT", product.id, product.name, f"SKU {sku} is used by more than one product.", {"sku": sku, "duplicate_product_ids": [item.id for item in duplicate_products]}))

    customers = db.query(Customer).filter(Customer.company_id == company_id, Customer.is_deleted == 0).all()
    records_checked += len(customers)
    for customer in customers:
        if not (customer.full_name or "").strip() or not (customer.email or "").strip() or not (customer.phone or "").strip():
            issues.append(_issue("MISSING_CUSTOMER_DATA", "MEDIUM", "CUSTOMERS", "CUSTOMER", customer.id, customer.full_name, "Customer is missing a required name, email, or phone value.", {"name": customer.full_name, "email": customer.email, "phone": customer.phone}))

    # Inventory and movement consistency. The latest movement's updated value
    # must agree with the present inventory quantity.
    inventories = db.query(Inventory).filter(Inventory.company_id == company_id).all()
    records_checked += len(inventories)
    for inventory in inventories:
        movements = db.query(InventoryMovement).filter(InventoryMovement.inventory_id == inventory.id).order_by(InventoryMovement.created_at.asc(), InventoryMovement.id.asc()).all()
        records_checked += len(movements)
        previous = None
        for movement in movements:
            if movement.updated_quantity != movement.previous_quantity + movement.quantity_changed:
                issues.append(_issue("INVALID_STOCK_MOVEMENT", "HIGH", "INVENTORY", "STOCK_MOVEMENT", movement.id, inventory.product.name if inventory.product else f"Inventory {inventory.id}", "Stock movement updated quantity does not equal previous quantity plus the movement.", {"previous_quantity": movement.previous_quantity, "quantity_changed": movement.quantity_changed, "updated_quantity": movement.updated_quantity, "inventory_id": inventory.id}))
            if previous is not None and movement.previous_quantity != previous:
                issues.append(_issue("MOVEMENT_SEQUENCE_MISMATCH", "MEDIUM", "INVENTORY", "STOCK_MOVEMENT", movement.id, inventory.product.name if inventory.product else f"Inventory {inventory.id}", "Stock movement previous quantity does not match the preceding movement's updated quantity.", {"expected_previous_quantity": previous, "actual_previous_quantity": movement.previous_quantity, "inventory_id": inventory.id}))
            previous = movement.updated_quantity
        if movements and inventory.current_stock != movements[-1].updated_quantity:
            issues.append(_issue("INVENTORY_MOVEMENT_MISMATCH", "CRITICAL", "INVENTORY", "INVENTORY", inventory.id, inventory.product.name if inventory.product else f"Inventory {inventory.id}", "Current inventory does not match the latest stock movement result.", {"current_stock": inventory.current_stock, "expected_stock": movements[-1].updated_quantity, "difference": inventory.current_stock - movements[-1].updated_quantity, "movement_id": movements[-1].id}))

    # Sales references: every sale item must point at an active product and a
    # sale with a selected customer must reference an active same-company one.
    sale_items = db.query(SaleItem, Sale, Product).join(Sale, Sale.id == SaleItem.sale_id).join(Product, Product.id == SaleItem.product_id).filter(Sale.company_id == company_id).all()
    records_checked += len(sale_items)
    for item, sale, product in sale_items:
        if product.status != "ACTIVE":
            issues.append(_issue("SALE_INACTIVE_PRODUCT", "HIGH", "SALES", "SALE_ITEM", item.id, sale.invoice_number, "Sale references a product that is currently inactive.", {"sale_id": sale.id, "invoice_number": sale.invoice_number, "product_id": product.id, "product_status": product.status}))
        if item.quantity > max(product.stock_quantity, 0):
            issues.append(_issue("SALE_STOCK_EXCEPTION", "MEDIUM", "SALES", "SALE_ITEM", item.id, sale.invoice_number, "Sale quantity is greater than the product's current stock; review the transaction and stock history.", {"sale_id": sale.id, "product_id": product.id, "sale_quantity": item.quantity, "current_stock": product.stock_quantity}))

    sales_with_customer = db.query(Sale, Customer).outerjoin(Customer, Customer.id == Sale.customer_id).filter(Sale.company_id == company_id, Sale.customer_id.isnot(None)).all()
    records_checked += len(sales_with_customer)
    for sale, customer in sales_with_customer:
        if customer is None or customer.company_id != company_id or customer.is_deleted or customer.status != "ACTIVE":
            issues.append(_issue("INVALID_SALE_CUSTOMER", "HIGH", "SALES", "SALE", sale.id, sale.invoice_number, "Sale references a missing, deleted, inactive, or cross-company customer.", {"customer_id": sale.customer_id, "invoice_number": sale.invoice_number, "customer_status": customer.status if customer else None}))

    # Customer summaries feed reporting. Compare their calculated totals with
    # the underlying sales so report totals are never trusted blindly.
    summaries = db.query(CustomerPurchaseSummary, Customer).join(Customer, Customer.id == CustomerPurchaseSummary.customer_id).filter(Customer.company_id == company_id).all()
    records_checked += len(summaries)
    for summary, customer in summaries:
        order_count, revenue = db.query(func.count(Sale.id), func.coalesce(func.sum(Sale.total_amount), 0)).filter(Sale.company_id == company_id, Sale.customer_id == customer.id).one()
        if int(summary.total_orders or 0) != int(order_count or 0) or Decimal(summary.total_revenue or 0) != Decimal(revenue or 0):
            issues.append(_issue("REPORT_TOTAL_MISMATCH", "HIGH", "REPORTING", "CUSTOMER", customer.id, customer.full_name, "Customer reporting totals do not match the underlying sales transactions.", {"summary_orders": summary.total_orders, "actual_orders": order_count, "summary_revenue": summary.total_revenue, "actual_revenue": revenue}))
    return records_checked, issues


def run_reconciliation(db: Session, user):
    execution = ReconciliationRun(company_id=user.company_id, triggered_by=user.id, status="RUNNING")
    db.add(execution)
    db.flush()
    try:
        records_checked, issues = _collect_issues(db, user.company_id)
        for issue in issues:
            _upsert_issue(db, user.company_id, issue)
        execution.records_checked = records_checked
        execution.issues_detected = len(issues)
        execution.status = "COMPLETED_WITH_ISSUES" if issues else "COMPLETED"
        execution.completed_at = datetime.now(timezone.utc)
        create_audit_log(db, user.company_id, user.id, "DATA_RECONCILIATION", commit=False, entity_type="DATA_QUALITY", resource_id=execution.id, description=f"Reconciliation completed: {records_checked} records checked, {len(issues)} issues detected.")
        db.commit()
        db.refresh(execution)
        return _serialize_run(execution)
    except Exception as error:
        db.rollback()
        failed = db.query(ReconciliationRun).filter(ReconciliationRun.id == execution.id, ReconciliationRun.company_id == user.company_id).first()
        if failed:
            failed.status = "FAILED"
            failed.error_message = "A reconciliation check could not be completed."
            failed.completed_at = datetime.now(timezone.utc)
            failed.failed_checks = 1
            db.commit()
        raise HTTPException(status_code=500, detail="Reconciliation could not be completed") from error


def dashboard(db: Session, user):
    base = db.query(DataQualityIssue).filter(DataQualityIssue.company_id == user.company_id)
    latest = db.query(ReconciliationRun).filter(ReconciliationRun.company_id == user.company_id).order_by(ReconciliationRun.started_at.desc()).first()
    return {
        "total_records_checked": latest.records_checked if latest else 0,
        "valid_records": max((latest.records_checked if latest else 0) - base.filter(DataQualityIssue.status.in_(["OPEN", "INVESTIGATING"])).count(), 0),
        "warnings": base.filter(DataQualityIssue.severity == "MEDIUM", DataQualityIssue.status.in_(["OPEN", "INVESTIGATING"])).count(),
        "errors": base.filter(DataQualityIssue.severity.in_(["HIGH", "CRITICAL"]), DataQualityIssue.status.in_(["OPEN", "INVESTIGATING"])).count(),
        "unresolved_issues": base.filter(DataQualityIssue.status.in_(["OPEN", "INVESTIGATING"])).count(),
        "last_reconciliation_time": latest.completed_at if latest else None,
        "last_status": latest.status if latest else None,
    }


def list_issues(db: Session, user, filters: dict):
    query = db.query(DataQualityIssue).filter(DataQualityIssue.company_id == user.company_id)
    if filters.get("search"):
        term = f"%{filters['search'].strip()}%"
        query = query.filter(or_(DataQualityIssue.description.ilike(term), DataQualityIssue.record_label.ilike(term), DataQualityIssue.issue_type.ilike(term), func.cast(DataQualityIssue.record_id, String).ilike(term)))
    for key, column in (("issue_type", DataQualityIssue.issue_type), ("severity", DataQualityIssue.severity), ("module", DataQualityIssue.module), ("status", DataQualityIssue.status)):
        if filters.get(key): query = query.filter(column == str(filters[key]).upper())
    if filters.get("date_from"): query = query.filter(DataQualityIssue.detected_at >= filters["date_from"])
    if filters.get("date_to"): query = query.filter(DataQualityIssue.detected_at <= filters["date_to"])
    page, page_size = max(int(filters.get("page", 1)), 1), min(max(int(filters.get("page_size", 25)), 1), 100)
    total = query.count()
    rows = query.order_by(DataQualityIssue.detected_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    users = {row.id: row.name for row in db.query(User).filter(User.id.in_([item.resolved_by for item in rows if item.resolved_by] or [-1])).all()}
    return {"items": [_serialize_issue(row, users.get(row.resolved_by)) for row in rows], "page": page, "page_size": page_size, "total": total, "total_pages": max((total + page_size - 1) // page_size, 1)}


def issue_detail(db: Session, user, issue_id: int):
    issue = db.query(DataQualityIssue).filter(DataQualityIssue.id == issue_id, DataQualityIssue.company_id == user.company_id).first()
    if not issue: raise HTTPException(status_code=404, detail="Data quality issue not found")
    resolver = db.query(User).filter(User.id == issue.resolved_by).first() if issue.resolved_by else None
    result = _serialize_issue(issue, resolver.name if resolver else None)
    # Inventory issues need sufficient live context for an administrator to
    # investigate without opening several unrelated screens.
    if issue.module == "INVENTORY" and issue.record_type == "INVENTORY" and issue.record_id:
        inventory = db.query(Inventory).filter(
            Inventory.id == issue.record_id,
            Inventory.company_id == user.company_id,
        ).first()
        if inventory:
            movements = db.query(InventoryMovement).filter(
                InventoryMovement.inventory_id == inventory.id
            ).order_by(InventoryMovement.created_at.desc()).limit(10).all()
            sales = db.query(Sale, SaleItem).join(SaleItem, SaleItem.sale_id == Sale.id).filter(
                Sale.company_id == user.company_id,
                SaleItem.product_id == inventory.product_id,
            ).order_by(Sale.sale_date.desc()).limit(10).all()
            result["related_record"] = {
                "product": inventory.product.name if inventory.product else None,
                "sku": inventory.product.sku if inventory.product else None,
                "current_inventory": inventory.current_stock,
                "available_inventory": inventory.available_stock,
                "reorder_level": inventory.reorder_level,
                "stock_movements": [
                    {"id": row.id, "type": row.movement_type, "previous": row.previous_quantity, "change": row.quantity_changed, "updated": row.updated_quantity, "reason": row.reason, "created_at": row.created_at}
                    for row in movements
                ],
                "related_sales": [
                    {"sale_id": sale.id, "invoice_number": sale.invoice_number, "sale_date": sale.sale_date, "quantity": item.quantity, "total_amount": sale.total_amount}
                    for sale, item in sales
                ],
            }
    return result


def update_issue_status(db: Session, user, issue_id: int, status: str, resolution_note: str | None):
    issue = db.query(DataQualityIssue).filter(DataQualityIssue.id == issue_id, DataQualityIssue.company_id == user.company_id).first()
    if not issue: raise HTTPException(status_code=404, detail="Data quality issue not found")
    if status in {"RESOLVED", "IGNORED"} and not (resolution_note or "").strip():
        raise HTTPException(status_code=422, detail="A resolution note is required when resolving or ignoring an issue")
    previous = issue.status
    issue.previous_status = previous
    issue.status = status
    issue.resolution_note = resolution_note.strip() if resolution_note else None
    issue.resolved_by = user.id if status in {"RESOLVED", "IGNORED"} else None
    issue.resolved_at = datetime.now(timezone.utc) if status in {"RESOLVED", "IGNORED"} else None
    create_audit_log(db, user.company_id, user.id, "DATA_QUALITY_ISSUE_UPDATED", commit=False, entity_type="DATA_QUALITY_ISSUE", resource_id=issue.id, description=f"Data quality issue changed from {previous} to {status}.", before_values={"status": previous}, after_values={"status": status, "resolution_note": issue.resolution_note})
    db.commit(); db.refresh(issue)
    return _serialize_issue(issue, user.name if issue.resolved_by else None)


def history(db: Session, user, page: int, page_size: int):
    page, page_size = max(page, 1), min(max(page_size, 1), 100)
    query = db.query(ReconciliationRun).filter(ReconciliationRun.company_id == user.company_id)
    total = query.count(); rows = query.order_by(ReconciliationRun.started_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    users = {person.id: person.name for person in db.query(User).filter(User.id.in_([row.triggered_by for row in rows if row.triggered_by] or [-1])).all()}
    return {"items": [_serialize_run(row, users.get(row.triggered_by)) for row in rows], "page": page, "page_size": page_size, "total": total, "total_pages": max((total + page_size - 1) // page_size, 1)}
