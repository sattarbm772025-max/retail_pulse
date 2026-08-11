import { api as axios } from "./axios";

export interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  status: string;
  segment: string;
  total_orders: number;
  total_spent: number;
  last_purchase: string | null;
  created_at: string;
}

export interface Purchase {
  id: number;
  invoice_number: string;
  sale_date: string;
  total_amount: number;
}

export interface TimelineEvent {
  id: number;
  event: string;
  created_at: string;
}

export interface CustomerProfile extends Customer {
  purchase_history: Purchase[];
  timeline: TimelineEvent[];
}

export interface CustomerPayload {
  name: string;
  email: string;
  phone: string;
}

export interface CustomerSummary {
  total_customers: number;
  active_customers: number;
  inactive_customers: number;
  vip_customers: number;
  total_revenue: number;
}

export interface CustomerFilters {
  search?: string;
  status?: string;
  segment?: string;
  sort?: string;
}

const toCustomer = (customer: Record<string, any>): Customer => ({
  id: customer.id,
  name: customer.full_name ?? customer.name,
  email: customer.email,
  phone: customer.phone,
  status: customer.status,
  segment: customer.segment,
  total_orders: customer.total_orders ?? 0,
  total_spent: customer.total_revenue ?? customer.total_spent ?? 0,
  last_purchase: customer.last_purchase_at ?? customer.last_purchase ?? null,
  created_at: customer.created_at,
});

const toPayload = (data: CustomerPayload) => ({ full_name: data.name, email: data.email, phone: data.phone, customer_type: "RETAIL" });
export const customerApi = {
  async list(params?: CustomerFilters) {
    const response = await axios.get<{ items: Record<string, any>[] }>("/customers/", { params });
    return { ...response, data: response.data.items.map(toCustomer) };
  },

  summary() {
    return axios.get<CustomerSummary>("/customers/summary");
  },

  async profile(id: number) {
    const response = await axios.get<Record<string, any>>(`/customers/${id}`);
    return { ...response, data: { ...toCustomer(response.data), purchase_history: response.data.recent_transactions ?? [], timeline: response.data.timeline ?? [] } as CustomerProfile };
  },

  create(data: CustomerPayload) {
    return axios.post("/customers/", toPayload(data));
  },

  update(id: number, data: CustomerPayload) {
    return axios.put(`/customers/${id}`, toPayload(data));
  },

  delete(id: number) {
    return axios.delete(`/customers/${id}`);
  },

  activate(id: number) {
    return axios.patch(`/customers/${id}/activate`);
  },

  deactivate(id: number) {
    return axios.patch(`/customers/${id}/deactivate`);
  },

  exportCsv() {
    return axios.get("/customers/export/csv", {
      responseType: "blob",
    });
  },

  exportPdf() {
    return axios.get("/customers/export/pdf", {
      responseType: "blob",
    });
  },

  exportCustomerCSV() {
    return axios.get("/customers/export/csv", { responseType: "blob" });
  },

  exportCustomerPDF() {
    return axios.get("/customers/export/pdf", { responseType: "blob" });
  },
};
