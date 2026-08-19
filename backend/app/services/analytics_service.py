from sqlalchemy import func, select
from sqlalchemy.orm import Session, aliased

from app.models.category import Category
from app.models.customer import Customer
from app.models.inventory import Inventory
from app.models.product import Product
from app.models.sale import Sale, SaleItem
from app.services.audit_service import create_audit_log

# ============================================================
# FILTERED SALES QUERY
# ============================================================


def _filtered_sales(
    db: Session,
    user,
    filters: dict,
):
    """
    Return a company-scoped Sale query.

    Supported filters:
    - from_date
    - to_date
    - product_id
    - category_id
    - customer_id
    - brand
    - payment_method
    - channel

    Product/category/brand filters use EXISTS so a sale
    containing multiple matching items is still returned only once.
    """

    filters = filters or {}

    query = db.query(Sale).filter(Sale.company_id == user.company_id)

    # --------------------------------------------------------
    # Date filters
    # --------------------------------------------------------

    if filters.get("from_date"):
        query = query.filter(Sale.sale_date >= filters["from_date"])

    if filters.get("to_date"):
        query = query.filter(Sale.sale_date <= filters["to_date"])

    # --------------------------------------------------------
    # Customer filter
    # --------------------------------------------------------

    if filters.get("customer_id"):
        query = query.filter(Sale.customer_id == filters["customer_id"])

    # --------------------------------------------------------
    # Payment method filter
    # --------------------------------------------------------

    if filters.get("payment_method"):
        query = query.filter(Sale.payment_method == filters["payment_method"])

    # --------------------------------------------------------
    # Sales channel filter
    # --------------------------------------------------------

    if filters.get("channel"):
        query = query.filter(Sale.sales_channel == filters["channel"])

    # --------------------------------------------------------
    # Product/category/brand filters
    #
    # IMPORTANT:
    # Use EXISTS instead of joining SaleItem into the main
    # Sale query. This prevents duplicate Sale rows.
    # --------------------------------------------------------

    item_product = aliased(Product)
    item_filters = []

    if filters.get("product_id"):
        item_filters.append(SaleItem.product_id == filters["product_id"])

    if filters.get("category_id"):
        item_filters.append(SaleItem.category_id == filters["category_id"])

    if filters.get("brand"):
        item_filters.append(item_product.brand.ilike(f"%{filters['brand']}%"))

    if item_filters:
        matching_item = (
            db.query(SaleItem.id)
            .join(
                item_product,
                item_product.id == SaleItem.product_id,
            )
            .filter(
                SaleItem.sale_id == Sale.id,
                item_product.company_id == user.company_id,
                *item_filters,
            )
            .correlate(Sale)
            .exists()
        )

        query = query.filter(matching_item)

    return query


# ============================================================
# DASHBOARD
# ============================================================


def dashboard(
    db: Session,
    user,
    filters: dict,
):
    """
    Company-scoped analytics dashboard.

    Sales KPIs and charts use the same filtered sales query.

    Inventory is intentionally NOT affected by:
    - date
    - customer
    - payment method
    - sales channel

    Inventory IS affected by:
    - product
    - category
    - brand
    """

    filters = filters or {}

    # --------------------------------------------------------
    # Filtered sales
    # --------------------------------------------------------

    sales = _filtered_sales(
        db,
        user,
        filters,
    )

    # --------------------------------------------------------
    # Sale IDs
    # --------------------------------------------------------

    sale_ids = sales.with_entities(Sale.id).subquery()

    # --------------------------------------------------------
    # Sale items
    # --------------------------------------------------------

    items = db.query(SaleItem).filter(SaleItem.sale_id.in_(select(sale_ids.c.id)))

    # --------------------------------------------------------
    # Products
    # --------------------------------------------------------

    products = db.query(Product).filter(Product.company_id == user.company_id)

    # --------------------------------------------------------
    # Inventory
    #
    # IMPORTANT:
    # Do NOT join Product here before applying filters.
    #
    # We use EXISTS for product/category/brand filtering.
    # This prevents the duplicate:
    #
    # JOIN products ...
    # JOIN products ...
    #
    # error.
    # --------------------------------------------------------

    inventory = db.query(Inventory).filter(Inventory.company_id == user.company_id)

    # --------------------------------------------------------
    # Inventory product/category/brand filters
    # --------------------------------------------------------

    inventory_product = aliased(Product)
    inventory_product_filters = []

    if filters.get("product_id"):
        inventory_product_filters.append(inventory_product.id == filters["product_id"])

    if filters.get("category_id"):
        inventory_product_filters.append(
            inventory_product.category_id == filters["category_id"]
        )

    if filters.get("brand"):
        inventory_product_filters.append(
            inventory_product.brand.ilike(f"%{filters['brand']}%")
        )

    if inventory_product_filters:
        matching_inventory_product = (
            db.query(inventory_product.id)
            .filter(
                inventory_product.id == Inventory.product_id,
                inventory_product.company_id == user.company_id,
                *inventory_product_filters,
            )
            .correlate(Inventory)
            .exists()
        )

        inventory = inventory.filter(matching_inventory_product)

    # --------------------------------------------------------
    # Product filters
    # --------------------------------------------------------

    if filters.get("product_id"):
        products = products.filter(Product.id == filters["product_id"])

    if filters.get("category_id"):
        products = products.filter(Product.category_id == filters["category_id"])

    if filters.get("brand"):
        products = products.filter(Product.brand.ilike(f"%{filters['brand']}%"))

    # ========================================================
    # REVENUE
    # ========================================================

    revenue = sales.with_entities(
        func.coalesce(
            func.sum(Sale.total_amount),
            0,
        )
    ).scalar()

    # ========================================================
    # ORDERS
    # ========================================================

    orders = sales.count()

    # ========================================================
    # UNITS SOLD
    # ========================================================

    units = items.with_entities(
        func.coalesce(
            func.sum(SaleItem.quantity),
            0,
        )
    ).scalar()

    # ========================================================
    # INVENTORY VALUE
    #
    # Product is joined ONLY ONCE here.
    # ========================================================

    inventory_value = (
        inventory.join(
            Product,
            Product.id == Inventory.product_id,
        )
        .with_entities(
            func.coalesce(
                func.sum(Inventory.available_stock * Product.cost_price),
                0,
            )
        )
        .scalar()
    )

    # ========================================================
    # REVENUE TREND
    # ========================================================

    revenue_trend = (
        items.join(
            Sale,
            Sale.id == SaleItem.sale_id,
        )
        .with_entities(
            func.date(Sale.sale_date),
            func.sum(SaleItem.total),
        )
        .group_by(func.date(Sale.sale_date))
        .order_by(func.date(Sale.sale_date))
        .all()
    )

    # ========================================================
    # TOP PRODUCTS
    # ========================================================

    top_products = (
        items.join(
            Product,
            Product.id == SaleItem.product_id,
        )
        .filter(Product.company_id == user.company_id)
        .with_entities(
            Product.name,
            func.sum(SaleItem.quantity),
        )
        .group_by(Product.name)
        .order_by(func.sum(SaleItem.quantity).desc())
        .limit(10)
        .all()
    )

    # ========================================================
    # CATEGORY REVENUE
    # ========================================================

    categories = (
        items.join(
            Product,
            Product.id == SaleItem.product_id,
        )
        .join(
            Category,
            Category.id == Product.category_id,
        )
        .filter(
            Product.company_id == user.company_id,
            Category.company_id == user.company_id,
        )
        .with_entities(
            Category.name,
            func.sum(SaleItem.total),
        )
        .group_by(Category.name)
        .order_by(func.sum(SaleItem.total).desc())
        .all()
    )

    # ========================================================
    # PAYMENT METHODS
    # ========================================================

    payments = (
        sales.with_entities(
            Sale.payment_method,
            func.sum(Sale.total_amount),
        )
        .group_by(Sale.payment_method)
        .all()
    )

    # ========================================================
    # SALES CHANNELS
    # ========================================================

    channels = (
        sales.with_entities(
            Sale.sales_channel,
            func.sum(Sale.total_amount),
        )
        .group_by(Sale.sales_channel)
        .all()
    )

    # ========================================================
    # INVENTORY BY CATEGORY
    #
    # Product is joined once in this independent query.
    # ========================================================

    inventory_categories = (
        inventory.join(
            Product,
            Product.id == Inventory.product_id,
        )
        .join(
            Category,
            Category.id == Product.category_id,
        )
        .filter(
            Product.company_id == user.company_id,
            Category.company_id == user.company_id,
        )
        .with_entities(
            Category.name,
            func.sum(Inventory.available_stock),
        )
        .group_by(Category.name)
        .all()
    )

    # ========================================================
    # STOCK STATUS
    # ========================================================

    stock_status = (
        inventory.with_entities(
            Inventory.stock_status,
            func.count(Inventory.id),
        )
        .group_by(Inventory.stock_status)
        .all()
    )

    # ========================================================
    # LOW STOCK
    # ========================================================

    low_stock = (
        inventory.join(
            Product,
            Product.id == Inventory.product_id,
        )
        .filter(
            Product.company_id == user.company_id,
            Inventory.stock_status == "LOW_STOCK",
        )
        .with_entities(
            Product.name,
            Product.sku,
            Inventory.available_stock,
            Inventory.reorder_level,
        )
        .order_by(Inventory.available_stock)
        .limit(10)
        .all()
    )

    # ========================================================
    # OUT OF STOCK
    # ========================================================

    out_of_stock = (
        inventory.join(
            Product,
            Product.id == Inventory.product_id,
        )
        .filter(
            Product.company_id == user.company_id,
            Inventory.stock_status == "OUT_OF_STOCK",
        )
        .with_entities(
            Product.name,
            Product.sku,
        )
        .limit(10)
        .all()
    )

    # ========================================================
    # RETURN DASHBOARD
    # ========================================================

    return {
        "kpis": {
            "total_revenue": float(revenue or 0),
            "total_orders": int(orders or 0),
            "products_sold": int(units or 0),
            "average_order_value": (float(revenue or 0) / orders if orders else 0),
            "inventory_value": float(inventory_value or 0),
            "low_stock_products": (
                inventory.filter(Inventory.stock_status == "LOW_STOCK").count()
            ),
            "out_of_stock_products": (
                inventory.filter(Inventory.stock_status == "OUT_OF_STOCK").count()
            ),
            "total_categories": (
                db.query(Category)
                .filter(Category.company_id == user.company_id)
                .count()
            ),
        },
        "revenue_trend": [
            {
                "date": str(date),
                "value": float(value or 0),
            }
            for date, value in revenue_trend
        ],
        "top_products": [
            {
                "name": name,
                "value": int(value or 0),
            }
            for name, value in top_products
        ],
        "categories": [
            {
                "name": name,
                "value": float(value or 0),
            }
            for name, value in categories
        ],
        "payments": [
            {
                "name": name,
                "value": float(value or 0),
            }
            for name, value in payments
        ],
        "channels": [
            {
                "name": name,
                "value": float(value or 0),
            }
            for name, value in channels
        ],
        "inventory_categories": [
            {
                "name": name,
                "value": int(value or 0),
            }
            for name, value in inventory_categories
        ],
        "stock_status": [
            {
                "name": name,
                "value": int(value or 0),
            }
            for name, value in stock_status
        ],
        "low_stock": [
            {
                "name": name,
                "sku": sku,
                "available": available,
                "reorder_level": reorder,
            }
            for (
                name,
                sku,
                available,
                reorder,
            ) in low_stock
        ],
        "out_of_stock": [
            {
                "name": name,
                "sku": sku,
            }
            for name, sku in out_of_stock
        ],
    }


# ============================================================
# PRODUCT ANALYTICS
# ============================================================


def product_analytics(
    db: Session,
    user,
):
    """
    Return product-level analytics for the current company.

    Sales are explicitly joined through Sale so that sales from
    another company can never be included accidentally.
    """

    rows = (
        db.query(
            Product.id,
            Product.name,
            Category.name.label("category"),
            Product.brand,
            func.coalesce(
                func.sum(SaleItem.quantity),
                0,
            ).label("units_sold"),
            func.coalesce(
                func.sum(SaleItem.total),
                0,
            ).label("revenue"),
            func.coalesce(
                Inventory.available_stock,
                0,
            ).label("stock"),
        )
        .outerjoin(
            SaleItem,
            SaleItem.product_id == Product.id,
        )
        .outerjoin(
            Sale,
            Sale.id == SaleItem.sale_id,
        )
        .outerjoin(
            Category,
            Category.id == Product.category_id,
        )
        .outerjoin(
            Inventory,
            (Inventory.product_id == Product.id)
            & (Inventory.company_id == user.company_id),
        )
        .filter(Product.company_id == user.company_id)
        .filter((Sale.id.is_(None)) | (Sale.company_id == user.company_id))
        .group_by(
            Product.id,
            Product.name,
            Category.name,
            Product.brand,
            Inventory.available_stock,
        )
        .order_by(func.sum(SaleItem.total).desc().nullslast())
        .all()
    )

    return [
        {
            "id": row.id,
            "name": row.name,
            "category": row.category,
            "brand": row.brand,
            "units_sold": int(row.units_sold or 0),
            "revenue": float(row.revenue or 0),
            "stock": int(row.stock or 0),
        }
        for row in rows
    ]


# ============================================================
# PRODUCT DETAILS
# ============================================================


def product_details(
    db: Session,
    user,
    product_id: int,
):
    """
    Return detailed analytics for one company-scoped product.
    """

    product = (
        db.query(Product)
        .filter(
            Product.company_id == user.company_id,
            Product.id == product_id,
        )
        .first()
    )

    if not product:
        return None

    inventory = (
        db.query(Inventory)
        .filter(
            Inventory.company_id == user.company_id,
            Inventory.product_id == product_id,
        )
        .first()
    )

    sales = (
        db.query(
            Sale.invoice_number,
            Sale.sale_date,
            SaleItem.quantity,
            SaleItem.unit_price,
            SaleItem.total,
        )
        .join(
            Sale,
            Sale.id == SaleItem.sale_id,
        )
        .filter(
            Sale.company_id == user.company_id,
            SaleItem.product_id == product_id,
        )
        .order_by(Sale.sale_date.desc())
        .all()
    )

    total_units = sum(int(s.quantity or 0) for s in sales)

    total_revenue = sum(float(s.total or 0) for s in sales)

    return {
        "id": product.id,
        "name": product.name,
        "sku": product.sku,
        "brand": product.brand,
        "description": product.description,
        "unit_price": float(product.unit_price or 0),
        "cost_price": float(product.cost_price or 0),
        "stock": (int(inventory.available_stock or 0) if inventory else 0),
        "reorder_level": (int(inventory.reorder_level or 0) if inventory else 0),
        "status": (inventory.stock_status if inventory else "UNKNOWN"),
        "total_units_sold": total_units,
        "total_revenue": total_revenue,
        "sales_history": [
            {
                "invoice": s.invoice_number,
                "date": (s.sale_date.isoformat() if s.sale_date else None),
                "quantity": int(s.quantity or 0),
                "price": float(s.unit_price or 0),
                "total": float(s.total or 0),
            }
            for s in sales
        ],
    }


# ============================================================
# CATEGORY DETAILS
# ============================================================


def category_details(
    db: Session,
    user,
    category_id: int,
):
    """
    Return detailed analytics for one company-scoped category.
    """

    category = (
        db.query(Category)
        .filter(
            Category.company_id == user.company_id,
            Category.id == category_id,
        )
        .first()
    )

    if not category:
        return None

    # --------------------------------------------------------
    # Products
    # --------------------------------------------------------

    products = (
        db.query(Product)
        .filter(
            Product.company_id == user.company_id,
            Product.category_id == category_id,
        )
        .all()
    )

    product_ids = [product.id for product in products]

    # --------------------------------------------------------
    # Inventory
    # --------------------------------------------------------

    if product_ids:
        inventory = (
            db.query(Inventory)
            .filter(
                Inventory.company_id == user.company_id,
                Inventory.product_id.in_(product_ids),
            )
            .all()
        )
    else:
        inventory = []

    # --------------------------------------------------------
    # Sales
    # --------------------------------------------------------

    sales = (
        db.query(
            SaleItem.quantity,
            SaleItem.total,
        )
        .join(
            Product,
            Product.id == SaleItem.product_id,
        )
        .join(
            Sale,
            Sale.id == SaleItem.sale_id,
        )
        .filter(
            Sale.company_id == user.company_id,
            Product.company_id == user.company_id,
            Product.category_id == category_id,
        )
        .all()
    )

    # --------------------------------------------------------
    # Totals
    # --------------------------------------------------------

    total_products = len(products)

    total_stock = sum(int(i.available_stock or 0) for i in inventory)

    total_units = sum(int(s.quantity or 0) for s in sales)

    total_revenue = sum(float(s.total or 0) for s in sales)

    # --------------------------------------------------------
    # Return
    # --------------------------------------------------------

    return {
        "id": category.id,
        "name": category.name,
        "description": category.description,
        "total_products": total_products,
        "total_stock": total_stock,
        "total_units_sold": total_units,
        "total_revenue": total_revenue,
        "products": [
            {
                "id": product.id,
                "name": product.name,
                "sku": product.sku,
                "brand": product.brand,
                "price": float(product.unit_price or 0),
            }
            for product in products
        ],
    }


# ============================================================
# AUDIT
# ============================================================


def audit_dashboard(
    db: Session,
    user,
    action: str,
):
    """
    Record dashboard analytics activity.
    """

    create_audit_log(
        db,
        user.company_id,
        user.id,
        action,
        commit=True,
        entity_type="DASHBOARD",
    )


# ============================================================
# TASK 10 - SALES BUSINESS INTELLIGENCE
# ============================================================


def sales_business_intelligence(
    db: Session,
    user,
    filters: dict,
    interval: str = "daily",
    sort_by: str = "revenue",
):
    """
    Task 10 Sales Business Intelligence.

    Supports:
    - Date filtering
    - Product filtering
    - Category filtering
    - Customer filtering
    - Brand filtering
    - Payment method filtering
    - Sales channel filtering
    - Daily trends
    - Weekly trends
    - Monthly trends
    - Top products by revenue
    - Top products by quantity
    - Top customers
    - Payment-method analytics
    """

    filters = filters or {}

    # --------------------------------------------------------
    # Validate interval
    # --------------------------------------------------------

    if interval not in {
        "daily",
        "weekly",
        "monthly",
    }:
        interval = "daily"

    # --------------------------------------------------------
    # Validate sort
    # --------------------------------------------------------

    if sort_by not in {
        "revenue",
        "quantity",
    }:
        sort_by = "revenue"

    # --------------------------------------------------------
    # Filtered sales
    # --------------------------------------------------------

    sales = _filtered_sales(
        db,
        user,
        filters,
    )

    # --------------------------------------------------------
    # Filtered sale IDs
    # --------------------------------------------------------

    sale_ids = sales.with_entities(Sale.id).subquery()

    # --------------------------------------------------------
    # Sale items
    # --------------------------------------------------------

    items = db.query(SaleItem).filter(SaleItem.sale_id.in_(select(sale_ids.c.id)))

    # ========================================================
    # SUMMARY
    # ========================================================

    (
        total_revenue,
        total_orders,
    ) = sales.with_entities(
        func.coalesce(
            func.sum(Sale.total_amount),
            0,
        ),
        func.count(Sale.id),
    ).one()

    (
        total_items,
        total_discount,
        total_tax,
    ) = items.with_entities(
        func.coalesce(
            func.sum(SaleItem.quantity),
            0,
        ),
        func.coalesce(
            func.sum(SaleItem.discount),
            0,
        ),
        func.coalesce(
            func.sum(SaleItem.tax),
            0,
        ),
    ).one()

    # ========================================================
    # TREND
    # ========================================================

    buckets = {
        "daily": func.date(Sale.sale_date),
        "weekly": func.date_trunc(
            "week",
            Sale.sale_date,
        ),
        "monthly": func.date_trunc(
            "month",
            Sale.sale_date,
        ),
    }

    bucket = buckets[interval]

    trend_rows = (
        sales.with_entities(
            bucket.label("period"),
            func.coalesce(
                func.sum(Sale.total_amount),
                0,
            ).label("revenue"),
            func.count(Sale.id).label("orders"),
        )
        .group_by(bucket)
        .order_by(bucket)
        .all()
    )

    # ========================================================
    # TOP PRODUCTS
    # ========================================================

    if sort_by == "quantity":
        sort_column = func.sum(SaleItem.quantity)
    else:
        sort_column = func.sum(SaleItem.total)

    product_rows = (
        items.join(
            Product,
            Product.id == SaleItem.product_id,
        )
        .filter(Product.company_id == user.company_id)
        .with_entities(
            Product.id,
            Product.name,
            func.sum(SaleItem.quantity).label("units_sold"),
            func.sum(SaleItem.total).label("revenue"),
        )
        .group_by(
            Product.id,
            Product.name,
        )
        .order_by(sort_column.desc())
        .limit(10)
        .all()
    )

    # ========================================================
    # TOP CUSTOMERS
    # ========================================================

    customer_rows = (
        sales.join(
            Customer,
            Customer.id == Sale.customer_id,
        )
        .filter(Customer.company_id == user.company_id)
        .with_entities(
            Customer.id,
            Customer.full_name,
            func.count(Sale.id).label("orders"),
            func.sum(Sale.total_amount).label("total_spend"),
        )
        .group_by(
            Customer.id,
            Customer.full_name,
        )
        .order_by(func.sum(Sale.total_amount).desc())
        .limit(10)
        .all()
    )

    # ========================================================
    # PAYMENT METHODS
    # ========================================================

    payment_rows = (
        sales.with_entities(
            Sale.payment_method,
            func.count(Sale.id),
            func.sum(Sale.total_amount),
        )
        .group_by(Sale.payment_method)
        .all()
    )

    # ========================================================
    # SALES CHANNELS
    # ========================================================

    channel_rows = (
        sales.with_entities(
            Sale.sales_channel,
            func.count(Sale.id),
            func.sum(Sale.total_amount),
        )
        .group_by(Sale.sales_channel)
        .all()
    )

    # ========================================================
    # RESPONSE
    # ========================================================

    return {
        "summary": {
            "total_revenue": float(total_revenue or 0),
            "total_orders": int(total_orders or 0),
            "average_order_value": (
                float(total_revenue or 0) / total_orders if total_orders else 0
            ),
            "total_items_sold": int(total_items or 0),
            "total_discount": float(total_discount or 0),
            "total_tax": float(total_tax or 0),
        },
        "trend": [
            {
                "period": str(row.period),
                "revenue": float(row.revenue or 0),
                "orders": int(row.orders or 0),
            }
            for row in trend_rows
        ],
        "products": [
            {
                "id": row.id,
                "name": row.name,
                "units_sold": int(row.units_sold or 0),
                "revenue": float(row.revenue or 0),
            }
            for row in product_rows
        ],
        "customers": [
            {
                "id": row.id,
                "name": row.full_name,
                "orders": int(row.orders or 0),
                "total_spend": float(row.total_spend or 0),
                "average_order_value": (
                    float(row.total_spend or 0) / row.orders if row.orders else 0
                ),
            }
            for row in customer_rows
        ],
        "payment_methods": [
            {
                "name": row[0],
                "transactions": int(row[1] or 0),
                "revenue": float(row[2] or 0),
            }
            for row in payment_rows
        ],
        "channels": [
            {
                "name": row[0],
                "transactions": int(row[1] or 0),
                "revenue": float(row[2] or 0),
            }
            for row in channel_rows
        ],
        "interval": interval,
        "sort_by": sort_by,
    }
