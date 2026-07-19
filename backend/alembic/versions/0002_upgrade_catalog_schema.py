"""Upgrade legacy product/category tables to the Task 2 catalog schema.

Revision ID: 0002_catalog_schema
Revises: 0001_tenant_auth
"""

from alembic import op


revision = "0002_catalog_schema"
down_revision = "0001_tenant_auth"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # PostgreSQL-safe upgrade for databases created by the original Task 1
    # Base.metadata.create_all() setup. Fresh databases already contain these columns.
    op.execute("""
        CREATE TABLE IF NOT EXISTS categories (
          id SERIAL PRIMARY KEY,
          company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
          name VARCHAR(100) NOT NULL,
          description VARCHAR(255),
          status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          CONSTRAINT uq_category_company_name UNIQUE (company_id, name)
        )
    """)
    op.execute("""
        CREATE TABLE IF NOT EXISTS products (
          id SERIAL PRIMARY KEY,
          company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
          category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
          name VARCHAR(200) NOT NULL,
          sku VARCHAR(100) NOT NULL,
          brand VARCHAR(100),
          description VARCHAR(1000),
          unit_price DOUBLE PRECISION NOT NULL,
          cost_price DOUBLE PRECISION NOT NULL,
          stock_quantity INTEGER NOT NULL DEFAULT 0,
          unit_of_measure VARCHAR(50) NOT NULL DEFAULT 'Unit',
          status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          CONSTRAINT uq_product_company_sku UNIQUE (company_id, sku),
          CONSTRAINT uq_product_company_category_name UNIQUE (company_id, category_id, name)
        )
    """)
    op.execute("ALTER TABLE categories ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'")
    op.execute("ALTER TABLE categories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now()")
    op.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id INTEGER")
    op.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS brand VARCHAR(100)")
    op.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS description VARCHAR(1000)")
    op.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS unit_price DOUBLE PRECISION")
    op.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price DOUBLE PRECISION")
    op.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity INTEGER")
    op.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS unit_of_measure VARCHAR(50) NOT NULL DEFAULT 'Unit'")
    op.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'")
    op.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now()")
    op.execute("""
        DO $$ BEGIN
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='category') THEN
            INSERT INTO categories (company_id, name, status, created_at, updated_at)
            SELECT DISTINCT p.company_id, COALESCE(NULLIF(p.category, ''), 'General'), 'ACTIVE', now(), now()
            FROM products p
            WHERE NOT EXISTS (SELECT 1 FROM categories c WHERE c.company_id=p.company_id AND lower(c.name)=lower(COALESCE(NULLIF(p.category, ''), 'General')));
            UPDATE products p SET category_id=c.id FROM categories c WHERE c.company_id=p.company_id AND lower(c.name)=lower(COALESCE(NULLIF(p.category, ''), 'General')) AND p.category_id IS NULL;
          END IF;
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='price') THEN
            UPDATE products SET unit_price=COALESCE(unit_price, price), cost_price=COALESCE(cost_price, price);
          END IF;
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='stock') THEN
            UPDATE products SET stock_quantity=COALESCE(stock_quantity, stock, 0);
          END IF;
        END $$;
    """)
    op.execute("UPDATE products SET unit_price=COALESCE(unit_price, 0.01), cost_price=COALESCE(cost_price, 0), stock_quantity=COALESCE(stock_quantity, 0)")
    op.execute("""
        INSERT INTO categories (company_id, name, description, status, created_at, updated_at)
        SELECT c.id, defaults.name, 'Default catalog category', 'ACTIVE', now(), now()
        FROM companies c CROSS JOIN (VALUES ('Mobile'), ('Laptop'), ('Accessories'), ('Clothing')) AS defaults(name)
        WHERE NOT EXISTS (SELECT 1 FROM categories existing WHERE existing.company_id=c.id AND lower(existing.name)=lower(defaults.name));
    """)


def downgrade() -> None:
    # Deliberately retain migrated data and compatibility columns on downgrade.
    pass
