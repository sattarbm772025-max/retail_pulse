"""Create stock movement history and upgrade inventory tracking.

Revision ID: 0004_inventory_movements
Revises: 0003_sales_management
"""
from alembic import op

revision = "0004_inventory_movements"
down_revision = "0003_sales_management"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_type VARCHAR(50)")
    op.execute("ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_name VARCHAR(255)")
    op.execute("ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS quantity_changed INTEGER")
    op.execute("""
        CREATE TABLE IF NOT EXISTS inventory (
          id SERIAL PRIMARY KEY, company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
          product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
          current_stock INTEGER NOT NULL DEFAULT 0, reserved_stock INTEGER NOT NULL DEFAULT 0,
          available_stock INTEGER NOT NULL DEFAULT 0, reorder_level INTEGER NOT NULL DEFAULT 10,
          stock_status VARCHAR(20) NOT NULL DEFAULT 'OUT_OF_STOCK', updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          CONSTRAINT uq_inventory_company_product UNIQUE(company_id, product_id)
        )
    """)
    op.execute("""
        CREATE TABLE IF NOT EXISTS inventory_movements (
          id SERIAL PRIMARY KEY, inventory_id INTEGER NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
          movement_type VARCHAR(30) NOT NULL, quantity_changed INTEGER NOT NULL,
          previous_quantity INTEGER NOT NULL, updated_quantity INTEGER NOT NULL,
          reason VARCHAR(255) NOT NULL, remarks VARCHAR(500),
          performed_by INTEGER NOT NULL REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)
    op.execute("ALTER TABLE inventory ADD COLUMN IF NOT EXISTS current_stock INTEGER")
    op.execute("ALTER TABLE inventory ADD COLUMN IF NOT EXISTS reserved_stock INTEGER NOT NULL DEFAULT 0")
    op.execute("ALTER TABLE inventory ADD COLUMN IF NOT EXISTS available_stock INTEGER")
    op.execute("ALTER TABLE inventory ADD COLUMN IF NOT EXISTS stock_status VARCHAR(20) NOT NULL DEFAULT 'OUT_OF_STOCK'")
    op.execute("ALTER TABLE inventory ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now()")
    op.execute("""
        DO $$ BEGIN
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inventory' AND column_name='quantity') THEN
            UPDATE inventory SET current_stock=COALESCE(current_stock, quantity, 0), available_stock=COALESCE(available_stock, current_stock, quantity, 0);
          ELSE
            UPDATE inventory SET current_stock=COALESCE(current_stock, 0), available_stock=COALESCE(available_stock, current_stock, 0);
          END IF;
        END $$;
    """)
    op.execute("UPDATE inventory SET stock_status=CASE WHEN available_stock=0 THEN 'OUT_OF_STOCK' WHEN available_stock<=reorder_level THEN 'LOW_STOCK' ELSE 'IN_STOCK' END")
    op.execute("""
        INSERT INTO inventory (company_id, product_id, current_stock, reserved_stock, available_stock, reorder_level, stock_status, updated_at)
        SELECT p.company_id, p.id, p.stock_quantity, 0, p.stock_quantity, 10,
          CASE WHEN p.stock_quantity=0 THEN 'OUT_OF_STOCK' WHEN p.stock_quantity<=10 THEN 'LOW_STOCK' ELSE 'IN_STOCK' END, now()
        FROM products p WHERE NOT EXISTS (SELECT 1 FROM inventory i WHERE i.company_id=p.company_id AND i.product_id=p.id)
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS inventory_movements")
