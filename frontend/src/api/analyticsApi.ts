import { api } from "./client";

export type Metric = {
  name: string;
  value: number;
};

export type AnalyticsDashboard = {
  kpis: Record<string, number>;
  revenue_trend: { date: string; value: number }[];
  top_products: Metric[];
  categories: Metric[];
  payments: Metric[];
  channels: Metric[];
  inventory_categories: Metric[];
  stock_status: Metric[];
  low_stock: {
    name: string;
    sku: string;
    available: number;
    reorder_level: number;
  }[];
  out_of_stock: {
    name: string;
    sku: string;
  }[];
};

export const analyticsApi = {
  dashboard: (params: Record<string, string | undefined>) => {
    // Remove empty or undefined query parameters
    const filteredParams = Object.fromEntries(
      Object.entries(params).filter(
        ([, value]) =>
          value !== undefined &&
          value !== null &&
          value.trim() !== ""
      )
    );

    return api.get<AnalyticsDashboard>("/analytics/dashboard", {
      params: filteredParams,
    });
  },

  recordExport: () => api.post("/analytics/dashboard/export"),
};