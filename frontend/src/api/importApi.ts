import { api } from "./axios";

export const importApi = {
  upload: (type: string, file: File) => {
    const data = new FormData();
    data.append("import_type", type);
    data.append("file", file);
    return api.post("/imports/upload", data);
  },
  validate: (id: number) => api.post(`/imports/${id}/validate`),
  process: (id: number) => api.post(`/imports/${id}/process`),
  cancel: (id: number) => api.post(`/imports/${id}/cancel`),
  status: (id: number) => api.get(`/imports/${id}/status`),
  detail: (id: number) => api.get(`/imports/${id}`),
  history: (page = 1) => api.get(`/imports/history?page=${page}&page_size=10`),
  errors: (id: number) => api.get(`/imports/${id}/errors`, { responseType: "blob" }),
};
