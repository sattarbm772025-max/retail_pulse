import { api } from "./client";

export type Customer = {
  id: number;
  customer_id: string;
  full_name: string;
  email: string;
  phone: string;
  customer_type: string;
  status: string;
  segment: string;
  city?: string;
  total_orders: number;
  total_revenue: number;
  average_order_value: number;
  last_purchase_at?: string;
};
export type CustomerPayload = {
  full_name: string;
  email: string;
  phone: string;
  customer_type: string;
  city?: string;
  state?: string;
  country?: string;
  address?: string;
  preferred_sales_channel?: string;
  status: string;
};
export const customerApi = {
  list: (params: Record<string, string | number | undefined>) =>
    api.get<{ items: Customer[]; total: number }>("/customers/", { params }),
  create: (payload: CustomerPayload) =>
    api.post<Customer>("/customers/", payload),
  detail: (id: number) =>
    api.get<
      Customer & {
        recent_transactions: {
          invoice_number: string;
          date: string;
          amount: number;
        }[];
        timeline: { action: string; description: string; created_at: string }[];
      }
    >(`/customers/${id}`),
};
