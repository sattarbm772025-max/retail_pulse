import { api } from "./axios";
export type SaleItem = {
  id?: number;
  product_id: number;
  product_name?: string;
  category_id?: number;
  category_name?: string;
  quantity: number;
  unit_price: number;
  discount: number;
  tax: number;
  total?: number;
};

export type Sale = {
  id: number;
  invoice_number: string;
  customer_name: string;
  customer_id: number | null;
  sale_date: string;
  sales_channel: string;
  payment_method: string;
  payment_status: "PAID" | "PENDING" | "PARTIAL";
  notes?: string | null;
  total_amount: number;
  items: SaleItem[];
};

export type SalePayload = {
  customer_id: number;
  sale_date?: string;
  sales_channel: string;
  payment_method: string;
  payment_status: "PAID" | "PENDING" | "PARTIAL";
  notes?: string;
  items: SaleItem[];
};

export type SalesSummary = {
  total_sales: number;
  total_revenue: number;
  total_orders: number;
  average_order_value: number;
};

export const salesApi = {
  summary: () => api.get<SalesSummary>("/sales/summary"),

  list: (params: Record<string, string | number | undefined>) =>
    api.get<Sale[]>("/sales/", {
      params,
    }),

  create: (payload: SalePayload) => api.post<Sale>("/sales/", payload),

  update: (id: number, payload: SalePayload) =>
    api.put<Sale>(`/sales/${id}`, payload),

  delete: (id: number) => api.delete(`/sales/${id}`),

  detail: (id: number) => api.get<Sale>(`/sales/${id}`),

  details: (id: number) => api.get<Sale>(`/sales/${id}`),
  exportPDF: () => api.get("/sales/export/pdf", { responseType: "blob" }),
};
