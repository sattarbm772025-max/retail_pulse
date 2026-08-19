from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_role
from app.services.analytics_service import (
    audit_dashboard,
    category_details,
    dashboard,
    product_analytics,
    product_details,
    sales_business_intelligence,
)

router = APIRouter(
    prefix="/analytics",
    tags=["Analytics"],
)

role = require_role(
    "SUPER_ADMIN",
    "COMPANY_ADMIN",
    "ANALYST",
)


# ============================================================
# TASK 10 - SALES BUSINESS INTELLIGENCE
# ============================================================


@router.get("/sales")
def sales_analytics(
    from_date: datetime | None = None,
    to_date: datetime | None = None,
    product_id: int | None = None,
    category_id: int | None = None,
    customer_id: int | None = None,
    brand: str | None = None,
    payment_method: str | None = None,
    interval: str = "daily",
    sort_by: str = "revenue",
    db: Session = Depends(get_db),
    current_user=Depends(role),
):
    """
    Task 10 sales analytics.

    Supports:
    - Date range
    - Product
    - Category
    - Customer
    - Brand
    - Payment method
    - Daily / weekly / monthly trend
    - Top products sorted by revenue or quantity
    """

    if interval not in {
        "daily",
        "weekly",
        "monthly",
    }:
        raise HTTPException(
            status_code=422,
            detail="Interval must be daily, weekly, or monthly",
        )

    if sort_by not in {
        "revenue",
        "quantity",
    }:
        raise HTTPException(
            status_code=422,
            detail="sort_by must be revenue or quantity",
        )

    if from_date and to_date and from_date > to_date:
        raise HTTPException(
            status_code=422,
            detail="From date cannot be after to date",
        )

    filters = {
        "from_date": from_date,
        "to_date": to_date,
        "product_id": product_id,
        "category_id": category_id,
        "customer_id": customer_id,
        "brand": brand,
        "payment_method": payment_method,
    }

    return sales_business_intelligence(
        db=db,
        user=current_user,
        filters=filters,
        interval=interval,
        sort_by=sort_by,
    )


# ============================================================
# DASHBOARD
# ============================================================


@router.get("/dashboard")
def get_dashboard(
    from_date: datetime | None = None,
    to_date: datetime | None = None,
    product_id: int | None = None,
    category_id: int | None = None,
    customer_id: int | None = None,
    brand: str | None = None,
    channel: str | None = None,
    payment_method: str | None = None,
    db: Session = Depends(get_db),
    current_user=Depends(role),
):
    """
    Main analytics dashboard.

    All sales-related dashboard data uses the same
    company-scoped filters.
    """

    if from_date and to_date and from_date > to_date:
        raise HTTPException(
            status_code=422,
            detail="From date cannot be after to date",
        )

    filters = {
        "from_date": from_date,
        "to_date": to_date,
        "product_id": product_id,
        "category_id": category_id,
        "customer_id": customer_id,
        "brand": brand,
        "channel": channel,
        "payment_method": payment_method,
    }

    result = dashboard(
        db,
        current_user,
        filters,
    )

    has_filters = any(value is not None for value in filters.values())

    audit_dashboard(
        db,
        current_user,
        ("Dashboard Filters Applied" if has_filters else "Dashboard Viewed"),
    )

    return result


# ============================================================
# EXPORT EVENT
# ============================================================


@router.post("/dashboard/export")
def export_dashboard(
    db: Session = Depends(get_db),
    current_user=Depends(role),
):
    """
    Records a dashboard export event.

    Actual filtered CSV/PDF generation will be handled
    separately.
    """

    audit_dashboard(
        db,
        current_user,
        "Report Exported: CSV/PDF",
    )

    return {
        "message": "Export event recorded",
    }


# ============================================================
# PDF EXPORT
# ============================================================


@router.get("/export/pdf")
def export_dashboard_pdf(
    db: Session = Depends(get_db),
    current_user=Depends(role),
):
    """
    Generate a company-scoped analytics PDF report.

    Current version exports the unfiltered dashboard.
    Filter-aware PDF export is a later Task 10 step.
    """

    from app.utils.pdf import build_pdf

    result = dashboard(
        db,
        current_user,
        {},
    )

    output = build_pdf(
        "RetailPulse Analytics Report",
        ["KPI", "Value"],
        [
            [
                name.replace("_", " ").title(),
                value,
            ]
            for name, value in result["kpis"].items()
        ],
    )

    audit_dashboard(
        db,
        current_user,
        "Report Exported: PDF",
    )

    return Response(
        content=output.getvalue(),
        media_type="application/pdf",
        headers={
            "Content-Disposition": ("attachment; " "filename=analytics-report.pdf")
        },
    )


# ============================================================
# PRODUCT ANALYTICS
# ============================================================


@router.get("/products")
def get_products(
    db: Session = Depends(get_db),
    current_user=Depends(role),
):
    return product_analytics(
        db,
        current_user,
    )


# ============================================================
# PRODUCT DETAILS
# ============================================================


@router.get("/products/{product_id}")
def get_product_details(
    product_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(role),
):
    result = product_details(
        db,
        current_user,
        product_id,
    )

    if result is None:
        raise HTTPException(
            status_code=404,
            detail="Product not found",
        )

    return result


# ============================================================
# CATEGORY DETAILS
# ============================================================


@router.get("/categories/{category_id}")
def get_category_details(
    category_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(role),
):
    result = category_details(
        db,
        current_user,
        category_id,
    )

    if result is None:
        raise HTTPException(
            status_code=404,
            detail="Category not found",
        )

    return result


# ============================================================
# TASK 10 - FILTERED CSV EXPORT
# ============================================================


@router.get("/sales/export/csv")
def export_sales_csv(
    from_date: datetime | None = None,
    to_date: datetime | None = None,
    product_id: int | None = None,
    category_id: int | None = None,
    customer_id: int | None = None,
    brand: str | None = None,
    payment_method: str | None = None,
    interval: str = "daily",
    sort_by: str = "revenue",
    db: Session = Depends(get_db),
    current_user=Depends(role),
):
    """
    Export Task 10 sales analytics as filtered CSV.

    Uses exactly the same filters as /analytics/sales.
    """

    if interval not in {
        "daily",
        "weekly",
        "monthly",
    }:
        raise HTTPException(
            status_code=422,
            detail="Interval must be daily, weekly, or monthly",
        )

    if sort_by not in {
        "revenue",
        "quantity",
    }:
        raise HTTPException(
            status_code=422,
            detail="sort_by must be revenue or quantity",
        )

    if from_date and to_date and from_date > to_date:
        raise HTTPException(
            status_code=422,
            detail="From date cannot be after to date",
        )

    filters = {
        "from_date": from_date,
        "to_date": to_date,
        "product_id": product_id,
        "category_id": category_id,
        "customer_id": customer_id,
        "brand": brand,
        "payment_method": payment_method,
    }

    result = sales_business_intelligence(
        db=db,
        user=current_user,
        filters=filters,
        interval=interval,
        sort_by=sort_by,
    )

    output = io.StringIO()
    writer = csv.writer(output)

    # --------------------------------------------------------
    # Summary
    # --------------------------------------------------------

    writer.writerow(["RetailPulse Sales Analytics"])
    writer.writerow([])

    writer.writerow(["SUMMARY"])
    writer.writerow(
        [
            "Metric",
            "Value",
        ]
    )

    summary = result["summary"]

    writer.writerow(
        [
            "Total Revenue",
            summary["total_revenue"],
        ]
    )

    writer.writerow(
        [
            "Total Orders",
            summary["total_orders"],
        ]
    )

    writer.writerow(
        [
            "Average Order Value",
            summary["average_order_value"],
        ]
    )

    writer.writerow(
        [
            "Total Items Sold",
            summary["total_items_sold"],
        ]
    )

    writer.writerow(
        [
            "Total Discount",
            summary["total_discount"],
        ]
    )

    writer.writerow(
        [
            "Total Tax",
            summary["total_tax"],
        ]
    )

    writer.writerow([])

    # --------------------------------------------------------
    # Trend
    # --------------------------------------------------------

    writer.writerow(["SALES TREND"])

    writer.writerow(
        [
            "Period",
            "Revenue",
            "Orders",
        ]
    )

    for row in result["trend"]:
        writer.writerow(
            [
                row["period"],
                row["revenue"],
                row["orders"],
            ]
        )

    writer.writerow([])

    # --------------------------------------------------------
    # Top Products
    # --------------------------------------------------------

    writer.writerow(["TOP PRODUCTS"])

    writer.writerow(
        [
            "Product ID",
            "Product",
            "Units Sold",
            "Revenue",
        ]
    )

    for row in result["products"]:
        writer.writerow(
            [
                row["id"],
                row["name"],
                row["units_sold"],
                row["revenue"],
            ]
        )

    writer.writerow([])

    # --------------------------------------------------------
    # Top Customers
    # --------------------------------------------------------

    writer.writerow(["TOP CUSTOMERS"])

    writer.writerow(
        [
            "Customer ID",
            "Customer",
            "Orders",
            "Total Spend",
            "Average Order Value",
        ]
    )

    for row in result["customers"]:
        writer.writerow(
            [
                row["id"],
                row["name"],
                row["orders"],
                row["total_spend"],
                row["average_order_value"],
            ]
        )

    writer.writerow([])

    # --------------------------------------------------------
    # Payment Methods
    # --------------------------------------------------------

    writer.writerow(["PAYMENT METHODS"])

    writer.writerow(
        [
            "Payment Method",
            "Transactions",
            "Revenue",
        ]
    )

    for row in result["payment_methods"]:
        writer.writerow(
            [
                row["name"],
                row["transactions"],
                row["revenue"],
            ]
        )

    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": (
                "attachment; " "filename=task10-sales-analytics.csv"
            )
        },
    )


# ============================================================
# TASK 10 - FILTERED PDF EXPORT
# ============================================================


@router.get("/sales/export/pdf")
def export_sales_pdf(
    from_date: datetime | None = None,
    to_date: datetime | None = None,
    product_id: int | None = None,
    category_id: int | None = None,
    customer_id: int | None = None,
    brand: str | None = None,
    payment_method: str | None = None,
    interval: str = "daily",
    sort_by: str = "revenue",
    db: Session = Depends(get_db),
    current_user=Depends(role),
):
    """
    Export Task 10 sales analytics as filtered PDF.

    Uses exactly the same filters as /analytics/sales.
    """

    if interval not in {
        "daily",
        "weekly",
        "monthly",
    }:
        raise HTTPException(
            status_code=422,
            detail="Interval must be daily, weekly, or monthly",
        )

    if sort_by not in {
        "revenue",
        "quantity",
    }:
        raise HTTPException(
            status_code=422,
            detail="sort_by must be revenue or quantity",
        )

    if from_date and to_date and from_date > to_date:
        raise HTTPException(
            status_code=422,
            detail="From date cannot be after to date",
        )

    filters = {
        "from_date": from_date,
        "to_date": to_date,
        "product_id": product_id,
        "category_id": category_id,
        "customer_id": customer_id,
        "brand": brand,
        "payment_method": payment_method,
    }

    result = sales_business_intelligence(
        db=db,
        user=current_user,
        filters=filters,
        interval=interval,
        sort_by=sort_by,
    )

    from app.utils.pdf import build_pdf

    summary = result["summary"]

    rows = [
        [
            "Total Revenue",
            f"{summary['total_revenue']:.2f}",
        ],
        [
            "Total Orders",
            summary["total_orders"],
        ],
        [
            "Average Order Value",
            f"{summary['average_order_value']:.2f}",
        ],
        [
            "Total Items Sold",
            summary["total_items_sold"],
        ],
        [
            "Total Discount",
            f"{summary['total_discount']:.2f}",
        ],
        [
            "Total Tax",
            f"{summary['total_tax']:.2f}",
        ],
    ]

    buffer = build_pdf(
        "RetailPulse Task 10 Sales Analytics",
        [
            "Metric",
            "Value",
        ],
        rows,
    )

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": (
                "attachment; " "filename=task10-sales-analytics.pdf"
            )
        },
    )

    # ============================================================


# TASK 10 - INDEPENDENT TREND
# ============================================================


@router.get("/sales/trend")
def sales_trend(
    from_date: datetime | None = None,
    to_date: datetime | None = None,
    product_id: int | None = None,
    category_id: int | None = None,
    customer_id: int | None = None,
    brand: str | None = None,
    payment_method: str | None = None,
    interval: str = "daily",
    db: Session = Depends(get_db),
    current_user=Depends(role),
):
    if interval not in {
        "daily",
        "weekly",
        "monthly",
    }:
        raise HTTPException(
            status_code=422,
            detail="Interval must be daily, weekly, or monthly",
        )

    if from_date and to_date and from_date > to_date:
        raise HTTPException(
            status_code=422,
            detail="From date cannot be after to date",
        )

    filters = {
        "from_date": from_date,
        "to_date": to_date,
        "product_id": product_id,
        "category_id": category_id,
        "customer_id": customer_id,
        "brand": brand,
        "payment_method": payment_method,
    }

    result = sales_business_intelligence(
        db=db,
        user=current_user,
        filters=filters,
        interval=interval,
        sort_by="revenue",
    )

    return result["trend"]


# ============================================================
# TASK 10 - INDEPENDENT PRODUCTS
# ============================================================


@router.get("/sales/products")
def sales_products(
    from_date: datetime | None = None,
    to_date: datetime | None = None,
    product_id: int | None = None,
    category_id: int | None = None,
    customer_id: int | None = None,
    brand: str | None = None,
    payment_method: str | None = None,
    sort_by: str = "revenue",
    db: Session = Depends(get_db),
    current_user=Depends(role),
):
    if sort_by not in {
        "revenue",
        "quantity",
    }:
        raise HTTPException(
            status_code=422,
            detail="sort_by must be revenue or quantity",
        )

    if from_date and to_date and from_date > to_date:
        raise HTTPException(
            status_code=422,
            detail="From date cannot be after to date",
        )

    filters = {
        "from_date": from_date,
        "to_date": to_date,
        "product_id": product_id,
        "category_id": category_id,
        "customer_id": customer_id,
        "brand": brand,
        "payment_method": payment_method,
    }

    result = sales_business_intelligence(
        db=db,
        user=current_user,
        filters=filters,
        interval="daily",
        sort_by=sort_by,
    )

    return result["products"]


# ============================================================
# TASK 10 - INDEPENDENT CUSTOMERS
# ============================================================


@router.get("/sales/customers")
def sales_customers(
    from_date: datetime | None = None,
    to_date: datetime | None = None,
    product_id: int | None = None,
    category_id: int | None = None,
    customer_id: int | None = None,
    brand: str | None = None,
    payment_method: str | None = None,
    db: Session = Depends(get_db),
    current_user=Depends(role),
):
    if from_date and to_date and from_date > to_date:
        raise HTTPException(
            status_code=422,
            detail="From date cannot be after to date",
        )

    filters = {
        "from_date": from_date,
        "to_date": to_date,
        "product_id": product_id,
        "category_id": category_id,
        "customer_id": customer_id,
        "brand": brand,
        "payment_method": payment_method,
    }

    result = sales_business_intelligence(
        db=db,
        user=current_user,
        filters=filters,
        interval="daily",
        sort_by="revenue",
    )

    return result["customers"]
