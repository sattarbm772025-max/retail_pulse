import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
  TextField,
} from "@mui/material";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { catalogApi } from "../api/catalogApi";
import {
  inventoryApi,
  type ReplenishmentRecommendation,
  type ReplenishmentRisk,
} from "../api/inventoryApi";
import { DashboardLayout } from "../layouts/DashboardLayout";

const pageSize = 10;
const riskColor: Record<
  ReplenishmentRisk,
  "error" | "warning" | "success" | "info"
> = {
  OUT_OF_STOCK: "error",
  STOCKOUT_RISK: "error",
  LOW_STOCK: "warning",
  HEALTHY: "success",
  OVERSTOCK: "info",
};

const riskLabel = (risk: string) => risk.replaceAll("_", " ");

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <Card sx={{ borderTop: `4px solid ${accent}`, boxShadow: "none" }}>
      <CardContent>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h4" fontWeight={800} mt={0.5}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}

export function InventoryForecastPage() {
  const [filters, setFilters] = useState({
    forecastDays: 30,
    risk: "",
    categoryId: "",
    productId: "",
    supplier: "",
    reorderRequired: "",
    sort: "risk",
  });
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<ReplenishmentRecommendation | null>(
    null,
  );
  const [supplierInput, setSupplierInput] = useState("");

  const setFilter = (key: keyof typeof filters, value: string | number) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(0);
    setSelected(null);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFilters((current) =>
        current.supplier === supplierInput
          ? current
          : { ...current, supplier: supplierInput },
      );
      setPage(0);
      setSelected(null);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [supplierInput]);

  const categories = useQuery({
    queryKey: ["forecast-categories"],
    queryFn: () => catalogApi.categories().then((response) => response.data),
    staleTime: 5 * 60_000,
  });
  const products = useQuery({
    queryKey: ["forecast-products"],
    queryFn: () =>
      catalogApi
        .products({ status: "ACTIVE", sort: "name" })
        .then((response) => response.data),
    staleTime: 5 * 60_000,
  });
  const forecast = useQuery({
    queryKey: ["inventory-recommendations", filters, page],
    queryFn: () =>
      inventoryApi
        .recommendations({
          forecast_days: filters.forecastDays,
          risk: filters.risk || undefined,
          category_id: filters.categoryId || undefined,
          product_id: filters.productId || undefined,
          supplier: filters.supplier || undefined,
          reorder_required:
            filters.reorderRequired === ""
              ? undefined
              : filters.reorderRequired === "true",
          sort: filters.sort,
          page: page + 1,
          page_size: pageSize,
        })
        .then((response) => response.data),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const detail = useQuery({
    queryKey: [
      "inventory-recommendation-detail",
      selected?.product_id,
      filters.forecastDays,
    ],
    queryFn: () =>
      inventoryApi
        .recommendationDetail(selected!.product_id, filters.forecastDays)
        .then((response) => response.data),
    enabled: Boolean(selected),
    staleTime: 30_000,
  });

  const recommendation = forecast.data;
  const selectedDetail = detail.data;
  const projection = selectedDetail
    ? [
        {
          label: "Current",
          stock: selectedDetail.current_stock,
          threshold: selectedDetail.reorder_point,
        },
        {
          label: `${filters.forecastDays} day demand`,
          stock: Math.max(
            selectedDetail.current_stock - selectedDetail.forecasted_demand,
            0,
          ),
          threshold: selectedDetail.reorder_point,
        },
        {
          label: "Recommended",
          stock: selectedDetail.recommended_stock,
          threshold: selectedDetail.reorder_point,
        },
      ]
    : [];

  return (
    <DashboardLayout>
      <Stack spacing={3}>
        <Box
          sx={{
            p: { xs: 2, md: 3 },
            borderRadius: 4,
            color: "white",
            background: "linear-gradient(120deg, #071b45 0%, #155e75 100%)",
          }}
        >
          <Typography
            variant="overline"
            sx={{ letterSpacing: 2, opacity: 0.8 }}
          >
            SMART REPLENISHMENT WORKSPACE
          </Typography>
          <Typography variant="h3" fontWeight={800}>
            Inventory decision centre
          </Typography>
          <Typography sx={{ opacity: 0.8, maxWidth: 720 }}>
            Turn the last 30 days of sales into specific stock actions. Review
            risks, choose a product, then compare today’s stock with the
            recommended level.
          </Typography>
        </Box>

        {forecast.isError && (
          <Alert severity="error">
            Recommendations could not be calculated. Check inventory and sales
            data, then try again.
          </Alert>
        )}

        <Grid container spacing={2}>
          {forecast.isLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <Grid key={index} size={{ xs: 6, md: 3 }}>
                <Skeleton variant="rounded" height={115} />
              </Grid>
            ))
          ) : (
            <>
              <Grid size={{ xs: 6, md: 3 }}>
                <SummaryCard
                  label="Reorder required"
                  value={recommendation?.summary.requiring_reorder ?? 0}
                  accent="#f59e0b"
                />
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <SummaryCard
                  label="Stockout risk"
                  value={recommendation?.summary.stockout_risk ?? 0}
                  accent="#ef4444"
                />
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <SummaryCard
                  label="Overstocked"
                  value={recommendation?.summary.overstocked ?? 0}
                  accent="#38bdf8"
                />
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <SummaryCard
                  label="Healthy products"
                  value={recommendation?.summary.healthy ?? 0}
                  accent="#22c55e"
                />
              </Grid>
            </>
          )}
        </Grid>

        <Card sx={{ boxShadow: "none" }}>
          <CardContent>
            <Stack spacing={2}>
              <Typography fontWeight={800}>Recommendation controls</Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <FormControl fullWidth>
                    <InputLabel>Forecast period</InputLabel>
                    <Select
                      label="Forecast period"
                      value={filters.forecastDays}
                      onChange={(event) =>
                        setFilter("forecastDays", Number(event.target.value))
                      }
                    >
                      <MenuItem value={7}>Next 7 days</MenuItem>
                      <MenuItem value={30}>Next 30 days</MenuItem>
                      <MenuItem value={90}>Next 90 days</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <TextField
                    fullWidth
                    label="Supplier"
                    value={supplierInput}
                    onChange={(event) => setSupplierInput(event.target.value)}
                    placeholder="Search supplier"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <FormControl fullWidth>
                    <InputLabel>Risk</InputLabel>
                    <Select
                      label="Risk"
                      value={filters.risk}
                      onChange={(event) =>
                        setFilter("risk", event.target.value)
                      }
                    >
                      <MenuItem value="">All risks</MenuItem>
                      {Object.keys(riskColor).map((risk) => (
                        <MenuItem key={risk} value={risk}>
                          {riskLabel(risk)}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <FormControl fullWidth>
                    <InputLabel>Category</InputLabel>
                    <Select
                      label="Category"
                      value={filters.categoryId}
                      onChange={(event) =>
                        setFilter("categoryId", event.target.value)
                      }
                    >
                      <MenuItem value="">All categories</MenuItem>
                      {(categories.data ?? []).map((category) => (
                        <MenuItem key={category.id} value={category.id}>
                          {category.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <FormControl fullWidth>
                    <InputLabel>Product</InputLabel>
                    <Select
                      label="Product"
                      value={filters.productId}
                      onChange={(event) =>
                        setFilter("productId", event.target.value)
                      }
                    >
                      <MenuItem value="">All products</MenuItem>
                      {(products.data ?? []).map((product) => (
                        <MenuItem key={product.id} value={product.id}>
                          {product.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <FormControl fullWidth>
                    <InputLabel>Reorder</InputLabel>
                    <Select
                      label="Reorder"
                      value={filters.reorderRequired}
                      onChange={(event) =>
                        setFilter("reorderRequired", event.target.value)
                      }
                    >
                      <MenuItem value="">All products</MenuItem>
                      <MenuItem value="true">Required only</MenuItem>
                      <MenuItem value="false">Not required</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <FormControl fullWidth>
                    <InputLabel>Sort by</InputLabel>
                    <Select
                      label="Sort by"
                      value={filters.sort}
                      onChange={(event) =>
                        setFilter("sort", event.target.value)
                      }
                    >
                      <MenuItem value="risk">Risk level</MenuItem>
                      <MenuItem value="current_stock">Current stock</MenuItem>
                      <MenuItem value="forecasted_demand">
                        Forecast demand
                      </MenuItem>
                      <MenuItem value="days_remaining">Days remaining</MenuItem>
                      <MenuItem value="recommended_quantity">
                        Recommended quantity
                      </MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
              <Typography variant="caption" color="text.secondary">
                {recommendation?.formula}
              </Typography>
            </Stack>
          </CardContent>
        </Card>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, lg: selected ? 7 : 12 }}>
            <Card sx={{ boxShadow: "none" }}>
              <CardContent sx={{ p: 0 }}>
                <Box p={2}>
                  <Typography fontWeight={800}>
                    Prioritised replenishment queue
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Select any product to inspect its demand and recommended
                    stock level.
                  </Typography>
                </Box>
                {forecast.isLoading ? (
                  <Box p={2}>
                    <Skeleton height={360} />
                  </Box>
                ) : recommendation?.items.length ? (
                  <TableContainer>
                    <Table size="small" sx={{ minWidth: 1120 }}>
                      <TableHead>
                        <TableRow>
                          <TableCell>Product / SKU</TableCell>
                          <TableCell align="right">Stock</TableCell>
                          <TableCell align="right">Daily sales</TableCell>
                          <TableCell align="right">Forecast</TableCell>
                          <TableCell align="right">Days left</TableCell>
                          <TableCell align="right">Reorder point</TableCell>
                          <TableCell align="right">Order qty</TableCell>
                          <TableCell>Risk</TableCell>
                          <TableCell>Recommendation</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {recommendation.items.map((item) => (
                          <TableRow
                            hover
                            key={item.product_id}
                            selected={selected?.product_id === item.product_id}
                            onClick={() => setSelected(item)}
                            sx={{ cursor: "pointer" }}
                          >
                            <TableCell>
                              <Typography fontWeight={700}>
                                {item.product}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {item.sku} · {item.category}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              {item.current_stock}
                            </TableCell>
                            <TableCell align="right">
                              {item.average_daily_sales}
                            </TableCell>
                            <TableCell align="right">
                              {item.forecasted_demand}
                            </TableCell>
                            <TableCell align="right">
                              {item.days_of_stock_remaining ?? "—"}
                            </TableCell>
                            <TableCell align="right">
                              {item.reorder_point}
                            </TableCell>
                            <TableCell align="right">
                              <Typography
                                fontWeight={800}
                                color={
                                  item.reorder_required
                                    ? "warning.main"
                                    : "text.primary"
                                }
                              >
                                {item.recommended_reorder_quantity}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                color={riskColor[item.stock_risk]}
                                label={riskLabel(item.stock_risk)}
                              />
                            </TableCell>
                            <TableCell>{item.recommendation}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Box p={4}>
                    <Alert severity="info">
                      No products match these filters. Products without sales
                      remain visible with zero demand when no filter is applied.
                    </Alert>
                  </Box>
                )}
                <TablePagination
                  component="div"
                  count={recommendation?.total ?? 0}
                  page={page}
                  rowsPerPage={pageSize}
                  rowsPerPageOptions={[pageSize]}
                  onPageChange={(_, nextPage) => setPage(nextPage)}
                />
              </CardContent>
            </Card>
          </Grid>

          {selected && (
            <Grid size={{ xs: 12, lg: 5 }}>
              <Stack spacing={3}>
                <Card
                  sx={{ boxShadow: "none", borderTop: "4px solid #155e75" }}
                >
                  <CardContent>
                    <Typography variant="overline" color="primary">
                      Selected recommendation
                    </Typography>
                    <Typography variant="h5" fontWeight={800}>
                      {selected.product}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selected.sku} · {selected.category}
                    </Typography>
                    {detail.isLoading ? (
                      <Skeleton height={200} />
                    ) : (
                      selectedDetail && (
                        <Table size="small" sx={{ mt: 2 }}>
                          <TableHead>
                            <TableRow>
                              <TableCell>Metric</TableCell>
                              <TableCell align="right">Current</TableCell>
                              <TableCell align="right">Recommended</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            <TableRow>
                              <TableCell>Stock</TableCell>
                              <TableCell align="right">
                                <Typography
                                  color={
                                    selectedDetail.current_stock <
                                    selectedDetail.recommended_stock
                                      ? "error.main"
                                      : "text.primary"
                                  }
                                >
                                  {selectedDetail.current_stock}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                {selectedDetail.recommended_stock}
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>Daily demand</TableCell>
                              <TableCell align="right">
                                {selectedDetail.average_daily_sales}
                              </TableCell>
                              <TableCell align="right">
                                {selectedDetail.average_daily_sales}
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>Reorder point</TableCell>
                              <TableCell align="right">
                                {selectedDetail.reorder_point}
                              </TableCell>
                              <TableCell align="right">
                                {selectedDetail.reorder_point}
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>Safety stock</TableCell>
                              <TableCell align="right">
                                {selectedDetail.safety_stock}
                              </TableCell>
                              <TableCell align="right">
                                {selectedDetail.safety_stock}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      )
                    )}
                  </CardContent>
                </Card>
                <Card sx={{ boxShadow: "none" }}>
                  <CardContent>
                    <Typography fontWeight={800} mb={2}>
                      Demand history and stock projection
                    </Typography>
                    {detail.isLoading ? (
                      <Skeleton height={250} />
                    ) : (
                      selectedDetail && (
                        <Stack spacing={3}>
                          <Box height={220}>
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={selectedDetail.demand_history}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" hide />
                                <YAxis allowDecimals={false} />
                                <Tooltip />
                                <Line
                                  dataKey="demand"
                                  name="Daily demand"
                                  stroke="#2563eb"
                                  strokeWidth={2}
                                  dot={false}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </Box>
                          <Box height={220}>
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={projection}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="label" />
                                <YAxis allowDecimals={false} />
                                <Tooltip />
                                <Legend />
                                <ReferenceLine
                                  y={selectedDetail.reorder_point}
                                  stroke="#f59e0b"
                                  label="Reorder point"
                                />
                                <Bar
                                  dataKey="stock"
                                  name="Stock projection"
                                  fill="#155e75"
                                />
                              </BarChart>
                            </ResponsiveContainer>
                          </Box>
                        </Stack>
                      )
                    )}
                  </CardContent>
                </Card>
              </Stack>
            </Grid>
          )}
        </Grid>
      </Stack>
    </DashboardLayout>
  );
}
