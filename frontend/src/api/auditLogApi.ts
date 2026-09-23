import { api } from "./axios";

export type AuditFilters = Record<string, string | number | undefined>;

const params = (filters: AuditFilters) => Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== "" && value !== undefined));

export const auditLogApi = {
  list: (filters: AuditFilters) => api.get("/audit-logs/", { params: params(filters) }),
  detail: (id: number) => api.get(`/audit-logs/${id}`),
  csv: (filters: AuditFilters) => api.get("/audit-logs/export/csv", { params: params(filters), responseType: "blob" }),
  pdf: (filters: AuditFilters) => api.get("/audit-logs/export/pdf", { params: params(filters), responseType: "blob" }),
};
