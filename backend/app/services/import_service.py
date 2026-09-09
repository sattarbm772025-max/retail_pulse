"""Staged CSV imports.  Rows are validated before any write; processing is partial-success.

Each accepted row uses the application's existing create service, which commits its own
transaction.  A failed row is rolled back and recorded, leaving previously imported rows
consistent and visible in the import result.
"""
import csv
import io
import json
import re
from datetime import datetime, timezone

from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy import func, or_

from app.models.category import Category
from app.models.customer import Customer
from app.models.import_batch import ImportBatch, ImportError
from app.models.product import Product
from app.models.sale import Sale
from app.models.user import User
from app.schemas.customer import CustomerPayload
from app.schemas.product import ProductCreate
from app.schemas.sale import SaleCreate, SaleItemInput
from app.services.audit_service import create_audit_log
from app.services.customer_service import create_customer
from app.services.product_service import create_product
from app.services.sale_service import create_sale

MAX_FILE_SIZE = 10 * 1024 * 1024
MAX_ROWS = 10_000
TYPES = {"PRODUCTS", "CUSTOMERS", "SALES"}
REQUIRED = {
    "PRODUCTS": {"product_name", "sku", "category", "unit_price", "stock_quantity"},
    "CUSTOMERS": {"name", "email", "phone"},
    "SALES": {"customer", "product_name", "quantity", "unit_price", "sale_date"},
}


def _key(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", value.strip().lower()).strip("_")


def _normalise_row(row: dict) -> dict:
    aliases = {"product": "product_name", "name": "name", "customer_name": "customer", "product_sku": "sku", "price": "unit_price", "stock": "stock_quantity", "invoice": "invoice_number"}
    return {aliases.get(_key(k), _key(k)): (v or "").strip() for k, v in row.items() if k}


def _parse(content: bytes) -> tuple[list[str], list[dict]]:
    try:
        reader = csv.DictReader(io.StringIO(content.decode("utf-8-sig")))
        if not reader.fieldnames:
            raise ValueError("The CSV must include a header row")
        rows = [_normalise_row(row) for row in reader]
    except (UnicodeDecodeError, csv.Error, ValueError) as error:
        raise HTTPException(status_code=422, detail=f"Invalid CSV file: {error}") from error
    if len(rows) > MAX_ROWS:
        raise HTTPException(status_code=422, detail=f"CSV cannot contain more than {MAX_ROWS:,} rows")
    return [_key(header) for header in reader.fieldnames], rows


def _batch(db, user, import_id: int) -> ImportBatch:
    batch = db.query(ImportBatch).filter(ImportBatch.id == import_id, ImportBatch.company_id == user.company_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Import batch not found")
    return batch


def _error(row_number, row, kind, message):
    return {"row_number": row_number, "row_data": json.dumps(row), "error_type": kind, "error_message": message}


def _decimal(value, label, positive=False, non_negative=False):
    try:
        number = float(value)
    except (TypeError, ValueError):
        raise ValueError(f"{label} must be a number")
    if positive and number <= 0:
        raise ValueError(f"{label} must be greater than zero")
    if non_negative and number < 0:
        raise ValueError(f"{label} cannot be negative")
    return number


def _row_errors(db, user, kind, rows):
    errors, seen = [], set()
    categories = {c.name.strip().lower(): c.id for c in db.query(Category).filter(Category.company_id == user.company_id).all()}
    products = db.query(Product).filter(Product.company_id == user.company_id).all()
    product_by_name = {p.name.strip().lower(): p for p in products}
    product_by_sku = {p.sku.strip().upper(): p for p in products}
    customers = db.query(Customer).filter(Customer.company_id == user.company_id, Customer.is_deleted == 0).all()
    customer_by_name = {c.full_name.strip().lower(): c for c in customers}
    customer_emails = {c.email.lower() for c in customers}
    customer_phones = {c.phone for c in customers}
    invoices = {x[0] for x in db.query(Sale.invoice_number).filter(Sale.company_id == user.company_id).all()}
    remaining = {p.id: p.stock_quantity for p in products}
    for index, row in enumerate(rows, start=2):
        try:
            if kind == "PRODUCTS":
                name, sku = row.get("product_name", ""), row.get("sku", "").upper()
                if not name or not sku: raise ValueError("Product Name and SKU are required")
                if sku in product_by_sku or ("sku", sku) in seen: raise ValueError("Duplicate SKU")
                if row.get("category", "").lower() not in categories: raise ValueError("Category does not exist in this company")
                _decimal(row.get("unit_price"), "Unit Price", positive=True); _decimal(row.get("stock_quantity"), "Stock Quantity", non_negative=True)
                seen.add(("sku", sku))
            elif kind == "CUSTOMERS":
                name, email, phone = row.get("name", ""), row.get("email", "").lower(), row.get("phone", "")
                if not name or not email or not phone: raise ValueError("Name, Email and Phone are required")
                if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email): raise ValueError("Email is invalid")
                if not re.fullmatch(r"[0-9+(). -]{5,30}", phone): raise ValueError("Phone is invalid")
                if email in customer_emails or phone in customer_phones or ("email", email) in seen or ("phone", phone) in seen: raise ValueError("Duplicate email or phone")
                seen.update({("email", email), ("phone", phone)})
            else:
                customer = customer_by_name.get(row.get("customer", "").lower())
                product = product_by_sku.get(row.get("sku", "").upper()) or product_by_name.get(row.get("product_name", row.get("product", "")).lower())
                if not customer: raise ValueError("Customer does not exist in this company")
                if not product: raise ValueError("Product does not exist in this company")
                qty = int(row.get("quantity", "0")); _decimal(row.get("unit_price"), "Unit Price", positive=True)
                if qty <= 0: raise ValueError("Quantity must be greater than zero")
                if qty > remaining[product.id]: raise ValueError(f"Quantity exceeds available stock ({remaining[product.id]})")
                date_value = row.get("sale_date", "")
                try: datetime.fromisoformat(date_value.replace("Z", "+00:00"))
                except ValueError: datetime.strptime(date_value, "%d/%m/%Y")
                invoice = row.get("invoice_number", "")
                if invoice and (invoice in invoices or ("invoice", invoice) in seen): raise ValueError("Duplicate invoice number")
                remaining[product.id] -= qty; seen.add(("invoice", invoice)) if invoice else None
        except (ValueError, TypeError) as error:
            message = str(error)
            errors.append(_error(index, row, "DUPLICATE" if "Duplicate" in message else "VALIDATION", message))
    return errors


def _serialize(batch, include_rows=False):
    data = {"id": batch.id, "import_type": batch.import_type, "filename": batch.filename, "status": batch.status, "total_records": batch.total_records, "successful_records": batch.successful_records, "failed_records": batch.failed_records, "duplicate_records": batch.duplicate_records, "valid_records": max(batch.total_records - batch.failed_records, 0), "created_at": batch.created_at, "completed_at": batch.completed_at}
    if include_rows:
        rows = json.loads(batch.source_data)
        data.update({"detected_columns": list(rows[0].keys()) if rows else [], "preview": rows[:10], "errors": [{"row_number": e.row_number, "error_type": e.error_type, "error_message": e.error_message, "row_data": json.loads(e.row_data or "{}") } for e in batch.errors]})
    return data


def upload(db, user, import_type, filename, content):
    kind = import_type.upper()
    if kind not in TYPES: raise HTTPException(status_code=422, detail="Import type must be PRODUCTS, CUSTOMERS, or SALES")
    if not filename.lower().endswith(".csv"): raise HTTPException(status_code=422, detail="Only CSV files are accepted")
    if not content or len(content) > MAX_FILE_SIZE: raise HTTPException(status_code=422, detail="CSV must be between 1 byte and 10 MB")
    headers, rows = _parse(content)
    batch = ImportBatch(company_id=user.company_id, import_type=kind, filename=filename, uploaded_by=user.id, source_data=json.dumps(rows), total_records=len(rows), status="UPLOADED")
    db.add(batch); db.commit(); db.refresh(batch)
    return validate(db, user, batch.id, headers)


def validate(db, user, import_id, headers=None):
    batch = _batch(db, user, import_id); rows = json.loads(batch.source_data)
    headers = headers or (list(rows[0].keys()) if rows else [])
    db.query(ImportError).filter(ImportError.import_id == batch.id).delete(); db.flush()
    missing = REQUIRED[batch.import_type] - set(headers)
    errors = [_error(0, {}, "COLUMN", f"Missing required columns: {', '.join(sorted(missing))}")] if missing else _row_errors(db, user, batch.import_type, rows)
    db.add_all([ImportError(import_id=batch.id, **item) for item in errors])
    batch.failed_records = len(errors); batch.duplicate_records = sum(item["error_type"] == "DUPLICATE" for item in errors); batch.successful_records = 0; batch.status = "FAILED" if missing else "VALIDATED"
    db.commit(); db.refresh(batch)
    return _serialize(batch, True)


def _date(value):
    try: return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError: return datetime.strptime(value, "%d/%m/%Y").replace(tzinfo=timezone.utc)


def _process(db, user, kind, row):
    if kind == "PRODUCTS":
        category = db.query(Category).filter(Category.company_id == user.company_id, func.lower(Category.name) == row["category"].lower()).first()
        return create_product(db, user, ProductCreate(name=row["product_name"], sku=row["sku"], category_id=category.id, unit_price=_decimal(row["unit_price"], "Unit Price", positive=True), cost_price=_decimal(row.get("cost_price", row["unit_price"]), "Cost Price", non_negative=True), stock_quantity=int(row["stock_quantity"]), brand=row.get("brand") or None, supplier=row.get("supplier") or None, unit_of_measure=row.get("unit_of_measure") or "Unit"))
    if kind == "CUSTOMERS":
        parts = row["name"].strip().split(maxsplit=1)
        return create_customer(db, user, CustomerPayload(first_name=parts[0], last_name=parts[1] if len(parts) > 1 else "-", email=row["email"], phone=row["phone"], customer_type=(row.get("customer_type") or "RETAIL"), address=row.get("address") or None, city=row.get("city") or None, state=row.get("state") or None, country=row.get("country") or None, postal_code=row.get("postal_code") or None))
    product = db.query(Product).filter(Product.company_id == user.company_id, or_(Product.sku == row.get("sku", "").upper(), func.lower(Product.name) == row.get("product_name", row.get("product", "")).lower())).first()
    customer = db.query(Customer).filter(Customer.company_id == user.company_id, Customer.is_deleted == 0, func.lower(Customer.full_name) == row["customer"].lower()).first()
    request = SaleCreate(customer_id=customer.id, sale_date=_date(row["sale_date"]), sales_channel=row.get("sales_channel") or "RETAIL_STORE", payment_method=row.get("payment_method") or "CASH", payment_status=row.get("payment_status") or "PAID", notes=row.get("notes") or None, items=[SaleItemInput(product_id=product.id, quantity=int(row["quantity"]), unit_price=_decimal(row["unit_price"], "Unit Price", positive=True), discount=_decimal(row.get("discount", 0), "Discount", non_negative=True), tax=_decimal(row.get("tax", 0), "Tax", non_negative=True))])
    return create_sale(db, user, request, invoice_number=row.get("invoice_number") or None)


def process(db, user, import_id):
    result = validate(db, user, import_id)
    if any(e["error_type"] == "COLUMN" for e in result["errors"]): raise HTTPException(status_code=422, detail="Required columns are missing; import is blocked")
    batch = _batch(db, user, import_id); rows = json.loads(batch.source_data); blocked = {e.row_number for e in batch.errors}; runtime_errors = []; success = 0; batch.status = "PROCESSING"; db.commit()
    for index, row in enumerate(rows, start=2):
        if index in blocked: continue
        try: _process(db, user, batch.import_type, row); success += 1
        except (HTTPException, ValidationError, ValueError, Exception) as error:
            db.rollback(); runtime_errors.append(_error(index, row, "PROCESSING", getattr(error, "detail", str(error))[:1000]))
    batch = _batch(db, user, import_id)
    db.add_all([ImportError(import_id=batch.id, **item) for item in runtime_errors]); batch.successful_records = success; batch.failed_records += len(runtime_errors); batch.status = "COMPLETED" if not batch.failed_records else "COMPLETED_WITH_ERRORS"; batch.completed_at = datetime.now(timezone.utc)
    create_audit_log(db, user.company_id, user.id, f"Data import {batch.status}: {batch.import_type} ({success} rows)", commit=False, entity_type="IMPORT", entity_name=batch.filename)
    db.commit(); db.refresh(batch)
    return _serialize(batch, True)


def history(db, user, page=1, page_size=10):
    query = db.query(ImportBatch).filter(ImportBatch.company_id == user.company_id); total = query.count(); rows = query.order_by(ImportBatch.created_at.desc()).offset((max(page, 1)-1)*page_size).limit(min(max(page_size, 1), 100)).all()
    users = {u.id: u.full_name for u in db.query(User).filter(User.id.in_([r.uploaded_by for r in rows] or [-1])).all()}
    return {"items": [{**_serialize(row), "uploaded_by_name": users.get(row.uploaded_by, "Unknown")} for row in rows], "page": page, "page_size": page_size, "total": total}


def detail(db, user, import_id): return _serialize(_batch(db, user, import_id), True)


def errors_csv(db, user, import_id):
    batch = _batch(db, user, import_id); output = io.StringIO(); writer = csv.writer(output); writer.writerow(["Row", "Type", "Error", "Data"])
    for error in batch.errors: writer.writerow([error.row_number, error.error_type, error.error_message, error.row_data])
    return output.getvalue(), batch.filename.rsplit(".", 1)[0] + "-errors.csv"
