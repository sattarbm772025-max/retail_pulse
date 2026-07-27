import { api } from "./client";

export type Notification = {
  id: number;
  message: string;
  level: "LOW_STOCK" | "OUT_OF_STOCK" | "INVENTORY" | "INFO";
  created_at: string;
};

export const notificationApi = {
  list: () => api.get<Notification[]>("/notifications/"),
};
