import { api } from "./client";

export type ReportType =
  | "sales"
  | "inventory"
  | "customers"
  | "product_performance"
  | "stock_movement";

export interface ReportFilters {
  report_type: ReportType;
  date_from?: string;
  date_to?: string;
  brand?: string;
  sales_status?: string;
  stock_status?: string;
  page?: number;
  page_size?: number;
  sort_by?: string;
  sort_direction?: "asc" | "desc";
}

export interface GeneratedReport {
  report_type: ReportType;
  report_name: string;
  columns: { key: string; label: string }[];
  rows: Record<string, string | number | null>[];
  pagination: { page: number; page_size: number; total: number; pages: number };
  applied_filters: Record<string, string | number>;
}

export const reportApi = {
  types: () => api.get<{ id: ReportType; name: string }[]>("/reports/types"),
  generate: (filters: ReportFilters) =>
    api.get<GeneratedReport>("/reports/generate", { params: filters }),
};
