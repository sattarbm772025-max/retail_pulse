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



export type Movement = {
  id: number;

  movement_type: string;

  quantity_changed: number;
  previous_quantity: number;
  updated_quantity: number;

  reason: string;
  remarks: string | null;

  performed_by: number;

  created_at: string;
};



export type InventorySummary = {
  total_products: number;
  total_inventory_quantity: number;
  low_stock_products: number;
  out_of_stock_products: number;
};



export type InventoryCharts = {
  inventory_by_category: {
    category: string;
    quantity: number;
  }[];

  stock_status_distribution: {
    status: string;
    count: number;
  }[];
};



export type StockAdjustmentPayload = {
  adjustment_type: string;
  quantity: number;
  reason: string;
  remarks?: string;
};



export const inventoryApi = {

  list: (
    params: Record<
      string,
      string | number | undefined
    >
  ) =>
    api.get<InventoryItem[]>(
      "/inventory/",
      {
        params,
      }
    ),



  summary: () =>
    api.get<InventorySummary>(
      "/inventory/summary"
    ),



  charts: () =>
    api.get<InventoryCharts>(
      "/inventory/charts"
    ),



  adjust: (
    id: number,
    payload: StockAdjustmentPayload
  ) =>
    api.post(
      `/inventory/${id}/adjust`,
      payload
    ),



  movements: (
    id: number
  ) =>
    api.get<Movement[]>(
      `/inventory/${id}/movements`
    ),



  reorder: (
    id: number,
    reorder_level: number
  ) =>
    api.put(
      `/inventory/${id}/reorder-level`,
      {
        reorder_level,
      }
    ),

};