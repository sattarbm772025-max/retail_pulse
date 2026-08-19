import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Skeleton,
  Stack,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { analyticsApi } from "../api/analyticsApi";
import { catalogApi } from "../api/catalogApi";
import { customerApi } from "../api/customerApi";
import { DashboardLayout } from "../layouts/DashboardLayout";
import { downloadPdf } from "../utils/download";

type Interval = "daily" | "weekly" | "monthly";

type DatePreset =
  | "today"
  | "last_7_days"
  | "last_30_days"
  | "this_month"
  | "last_month"
  | "custom";

const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

/*
 * ---------------------------------------------------------
 * DATE RANGE HELPER
 * ---------------------------------------------------------
 */

const getDateRange = (
  preset: DatePreset,
  customFrom: string,
  customTo: string,
) => {
  const now = new Date();

  const endOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999,
  );

  if (preset === "today") {
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return { from_date: from.toISOString(), to_date: endOfToday.toISOString() };
  }

  if (preset === "last_7_days" || preset === "last_30_days") {
    const days = preset === "last_7_days" ? 6 : 29;
    const from = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - days,
    );
    return { from_date: from.toISOString(), to_date: endOfToday.toISOString() };
  }

  if (preset === "this_month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);

    return {
      from_date: from.toISOString(),
      to_date: now.toISOString(),
    };
  }

  if (preset === "last_month") {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    return {
      from_date: from.toISOString(),
      to_date: to.toISOString(),
    };
  }

  if (preset === "custom") {
    return {
      from_date: customFrom
        ? new Date(`${customFrom}T00:00:00`).toISOString()
        : undefined,

      to_date: customTo
        ? new Date(`${customTo}T23:59:59.999`).toISOString()
        : undefined,
    };
  }

  return {
    from_date: undefined,
    to_date: undefined,
  };
};

/*
 * ---------------------------------------------------------
 * PAGE
 * ---------------------------------------------------------
 */

export function SalesAnalyticsPage() {
  /*
   * -------------------------------------------------------
   * FILTER STATE
   * -------------------------------------------------------
   */

  const [interval, setInterval] = useState<Interval>("daily");

  const [productId, setProductId] = useState<number | undefined>();

  const [categoryId, setCategoryId] = useState<number | undefined>();

  const [customerId, setCustomerId] = useState<number | undefined>();

  const [paymentMethod, setPaymentMethod] = useState("");

  const [productSort, setProductSort] = useState<"revenue" | "quantity">(
    "revenue",
  );

  const [datePreset, setDatePreset] = useState<DatePreset>("this_month");

  const [fromDate, setFromDate] = useState("");

  const [toDate, setToDate] = useState("");

  /*
   * -------------------------------------------------------
   * DATE RANGE
   * -------------------------------------------------------
   */

  const dateRange = useMemo(
    () => getDateRange(datePreset, fromDate, toDate),
    [datePreset, fromDate, toDate],
  );

  /*
   * -------------------------------------------------------
   * PRODUCTS
   * -------------------------------------------------------
   *
   * If your productApi function has a different name,
   * change only this section.
   */

  const productsQuery = useQuery({
    queryKey: ["analytics-products"],

    queryFn: () =>
      catalogApi
        .products({ status: "ACTIVE", sort: "name" })
        .then((response) => response.data),

    staleTime: 60_000,
  });

  /*
   * -------------------------------------------------------
   * CATEGORIES
   * -------------------------------------------------------
   */

  const categoriesQuery = useQuery({
    queryKey: ["analytics-categories"],

    queryFn: () => catalogApi.categories().then((response) => response.data),

    staleTime: 60_000,
  });

  /*
   * -------------------------------------------------------
   * CUSTOMERS
   * -------------------------------------------------------
   */

  const customersQuery = useQuery({
    queryKey: ["analytics-customers"],

    queryFn: () =>
      customerApi.list({ sort: "name" }).then((response) => response.data),

    staleTime: 60_000,
  });

  /*
   * -------------------------------------------------------
   * SALES ANALYTICS QUERY
   * -------------------------------------------------------
   *
   * IMPORTANT:
   * Every filter is included in the queryKey.
   *
   * Every filter is also passed to the backend.
   */

  const query = useQuery({
    queryKey: [
      "sales-business-intelligence",

      interval,

      productId,
      categoryId,
      customerId,
      paymentMethod,
      productSort,

      datePreset,
      fromDate,
      toDate,
    ],

    queryFn: () =>
      analyticsApi
        .salesBusinessIntelligence({
          interval,

          from_date: dateRange.from_date,

          to_date: dateRange.to_date,

          product_id: productId,

          category_id: categoryId,

          customer_id: customerId,

          payment_method: paymentMethod || undefined,

          sort_by: productSort,
        })
        .then((response) => response.data),

    refetchInterval: 60_000,

    staleTime: 30_000,
  });

  /*
   * -------------------------------------------------------
   * DATA
   * -------------------------------------------------------
   */

  const summary = query.data?.summary;

  const trend = query.data?.trend ?? [];

  const paymentMethods = query.data?.payment_methods ?? [];

  const products = query.data?.products ?? [];

  const customers = query.data?.customers ?? [];

  /*
   * -------------------------------------------------------
   * FILTER DATA NORMALIZATION
   * -------------------------------------------------------
   *
   * Supports either:
   *
   * response.data.items
   *
   * or
   *
   * response.data
   */

  const productItems = productsQuery.data?.items ?? productsQuery.data ?? [];

  const categoryItems =
    categoriesQuery.data?.items ?? categoriesQuery.data ?? [];

  const customerItems = customersQuery.data?.items ?? customersQuery.data ?? [];

  /*
   * -------------------------------------------------------
   * CLEAR FILTERS
   * -------------------------------------------------------
   */

  const clearFilters = () => {
    setProductId(undefined);

    setCategoryId(undefined);

    setCustomerId(undefined);

    setPaymentMethod("");

    setDatePreset("this_month");

    setFromDate("");

    setToDate("");

    setInterval("daily");
    setProductSort("revenue");
  };

  const exportFilters = {
    interval,
    from_date: dateRange.from_date,
    to_date: dateRange.to_date,
    product_id: productId,
    category_id: categoryId,
    customer_id: customerId,
    payment_method: paymentMethod || undefined,
    sort_by: productSort,
  };

  const downloadCsv = async () => {
    const response = await analyticsApi.exportSalesCsv(exportFilters);
    const url = window.URL.createObjectURL(
      new Blob([response.data], { type: "text/csv" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "sales-analytics.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  /*
   * -------------------------------------------------------
   * KPI CARDS
   * -------------------------------------------------------
   */

  const cards = [
    ["Total Revenue", money(summary?.total_revenue ?? 0)],

    ["Total Orders", summary?.total_orders ?? 0],

    ["Average Order Value", money(summary?.average_order_value ?? 0)],

    ["Items Sold", summary?.total_items_sold ?? 0],

    ["Total Discount", money(summary?.total_discount ?? 0)],

    ["Total Tax", money(summary?.total_tax ?? 0)],
  ];

  /*
   * -------------------------------------------------------
   * RENDER
   * -------------------------------------------------------
   */

  return (
    <DashboardLayout>
      <Stack spacing={3}>
        {/* ------------------------------------------------ */}
        {/* HEADER */}
        {/* ------------------------------------------------ */}

        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          spacing={1}
        >
          <Box>
            <Typography variant="h4" fontWeight={800}>
              Sales Analytics
            </Typography>
            <Typography color="text.secondary">
              Company-scoped business intelligence from aggregated sales data.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={downloadCsv}>
              Download CSV
            </Button>
            <Button
              variant="contained"
              onClick={() =>
                downloadPdf(
                  () => analyticsApi.exportSalesPdf(exportFilters),
                  "sales-analytics.pdf",
                )
              }
            >
              Download PDF
            </Button>
          </Stack>
        </Stack>

        {/* ------------------------------------------------ */}
        {/* FILTERS */}
        {/* ------------------------------------------------ */}

        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h6" fontWeight={700}>
                Filters
              </Typography>

              <Grid container spacing={2}>
                {/* DATE RANGE */}

                <Grid
                  size={{
                    xs: 12,
                    sm: 6,
                    md: 3,
                  }}
                >
                  <FormControl fullWidth>
                    <InputLabel>Date Range</InputLabel>

                    <Select
                      label="Date Range"
                      value={datePreset}
                      onChange={(event) => {
                        const value = event.target.value as DatePreset;

                        setDatePreset(value);

                        if (value !== "custom") {
                          setFromDate("");
                          setToDate("");
                        }
                      }}
                    >
                      <MenuItem value="today">Today</MenuItem>
                      <MenuItem value="last_7_days">Last 7 Days</MenuItem>
                      <MenuItem value="last_30_days">Last 30 Days</MenuItem>
                      <MenuItem value="this_month">This Month</MenuItem>

                      <MenuItem value="last_month">Last Month</MenuItem>

                      <MenuItem value="custom">Custom Range</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {/* CUSTOM FROM */}

                {datePreset === "custom" && (
                  <Grid
                    size={{
                      xs: 12,
                      sm: 6,
                      md: 3,
                    }}
                  >
                    <TextField
                      fullWidth
                      label="From Date"
                      type="date"
                      value={fromDate}
                      onChange={(event) => setFromDate(event.target.value)}
                      slotProps={{
                        inputLabel: {
                          shrink: true,
                        },
                      }}
                    />
                  </Grid>
                )}

                {/* CUSTOM TO */}

                {datePreset === "custom" && (
                  <Grid
                    size={{
                      xs: 12,
                      sm: 6,
                      md: 3,
                    }}
                  >
                    <TextField
                      fullWidth
                      label="To Date"
                      type="date"
                      value={toDate}
                      onChange={(event) => setToDate(event.target.value)}
                      slotProps={{
                        inputLabel: {
                          shrink: true,
                        },
                      }}
                    />
                  </Grid>
                )}

                {/* TREND */}

                <Grid
                  size={{
                    xs: 12,
                    sm: 6,
                    md: 3,
                  }}
                >
                  <FormControl fullWidth>
                    <InputLabel>Trend</InputLabel>

                    <Select
                      label="Trend"
                      value={interval}
                      onChange={(event) =>
                        setInterval(event.target.value as Interval)
                      }
                    >
                      <MenuItem value="daily">Daily</MenuItem>

                      <MenuItem value="weekly">Weekly</MenuItem>

                      <MenuItem value="monthly">Monthly</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {/* PRODUCT */}

                <Grid
                  size={{
                    xs: 12,
                    sm: 6,
                    md: 3,
                  }}
                >
                  <FormControl fullWidth>
                    <InputLabel>Product</InputLabel>

                    <Select
                      label="Product"
                      value={productId ?? ""}
                      onChange={(event) => {
                        const value = event.target.value;

                        setProductId(value === "" ? undefined : Number(value));
                      }}
                    >
                      <MenuItem value="">All Products</MenuItem>

                      {productItems.map((product: any) => (
                        <MenuItem key={product.id} value={product.id}>
                          {product.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* CATEGORY */}

                <Grid
                  size={{
                    xs: 12,
                    sm: 6,
                    md: 3,
                  }}
                >
                  <FormControl fullWidth>
                    <InputLabel>Category</InputLabel>

                    <Select
                      label="Category"
                      value={categoryId ?? ""}
                      onChange={(event) => {
                        const value = event.target.value;

                        setCategoryId(value === "" ? undefined : Number(value));
                      }}
                    >
                      <MenuItem value="">All Categories</MenuItem>

                      {categoryItems.map((category: any) => (
                        <MenuItem key={category.id} value={category.id}>
                          {category.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* CUSTOMER */}

                <Grid
                  size={{
                    xs: 12,
                    sm: 6,
                    md: 3,
                  }}
                >
                  <FormControl fullWidth>
                    <InputLabel>Customer</InputLabel>

                    <Select
                      label="Customer"
                      value={customerId ?? ""}
                      onChange={(event) => {
                        const value = event.target.value;

                        setCustomerId(value === "" ? undefined : Number(value));
                      }}
                    >
                      <MenuItem value="">All Customers</MenuItem>

                      {customerItems.map((customer: any) => (
                        <MenuItem key={customer.id} value={customer.id}>
                          {customer.full_name ?? customer.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* PAYMENT METHOD */}

                <Grid
                  size={{
                    xs: 12,
                    sm: 6,
                    md: 3,
                  }}
                >
                  <FormControl fullWidth>
                    <InputLabel>Payment Method</InputLabel>

                    <Select
                      label="Payment Method"
                      value={paymentMethod}
                      onChange={(event) => setPaymentMethod(event.target.value)}
                    >
                      <MenuItem value="">All Payment Methods</MenuItem>

                      <MenuItem value="CASH">Cash</MenuItem>

                      <MenuItem value="CARD">Card</MenuItem>

                      <MenuItem value="UPI">UPI</MenuItem>

                      <MenuItem value="BANK_TRANSFER">Bank Transfer</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {/* CLEAR */}

                <Grid
                  size={{
                    xs: 12,
                  }}
                >
                  <Button variant="outlined" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                </Grid>
              </Grid>
            </Stack>
          </CardContent>
        </Card>

        {/* ------------------------------------------------ */}
        {/* ANALYTICS ERROR */}
        {/* ------------------------------------------------ */}

        {query.isError && (
          <Alert severity="error">
            Sales analytics could not be loaded. Check the selected filters and
            try again.
          </Alert>
        )}

        {/* ------------------------------------------------ */}
        {/* KPI CARDS */}
        {/* ------------------------------------------------ */}

        <Grid container spacing={2}>
          {cards.map(([title, value]) => (
            <Grid
              key={String(title)}
              size={{
                xs: 6,
                md: 4,
                lg: 2,
              }}
            >
              <Card>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">
                    {title}
                  </Typography>

                  {query.isLoading ? (
                    <Skeleton width="70%" />
                  ) : (
                    <Typography variant="h6" fontWeight={800}>
                      {value}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* ------------------------------------------------ */}
        {/* EMPTY STATE */}
        {/* ------------------------------------------------ */}

        {!query.isLoading && !query.isError && !trend.length && (
          <Alert severity="info">
            No sales data available for the selected filters.
          </Alert>
        )}

        {/* ------------------------------------------------ */}
        {/* CHARTS AND TABLE */}
        {/* ------------------------------------------------ */}

        {!query.isError && (query.isLoading || trend.length > 0) && (
          <Grid container spacing={3}>
            {/* REVENUE + ORDERS */}

            <Grid
              size={{
                xs: 12,
                lg: 8,
              }}
            >
              <Card>
                <CardContent>
                  <Typography fontWeight={700} mb={2}>
                    Revenue and Orders
                  </Typography>

                  {query.isLoading ? (
                    <Skeleton variant="rectangular" height={320} />
                  ) : (
                    <Box height={320}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trend}>
                          <CartesianGrid strokeDasharray="3 3" />

                          <XAxis dataKey="period" />

                          <YAxis yAxisId="revenue" />

                          <YAxis yAxisId="orders" orientation="right" />

                          <Tooltip />

                          <Legend />

                          <Line
                            yAxisId="revenue"
                            dataKey="revenue"
                            name="Revenue"
                            stroke="#165dff"
                          />

                          <Line
                            yAxisId="orders"
                            dataKey="orders"
                            name="Orders"
                            stroke="#00a37a"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* PAYMENT METHODS */}

            <Grid
              size={{
                xs: 12,
                lg: 4,
              }}
            >
              <Card>
                <CardContent>
                  <Typography fontWeight={700} mb={2}>
                    Payment Methods
                  </Typography>

                  {query.isLoading ? (
                    <Skeleton variant="rectangular" height={320} />
                  ) : (
                    <Box height={320}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={paymentMethods}
                            dataKey="revenue"
                            nameKey="name"
                            label
                          />

                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* TOP PRODUCTS */}

            <Grid
              size={{
                xs: 12,
                lg: 6,
              }}
            >
              <Card>
                <CardContent>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    mb={2}
                  >
                    <Typography fontWeight={700}>Top Products</Typography>
                    <FormControl size="small" sx={{ minWidth: 155 }}>
                      <Select
                        value={productSort}
                        onChange={(event) =>
                          setProductSort(
                            event.target.value as "revenue" | "quantity",
                          )
                        }
                      >
                        <MenuItem value="revenue">Sort: Revenue</MenuItem>
                        <MenuItem value="quantity">Sort: Quantity</MenuItem>
                      </Select>
                    </FormControl>
                  </Stack>

                  {query.isLoading ? (
                    <Skeleton variant="rectangular" height={280} />
                  ) : (
                    <Box height={280}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={products}>
                          <CartesianGrid strokeDasharray="3 3" />

                          <XAxis dataKey="name" />

                          <YAxis />

                          <Tooltip />

                          <Bar
                            dataKey={
                              productSort === "revenue"
                                ? "revenue"
                                : "units_sold"
                            }
                            fill="#165dff"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* TOP CUSTOMERS */}

            <Grid
              size={{
                xs: 12,
                lg: 6,
              }}
            >
              <Card>
                <CardContent>
                  <Typography fontWeight={700} mb={2}>
                    Top Customers
                  </Typography>

                  {query.isLoading ? (
                    <Stack spacing={1}>
                      <Skeleton />
                      <Skeleton />
                      <Skeleton />
                      <Skeleton />
                      <Skeleton />
                    </Stack>
                  ) : (
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Customer</TableCell>

                          <TableCell>Orders</TableCell>

                          <TableCell align="right">Spend</TableCell>
                        </TableRow>
                      </TableHead>

                      <TableBody>
                        {customers.map((customer: any) => (
                          <TableRow key={customer.id}>
                            <TableCell>{customer.name}</TableCell>

                            <TableCell>{customer.orders}</TableCell>

                            <TableCell align="right">
                              {money(customer.total_spend)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </Stack>
    </DashboardLayout>
  );
}
