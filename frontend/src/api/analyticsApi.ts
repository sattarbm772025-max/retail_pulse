import { api } from "./client";
/* =========================================================
   COMMON TYPES
========================================================= */

export interface Metric {
  name: string;
  value: number;
}

/* =========================================================
   DASHBOARD ANALYTICS
========================================================= */

export interface AnalyticsKpis {
  total_revenue: number;
  total_orders: number;
  products_sold: number;
  average_order_value: number;
  inventory_value: number;
  low_stock_products: number;
  out_of_stock_products: number;
  total_categories: number;
}

export interface LowStockProduct {
  name: string;
  sku: string;
  available: number;
  reorder_level: number;
}

export interface OutOfStockProduct {
  name: string;
  sku: string;
}

export interface AnalyticsDashboard {
  kpis: AnalyticsKpis;

  revenue_trend: {
    date: string;
    value: number;
  }[];

  top_products: Metric[];

  categories: Metric[];

  payments: Metric[];

  channels: Metric[];

  inventory_categories: Metric[];

  stock_status: Metric[];

  low_stock: LowStockProduct[];

  out_of_stock: OutOfStockProduct[];
}

/* =========================================================
   PRODUCT ANALYTICS
========================================================= */

export interface ProductAnalytics {
  id: number;
  name: string;
  category: string;
  brand: string;
  units_sold: number;
  revenue: number;
  stock: number;
}

export interface ProductAnalyticsDetails {
  id: number;
  name: string;
  sku: string;
  brand: string | null;
  description: string | null;
  unit_price: number;
  cost_price: number;
  stock: number;
  reorder_level: number;
  status: string;
  stock_status?: string;
  forecast?: number;

  total_units_sold: number;
  total_revenue: number;

  sales_history: {
    invoice: string;
    date: string;
    quantity: number;
    price: number;
    total: number;
  }[];
}

/* =========================================================
   CATEGORY ANALYTICS
========================================================= */

export interface CategoryAnalyticsDetails {
  id: number;
  name: string;
  description: string | null;

  total_products: number;
  total_stock: number;
  total_units_sold: number;
  total_revenue: number;

  products: {
    id: number;
    name: string;
    sku: string;
    brand: string | null;
    price: number;
  }[];
}

/* =========================================================
   SALES BUSINESS INTELLIGENCE
========================================================= */

export interface SalesBusinessIntelligence {
  summary: {
    total_revenue: number;
    total_orders: number;
    average_order_value: number;
    total_items_sold: number;
    total_discount: number;
    total_tax: number;
  };

  trend: {
    period: string;
    revenue: number;
    orders: number;
  }[];

  products: {
    id: number;
    name: string;
    units_sold: number;
    revenue: number;
  }[];

  customers: {
    id: number;
    name: string;
    orders: number;
    total_spend: number;
    average_order_value: number;
  }[];

  payment_methods: {
    name: string;
    transactions: number;
    revenue: number;
  }[];
}

/* =========================================================
   FILTER TYPES
========================================================= */

export interface DashboardFilters {
  from_date?: string;
  to_date?: string;
  category_id?: string | number;
  product_id?: string | number;
  brand?: string;
  channel?: string;
  payment_method?: string;
}

export interface SalesBusinessIntelligenceFilters {
  interval?: "daily" | "weekly" | "monthly";
  from_date?: string;
  to_date?: string;
  customer_id?: string | number;
  category_id?: string | number;
  product_id?: string | number;
  brand?: string;
  payment_method?: string;
  sort_by?: "revenue" | "quantity";
}

const withoutEmptyValues = <T extends Record<string, unknown>>(params: T) =>
  Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    ),
  );

/* =========================================================
   API
========================================================= */

export const analyticsApi = {
  /* -------------------------------------------------------
     MAIN DASHBOARD
  ------------------------------------------------------- */

  dashboard: (params: DashboardFilters = {}) => {
    const filteredParams = Object.fromEntries(
      Object.entries(params).filter(([, value]) => {
        if (value === undefined || value === null) {
          return false;
        }

        if (typeof value === "string") {
          return value.trim() !== "";
        }

        return true;
      }),
    );

    return api.get<AnalyticsDashboard>("/analytics/dashboard", {
      params: filteredParams,
    });
  },

  /* -------------------------------------------------------
     SALES BUSINESS INTELLIGENCE
  ------------------------------------------------------- */

  salesBusinessIntelligence: (params: SalesBusinessIntelligenceFilters = {}) =>
    api.get<SalesBusinessIntelligence>("/analytics/sales", {
      params: withoutEmptyValues(params),
    }),

  exportSalesCsv: (params: SalesBusinessIntelligenceFilters = {}) =>
    api.get("/analytics/sales/export/csv", {
      params: withoutEmptyValues(params),
      responseType: "blob",
    }),

  exportSalesPdf: (params: SalesBusinessIntelligenceFilters = {}) =>
    api.get("/analytics/sales/export/pdf", {
      params: withoutEmptyValues(params),
      responseType: "blob",
    }),

  /* -------------------------------------------------------
     PRODUCT ANALYTICS
  ------------------------------------------------------- */

  productAnalytics: () => api.get<ProductAnalytics[]>("/analytics/products"),

  productDetails: (id: number) =>
    api.get<ProductAnalyticsDetails>(`/analytics/products/${id}`),

  /* -------------------------------------------------------
     CATEGORY ANALYTICS
  ------------------------------------------------------- */

  categoryDetails: (id: number) =>
    api.get<CategoryAnalyticsDetails>(`/analytics/category/${id}`),

  /* -------------------------------------------------------
     AUDIT / EXPORT
  ------------------------------------------------------- */

  recordExport: () => api.post("/analytics/dashboard/export"),

  exportPDF: () =>
    api.get("/analytics/export/pdf", {
      responseType: "blob",
    }),
};
