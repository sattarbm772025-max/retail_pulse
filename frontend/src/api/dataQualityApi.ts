import { api } from "./axios";

export type QualityFilters = Record<string, string | number | undefined>;

const params = (filters: QualityFilters) =>
  Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== "" && value !== undefined),
  );

export const dataQualityApi = {
  dashboard: () => api.get("/data-quality/dashboard"),
  reconcile: () => api.post("/data-quality/reconcile"),
  issues: (filters: QualityFilters) => api.get("/data-quality/issues", { params: params(filters) }),
  issue: (id: number) => api.get(`/data-quality/issues/${id}`),
  updateIssue: (id: number, payload: { status: string; resolution_note?: string }) => api.patch(`/data-quality/issues/${id}`, payload),
  history: (page = 1, pageSize = 10) => api.get("/data-quality/history", { params: { page, page_size: pageSize } }),
};
