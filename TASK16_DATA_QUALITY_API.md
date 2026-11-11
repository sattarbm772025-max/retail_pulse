# Task 16 — Data Quality & Reconciliation API

All endpoints require a bearer access token and derive the company from that
token. Clients cannot provide a company ID.

| Endpoint | Role | Purpose |
| --- | --- | --- |
| `GET /data-quality/dashboard` | Admin, Analyst | Reconciliation KPIs and last-run status. |
| `POST /data-quality/reconcile` | Admin | Runs company-scoped checks against live operational data. |
| `GET /data-quality/issues` | Admin, Analyst | Filtered, paginated issue list. |
| `GET /data-quality/issues/{issue_id}` | Admin, Analyst | Issue evidence and inventory context where relevant. |
| `PATCH /data-quality/issues/{issue_id}` | Admin | Updates status and resolution note. |
| `GET /data-quality/history` | Admin, Analyst | Paginated reconciliation-run history. |

`GET /data-quality/issues` supports `page`, `page_size`, `search`,
`issue_type`, `severity`, `module`, `status`, `date_from`, and `date_to`.

Issue statuses are `OPEN`, `INVESTIGATING`, `RESOLVED`, and `IGNORED`.
Resolving or ignoring an issue requires a resolution note. Each status change is
written to the existing audit log with the old and new status values.

The live OpenAPI reference is available at `/docs` while the backend is running.
