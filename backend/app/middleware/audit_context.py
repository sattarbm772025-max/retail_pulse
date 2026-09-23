from starlette.middleware.base import BaseHTTPMiddleware

from app.core.audit_context import audit_agent, audit_ip


class AuditContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        forwarded = request.headers.get("x-forwarded-for", "")
        ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "Unknown")
        ip_token = audit_ip.set(ip)
        agent_token = audit_agent.set(request.headers.get("user-agent", "Unknown")[:255])
        try:
            return await call_next(request)
        finally:
            audit_ip.reset(ip_token)
            audit_agent.reset(agent_token)
