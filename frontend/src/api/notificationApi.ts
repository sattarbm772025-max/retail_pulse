import { api } from "./client";

export type Notification = { id: number; title: string; message: string; type: string; priority: string; resource_type?: string | null; resource_id?: number | null; product_id?: number | null; is_read: boolean; created_at: string; read_at?: string | null };
export type NotificationFilters = Record<string, string | number | undefined>;
const params = (filters: NotificationFilters) => Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== "" && value !== undefined));

export const notificationApi = {
  list: (filters: NotificationFilters = {}) => api.get<{ items: Notification[]; total: number; total_pages: number }>("/notifications/", { params: params(filters) }),
  unreadCount: () => api.get<{ unread_count: number }>("/notifications/unread-count"),
  detail: (id: number) => api.get<Notification & { resource_details?: Record<string, string | number | null> }>(`/notifications/${id}`),
  markAsRead: (id: number) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.patch("/notifications/read-all"),
};
