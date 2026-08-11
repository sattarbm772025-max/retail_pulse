import { api } from "./axios";

export const forecastApi = {
  generate(period: number) {
    return api.post("/forecasts/generate", null, { params: { period } });
  },

  list(params: { period: number; category_id?: number; brand?: string; sort?: string }) {
    return api.get<Forecast[]>("/forecasts/", { params });
  },
  exportForecastCSV() {
    return api.get("/forecasts/export/csv", { responseType: "blob" });
  },

  exportForecastPDF() {
    return api.get("/forecasts/export/pdf", { responseType: "blob" });
  },
};

export interface Forecast {
  id: number;
  product: string;
  category_id: number;
  current_stock: number;
  historical_sales: number;
  predicted_demand: number;
  confidence: number;
  recommendation: string;
}
