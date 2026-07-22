"""Create sales, sale_items and inventory notification tables.

Revision ID: 0003_sales_management
Revises: 0002_catalog_schema
"""
from alembic import op

revision = "0003_sales_management"
down_revision = "0002_catalog_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS sales (
          id SERIAL PRIMARY KEY, company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
          invoice_number VARCHAR(30) NOT NULL, customer_name VARCHAR(200) NOT NULL,
          sale_date TIMESTAMPTZ NOT NULL DEFAULT now(), sales_channel VARCHAR(30) NOT NULL,
          payment_method VARCHAR(30) NOT NULL, total_amount DOUBLE PRECISION NOT NULL,
          created_by INTEGER NOT NULL REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), CONSTRAINT uq_sale_company_invoice UNIQUE(company_id, invoice_number)
        )
    """)
    op.execute("""
        CREATE TABLE IF NOT EXISTS sale_items (
          id SERIAL PRIMARY KEY, sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
          product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
          category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
          quantity INTEGER NOT NULL, unit_price DOUBLE PRECISION NOT NULL, discount DOUBLE PRECISION NOT NULL DEFAULT 0,
          tax DOUBLE PRECISION NOT NULL DEFAULT 0, total DOUBLE PRECISION NOT NULL
        )
    """)
    op.execute("""
        CREATE TABLE IF NOT EXISTS notifications (
          id SERIAL PRIMARY KEY, company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
          product_id INTEGER REFERENCES products(id) ON DELETE CASCADE, message VARCHAR(500) NOT NULL,
          level VARCHAR(20) NOT NULL DEFAULT 'INFO', created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS notifications")
    op.execute("DROP TABLE IF EXISTS sale_items")
    op.execute("DROP TABLE IF EXISTS sales")
