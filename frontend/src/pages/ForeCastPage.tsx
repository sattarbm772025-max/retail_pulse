import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Box, Button, Card, CardContent, FormControl, Grid, InputLabel, MenuItem, Select, Stack, Typography } from "@mui/material";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { catalogApi } from "../api/catalogApi";
import { forecastApi } from "../api/forecastApi";
import { DashboardLayout } from "../layouts/DashboardLayout";
import { downloadPdf } from "../utils/download";


export function ForeCastPage() {
  const client = useQueryClient();
  const [period, setPeriod] = useState(30);
  const [categoryId, setCategoryId] = useState("");
  const [brand, setBrand] = useState("");
  const [message, setMessage] = useState("");
  const categories = useQuery({ queryKey: ["forecast-categories"], queryFn: () => catalogApi.categories().then((response) => response.data) });
  const forecasts = useQuery({
    queryKey: ["forecasts", period, categoryId, brand],
    queryFn: () => forecastApi.list({ period, category_id: categoryId ? Number(categoryId) : undefined, brand: brand || undefined }).then((response) => response.data),
  });
  const generate = useMutation({
    mutationFn: () => forecastApi.generate(period),
    onSuccess: (response) => {
      setMessage(response.data.message);
      client.invalidateQueries({ queryKey: ["forecasts"] });
    },
    onError: () => setMessage("Forecast generation needs historical sales for active products."),
  });

  const downloadCsv = async () => {
    const response = await forecastApi.exportForecastCSV();
    const url = URL.createObjectURL(new Blob([response.data], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url; link.download = "forecast-report.csv"; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
  };

  const chartData = (forecasts.data ?? []).map((forecast) => ({ product: forecast.product, historical: forecast.historical_sales, forecast: forecast.predicted_demand }));
  return (
    <DashboardLayout>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2} mb={3}>
        <Box><Typography variant="h4" fontWeight={800}>Demand Forecasting</Typography><Typography color="text.secondary">Moving-average forecasts based on your company sales history.</Typography></Box>
        <Stack direction="row" spacing={1}><Button variant="outlined" onClick={downloadCsv}>Download CSV</Button><Button variant="contained" onClick={() => downloadPdf(forecastApi.exportForecastPDF, "forecast-report.pdf")}>Download PDF</Button></Stack>
      </Stack>
      <Card sx={{ mb: 3 }}><CardContent><Grid container spacing={2} alignItems="center">
        <Grid size={{ xs: 12, sm: 3 }}><FormControl fullWidth><InputLabel>Forecast Period</InputLabel><Select label="Forecast Period" value={period} onChange={(event) => setPeriod(Number(event.target.value))}><MenuItem value={7}>Next 7 Days</MenuItem><MenuItem value={30}>Next 30 Days</MenuItem><MenuItem value={90}>Next 90 Days</MenuItem></Select></FormControl></Grid>
        <Grid size={{ xs: 12, sm: 3 }}><FormControl fullWidth><InputLabel>Category</InputLabel><Select label="Category" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><MenuItem value="">All Categories</MenuItem>{(categories.data ?? []).map((category) => <MenuItem key={category.id} value={String(category.id)}>{category.name}</MenuItem>)}</Select></FormControl></Grid>
        <Grid size={{ xs: 12, sm: 3 }}><FormControl fullWidth><InputLabel>Brand</InputLabel><Select label="Brand" value={brand} onChange={(event) => setBrand(event.target.value)}><MenuItem value="">All Brands</MenuItem></Select></FormControl></Grid>
        <Grid size={{ xs: 12, sm: 3 }}><Button fullWidth variant="contained" disabled={generate.isPending} onClick={() => generate.mutate()}>{generate.isPending ? "Generating..." : "Generate Forecast"}</Button></Grid>
      </Grid>{message && <Alert sx={{ mt: 2 }} severity={generate.isError ? "error" : "success"}>{message}</Alert>}</CardContent></Card>
      <Grid container spacing={3}><Grid size={{ xs: 12, lg: 7 }}><Card><CardContent><Typography fontWeight={700} mb={2}>Historical Sales vs Predicted Demand</Typography><Box height={320}>{chartData.length ? <ResponsiveContainer width="100%" height="100%"><LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="product" /><YAxis /><Tooltip /><Legend /><Line type="monotone" dataKey="historical" name="Historical Sales" stroke="#7895ff" /><Line type="monotone" dataKey="forecast" name="Predicted Demand" stroke="#165dff" strokeWidth={3} /></LineChart></ResponsiveContainer> : <Typography color="text.secondary">Generate a forecast after recording sales to see the trend.</Typography>}</Box></CardContent></Card></Grid>
      <Grid size={{ xs: 12, lg: 5 }}><Card><CardContent><Typography fontWeight={700} mb={2}>Forecast Recommendations</Typography><Stack spacing={1}>{(forecasts.data ?? []).slice(0, 8).map((forecast) => <Box key={forecast.id} sx={{ p: 1.25, borderRadius: 1, bgcolor: "action.hover" }}><Typography fontWeight={700}>{forecast.product}</Typography><Typography variant="body2">Demand {forecast.predicted_demand} · Stock {forecast.current_stock}</Typography><Typography variant="caption" color={forecast.recommendation === "IMMEDIATE_RESTOCK" ? "error.main" : "success.main"}>{forecast.recommendation.replaceAll("_", " ")}</Typography></Box>)}</Stack></CardContent></Card></Grid></Grid>
    </DashboardLayout>
  );
}
