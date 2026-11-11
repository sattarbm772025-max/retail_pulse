# Task 17 – Advanced Data Import API

All import routes require an authenticated `SUPER_ADMIN` or `COMPANY_ADMIN`.
The company is always taken from the authenticated user; no route accepts a
client-provided company ID.

| Method | Route | Purpose |
| --- | --- | --- |
| POST | `/imports/upload` | Upload a CSV (`import_type`, `file`) and receive its validation preview. |
| POST | `/imports/{id}/validate` | Re-run header, data and duplicate validation. |
| POST | `/imports/{id}/process` | Queue validated records in the server background worker. |
| GET | `/imports/{id}/status` | Poll status, record counts, percentage and duration. |
| POST | `/imports/{id}/cancel` | Request cancellation of a currently processing import. |
| GET | `/imports/{id}` | View preview, validation errors and final summary. |
| GET | `/imports/{id}/errors` | Download the failed-row CSV with error reasons. |
| GET | `/imports/history?page=1&page_size=10` | View company-scoped import history. |

## Import behaviour

Supported types are `PRODUCTS`, `INVENTORY`, `CUSTOMERS`, and `SALES`.
The maximum accepted CSV is 10 MB / 10,000 rows. Required headers, row values,
and duplicates are validated before processing. Product/customer/sale duplicates
are rejected and counted as skipped. Inventory rows intentionally update an
existing company product's stock to the requested quantity through the normal
stock-movement service; duplicate inventory SKU rows in the same file are
rejected.

`POST /process` only queues work and responds immediately. The background worker
uses its own database session, processes valid rows as partial successes, records
per-row failures, writes progress every 25 rows, and checks the database before
each row for a cancellation request. Consequently, an already committed valid
row remains valid if a later row fails; the final result explicitly reports
successful, failed, skipped, duplicate and duration values.

Import events are audit logged (`IMPORT_UPLOADED`, `IMPORT_STARTED`,
`IMPORT_COMPLETED`, `IMPORT_COMPLETED_WITH_ERRORS`, `IMPORT_FAILED`, and
`IMPORT_CANCELLED`) and create deduplicated notifications. Inventory writes use
the normal movement service, which also invokes the existing targeted
data-quality reconciliation checks.
