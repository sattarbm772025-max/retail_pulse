"""Request metadata captured server-side for audit entries."""

from contextvars import ContextVar

audit_ip: ContextVar[str] = ContextVar("audit_ip", default="Unknown")
audit_agent: ContextVar[str] = ContextVar("audit_agent", default="Unknown")
