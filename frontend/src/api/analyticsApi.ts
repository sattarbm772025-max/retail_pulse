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
  salesBusinessIntelligence: (
    params: Record<string, string | number | undefined>,
  ) => api.get<SalesBusinessIntelligence>("/analytics/sales", { params }),
  dashboard: (params: Record<string, string | undefined>) => {
    const filteredParams = Object.fromEntries(
      Object.entries(params).filter(
        ([, value]) =>
          value !== undefined && value !== null && value.trim() !== "",
      ),
    );

    return api.get<AnalyticsDashboard>("/analytics/dashboard", {
      params: filteredParams,
    });
  },

  productAnalytics: () => api.get("/analytics/products"),

  productDetails: (id: number) => api.get(`/analytics/products/${id}`),

  categoryDetails: (id: number) => api.get(`/analytics/category/${id}`),

  recordExport: () => api.post("/analytics/dashboard/export"),

  exportPDF: () =>
    api.get("/analytics/export/pdf", {
      responseType: "blob",
    }),
};

export interface SalesBusinessIntelligence {
  summary: {
    total_revenue: number;
    total_orders: number;
    average_order_value: number;
    total_items_sold: number;
    total_discount: number;
    total_tax: number;
  };
  trend: { period: string; revenue: number; orders: number }[];
  products: { id: number; name: string; units_sold: number; revenue: number }[];
  customers: {
    id: number;
    name: string;
    orders: number;
    total_spend: number;
    average_order_value: number;
  }[];
  payment_methods: { name: string; transactions: number; revenue: number }[];
}
