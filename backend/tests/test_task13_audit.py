"""Task 13 tests. Run: python -m unittest tests.test_task13_audit"""
import unittest
from types import SimpleNamespace
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import app.models
from app.core.database import Base
from app.models.audit_log import AuditLog
from app.models.company import Company
from app.models.user import User
from app.services.audit_log_service import list_logs
from app.services.audit_service import create_audit_log


class AuditLogTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(self.engine)
        self.db = sessionmaker(bind=self.engine)()
        self.db.add_all([Company(id=1, name="Company One", industry="Retail", email="one@example.test"), Company(id=2, name="Company Two", industry="Retail", email="two@example.test"), User(id=1, company_id=1, name="Admin One", email="admin1@example.test", password="x", role="COMPANY_ADMIN", status="ACTIVE"), User(id=2, company_id=2, name="Admin Two", email="admin2@example.test", password="x", role="COMPANY_ADMIN", status="ACTIVE")])
        self.db.commit()

    def tearDown(self):
        self.db.close(); self.engine.dispose()

    def test_audit_creation_keeps_change_snapshot(self):
        create_audit_log(self.db, 1, 1, "UPDATE", commit=False, entity_type="PRODUCT", resource_id=12, before_values={"status": "ACTIVE"}, after_values={"status": "INACTIVE"})
        self.db.commit()
        log = self.db.query(AuditLog).filter_by(company_id=1, resource_id=12).one()
        self.assertEqual(log.action, "UPDATE")
        self.assertIsNotNone(log.before_values)
        self.assertIsNotNone(log.after_values)

    def test_cross_company_access_is_filtered(self):
        create_audit_log(self.db, 1, 1, "COMPANY_ONE", commit=False)
        create_audit_log(self.db, 2, 2, "COMPANY_TWO", commit=False)
        self.db.commit()
        result = list_logs(self.db, SimpleNamespace(company_id=1), page=1, page_size=25)
        self.assertEqual([row["action"] for row in result["items"]], ["COMPANY_ONE"])


if __name__ == "__main__":
    unittest.main()
