import { api } from "./axios";

export type InventoryItem = {
  id: number;
  product_id: number;
  product_name: string;
  sku: string;
  category_id: number;
  category_name: string;
  brand: string | null;
  current_stock: number;
  reserved_stock: number;
  available_stock: number;
  reorder_level: number;
  stock_status: string;
  updated_at: string;
};

export type PaginatedResponse<T> = {
  items: T[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};

export type Movement = {
  id: number;
  movement_type: string;
  quantity_changed: number;
  previous_quantity: number;
  updated_quantity: number;
  reason: string;
  remarks: string | null;
  performed_by: number;
  performed_by_name: string;
  created_at: string;
};

export type InventorySummary = {
  total_products: number;
  total_inventory_quantity: number;
  low_stock_products: number;
  out_of_stock_products: number;
};

export type InventoryCharts = {
  inventory_by_category: { category: string; quantity: number }[];
  stock_status_distribution: { status: string; count: number }[];
  movement_trend: { date: string; quantity: number }[];
};

export type StockAdjustmentPayload = {
  adjustment_type: "STOCK_IN" | "STOCK_OUT" | "MANUAL_ADJUSTMENT";
  direction?: "INCREASE" | "DECREASE";
  quantity: number;
  reason: string;
  remarks?: string;
};

export type ReplenishmentRisk =
  "OUT_OF_STOCK" | "STOCKOUT_RISK" | "LOW_STOCK" | "HEALTHY" | "OVERSTOCK";

export type ReplenishmentRecommendation = {
  product_id: number;
  inventory_id: number;
  product: string;
  sku: string;
  category_id: number;
  category: string;
  brand: string | null;
  supplier: string | null;
  current_stock: number;
  average_daily_sales: number;
  forecasted_demand: number;
  days_of_stock_remaining: number | null;
  reorder_point: number;
  safety_stock: number;
  recommended_stock: number;
  recommended_reorder_quantity: number;
  stock_risk: ReplenishmentRisk;
  reorder_required: boolean;
  recommendation: string;
};

export type ReplenishmentResponse =
  PaginatedResponse<ReplenishmentRecommendation> & {
    summary: {
      requiring_reorder: number;
      stockout_risk: number;
      overstocked: number;
      healthy: number;
    };
    formula: string;
  };

export type ReplenishmentDetail = ReplenishmentRecommendation & {
  demand_history: { date: string; demand: number }[];
  stock_comparison: {
    current_stock: number;
    recommended_stock: number;
    average_daily_sales: number;
    reorder_point: number;
    safety_stock: number;
  };
};

export const inventoryApi = {
  list: (params: Record<string, string | number | undefined>) =>
    api.get<PaginatedResponse<InventoryItem>>("/inventory/", { params }),

  summary: () => api.get<InventorySummary>("/inventory/summary"),
  charts: () => api.get<InventoryCharts>("/inventory/charts"),

  adjust: (id: number, payload: StockAdjustmentPayload) =>
    api.post<InventoryItem>(`/inventory/${id}/adjust`, payload),

  movements: (id: number, params: Record<string, number | undefined>) =>
    api.get<PaginatedResponse<Movement>>(`/inventory/${id}/movements`, {
      params,
    }),

  reorder: (id: number, reorderLevel: number, reason: string) =>
    api.put<InventoryItem>(`/inventory/${id}/reorder-level`, {
      reorder_level: reorderLevel,
      reason,
    }),

  exportPDF: () => api.get("/inventory/export/pdf", { responseType: "blob" }),

  recommendations: (
    params: Record<string, string | number | boolean | undefined>,
  ) => api.get<ReplenishmentResponse>("/inventory/recommendations", { params }),

  recommendationDetail: (productId: number, forecastDays = 30) =>
    api.get<ReplenishmentDetail>(`/inventory/recommendations/${productId}`, {
      params: { forecast_days: forecastDays },
    }),
};
