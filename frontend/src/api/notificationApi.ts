import { api } from "./client";

export type Notification = {
  id: number;
  message: string;
  level: "LOW_STOCK" | "OUT_OF_STOCK" | "INVENTORY" | "INFO";
  is_read: boolean;
  created_at: string;
};

export const notificationApi = {
  list: () => api.get<Notification[]>("/notifications/"),
  markAsRead: (id: number) => api.patch(`/notifications/${id}/read`),
};
