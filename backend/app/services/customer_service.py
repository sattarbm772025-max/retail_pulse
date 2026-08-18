from datetime import datetime

from fastapi import HTTPException
from sqlalchemy import func, or_

from app.models.customer import Customer, CustomerPurchaseSummary, CustomerTimeline
from app.models.notification import Notification
from app.models.sale import Sale, SaleItem
from app.services.audit_service import create_audit_log


def _summary(db, customer_id: int) -> CustomerPurchaseSummary:
    summary = db.query(CustomerPurchaseSummary).filter_by(customer_id=customer_id).first()
    if summary is None:
        summary = CustomerPurchaseSummary(customer_id=customer_id)
        db.add(summary)
        db.flush()
    return summary


def _segment(summary: CustomerPurchaseSummary) -> str:
    if summary.total_revenue >= 100000 or summary.total_orders >= 20:
        return "VIP"
    if summary.total_orders >= 10:
        return "LOYAL"
    if summary.total_orders >= 2:
        return "REGULAR"
    return "NEW"


def _serialize(customer: Customer, summary: CustomerPurchaseSummary) -> dict:
    return {
        "id": customer.id, "customer_id": customer.customer_code, "full_name": customer.full_name,
        "email": customer.email, "phone": customer.phone, "customer_type": customer.customer_type,
        "status": customer.status, "segment": customer.segment, "address": customer.address,
        "city": customer.city, "state": customer.state, "country": customer.country,
        "preferred_sales_channel": customer.preferred_sales_channel, "created_at": customer.created_at,
        "total_orders": summary.total_orders, "total_revenue": summary.total_revenue,
        "quantity_purchased": summary.quantity_purchased, "average_order_value": summary.average_order_value,
        "first_purchase_at": summary.first_purchase_at, "last_purchase_at": summary.last_purchase_at,
    }


def _get_customer(db, user, customer_id: int) -> Customer:
    customer = db.query(Customer).filter(
        Customer.id == customer_id,
        Customer.company_id == user.company_id,
        Customer.is_deleted == 0,
    ).first()
    if customer is None:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer


def list_customers(db, user, search=None, customer_type=None, status=None, segment=None,
                   city=None, sort="name", page=1, page_size=10):
    query = db.query(Customer).filter(
        Customer.company_id == user.company_id,
        Customer.is_deleted == 0,
    )
    if search:
        term = f"%{search.strip()}%"
        query = query.filter(or_(Customer.full_name.ilike(term), Customer.customer_code.ilike(term), Customer.email.ilike(term), Customer.phone.ilike(term)))
    if customer_type:
        query = query.filter(Customer.customer_type == customer_type.upper())
    if status:
        query = query.filter(Customer.status == status.upper())
    if segment:
        query = query.filter(Customer.segment == segment.upper())
    if city:
        query = query.filter(Customer.city.ilike(f"%{city}%"))
    sorting = {"name": Customer.full_name.asc(), "recent": Customer.created_at.desc(), "since": Customer.created_at.desc(), "last_purchase": Customer.updated_at.desc(), "spent": Customer.updated_at.desc(), "orders": Customer.updated_at.desc()}
    page, page_size = max(page, 1), min(max(page_size, 1), 100)
    total = query.count()
    records = query.order_by(sorting.get(sort, sorting["name"])).offset((page - 1) * page_size).limit(page_size).all()
    return {"items": [_serialize(record, _summary(db, record.id)) for record in records], "page": page, "page_size": page_size, "total": total, "total_pages": max((total + page_size - 1) // page_size, 1)}


def customer_summary(db, user):
    customers = db.query(Customer).filter(
        Customer.company_id == user.company_id,
        Customer.is_deleted == 0,
    )
    summaries = db.query(CustomerPurchaseSummary).join(Customer, Customer.id == CustomerPurchaseSummary.customer_id).filter(Customer.company_id == user.company_id).all()
    return {"total_customers": customers.count(), "active_customers": customers.filter(Customer.status == "ACTIVE").count(), "inactive_customers": customers.filter(Customer.status == "INACTIVE").count(), "vip_customers": customers.filter(Customer.segment == "VIP").count(), "total_revenue": sum(row.total_revenue or 0 for row in summaries)}


def create_customer(db, user, payload):
    duplicate = db.query(Customer).filter(Customer.company_id == user.company_id, or_(Customer.email == payload.email, Customer.phone == payload.phone)).first()
    if duplicate:
        raise HTTPException(status_code=409, detail="Customer email or phone already exists in your company")
    sequence = db.query(Customer).filter(Customer.company_id == user.company_id).count() + 1
    customer = Customer(company_id=user.company_id, customer_code=f"CUS-{datetime.now().year}-{sequence:05d}", **payload.model_dump())
    db.add(customer); db.flush()
    summary = _summary(db, customer.id)
    db.add(CustomerTimeline(customer_id=customer.id, action="REGISTERED", description="Customer registered", performed_by=user.id))
    db.add(Notification(company_id=user.company_id, level="CUSTOMER", message=f"New customer registered: {customer.full_name}"))
    create_audit_log(db, user.company_id, user.id, "Customer Created", commit=False, entity_type="CUSTOMER", entity_name=customer.full_name)
    db.commit(); db.refresh(customer)
    return _serialize(customer, summary)


def update_customer(db, user, customer_id, payload):
    customer = _get_customer(db, user, customer_id)
    duplicate = db.query(Customer).filter(Customer.company_id == user.company_id, Customer.id != customer.id, or_(Customer.email == payload.email, Customer.phone == payload.phone)).first()
    if duplicate:
        raise HTTPException(status_code=409, detail="Customer email or phone already exists in your company")
    for key, value in payload.model_dump().items():
        setattr(customer, key, value)
    db.add(CustomerTimeline(customer_id=customer.id, action="UPDATED", description="Customer profile updated", performed_by=user.id))
    create_audit_log(db, user.company_id, user.id, "Customer Updated", commit=False, entity_type="CUSTOMER", entity_name=customer.full_name)
    db.commit()
    return _serialize(customer, _summary(db, customer.id))


def change_customer_status(db, user, customer_id: int, status: str, action: str):
    customer = _get_customer(db, user, customer_id)
    customer.status = status
    db.add(CustomerTimeline(customer_id=customer.id, action=action, description=f"Customer {status.lower()}", performed_by=user.id))
    create_audit_log(db, user.company_id, user.id, f"Customer {action.title()}", commit=False, entity_type="CUSTOMER", entity_name=customer.full_name)
    db.commit()
    return _serialize(customer, _summary(db, customer.id))


def soft_delete_customer(db, user, customer_id: int):
    customer = _get_customer(db, user, customer_id)
    customer.is_deleted = 1
    customer.status = "INACTIVE"
    db.add(
        CustomerTimeline(
            customer_id=customer.id,
            action="DELETED",
            description="Customer soft deleted",
            performed_by=user.id,
        )
    )
    create_audit_log(
        db,
        user.company_id,
        user.id,
        "Customer Deleted",
        commit=False,
        entity_type="CUSTOMER",
        entity_name=customer.full_name,
    )
    db.commit()
    return {"message": "Customer deleted"}


def recalculate_customer_summary(db, user, customer_id: int):
    """Calculate the customer totals from saved sales after edits/deletes."""
    customer = db.query(Customer).filter(
        Customer.id == customer_id,
        Customer.company_id == user.company_id,
    ).first()
    if not customer:
        return

    orders, revenue, first_purchase, last_purchase = db.query(
        func.count(Sale.id),
        func.coalesce(func.sum(Sale.total_amount), 0),
        func.min(Sale.sale_date),
        func.max(Sale.sale_date),
    ).filter(
        Sale.company_id == user.company_id,
        Sale.customer_id == customer_id,
    ).one()
    quantity = db.query(func.coalesce(func.sum(SaleItem.quantity), 0)).join(
        Sale,
        Sale.id == SaleItem.sale_id,
    ).filter(
        Sale.company_id == user.company_id,
        Sale.customer_id == customer_id,
    ).scalar()

    summary = _summary(db, customer_id)
    summary.total_orders = int(orders or 0)
    summary.total_revenue = revenue or 0
    summary.quantity_purchased = int(quantity or 0)
    summary.average_order_value = revenue / orders if orders else 0
    summary.first_purchase_at = first_purchase
    summary.last_purchase_at = last_purchase
    customer.segment = _segment(summary)


def customer_detail(db, user, customer_id):
    customer = _get_customer(db, user, customer_id)
    summary = _summary(db, customer.id)
    sales = db.query(Sale).filter(Sale.company_id == user.company_id, Sale.customer_id == customer.id).order_by(Sale.sale_date.desc()).limit(20).all()
    data = _serialize(customer, summary)
    data["recent_transactions"] = [{"invoice_number": sale.invoice_number, "date": sale.sale_date, "amount": sale.total_amount, "payment_status": sale.payment_status} for sale in sales]
    data["timeline"] = [{"action": row.action, "description": row.description, "created_at": row.created_at} for row in db.query(CustomerTimeline).filter(CustomerTimeline.customer_id == customer.id).order_by(CustomerTimeline.created_at.desc()).all()]
    return data


def record_sale_for_customer(db, user, sale, quantity):
    customer = _get_customer(db, user, sale.customer_id)
    summary = _summary(db, customer.id)
    was_new = summary.total_orders == 0
    summary.total_orders += 1; summary.total_revenue += sale.total_amount; summary.quantity_purchased += quantity
    summary.average_order_value = summary.total_revenue / summary.total_orders
    summary.first_purchase_at = summary.first_purchase_at or sale.sale_date; summary.last_purchase_at = sale.sale_date
    previous_segment = customer.segment; customer.segment = _segment(summary)
    db.add(CustomerTimeline(customer_id=customer.id, action="FIRST_PURCHASE" if was_new else "PURCHASE", description=f"Purchase recorded: {sale.invoice_number}", performed_by=user.id))
    if was_new:
        db.add(Notification(company_id=user.company_id, level="CUSTOMER", message=f"First purchase from {customer.full_name}"))
    if customer.segment == "VIP" and previous_segment != "VIP":
        db.add(Notification(company_id=user.company_id, level="CUSTOMER", message=f"{customer.full_name} reached VIP status"))
