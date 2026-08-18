import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Card,
  CardContent,
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
import { DashboardLayout } from "../layouts/DashboardLayout";

const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);

export function SalesAnalyticsPage() {
  const [interval, setInterval] = useState("daily");
  const [range, setRange] = useState("30");
  const query = useQuery({
    queryKey: ["sales-business-intelligence", interval, range],
    queryFn: () => {
      const to = new Date();
      const from = new Date();
      from.setDate(to.getDate() - Number(range));
      return analyticsApi
        .salesBusinessIntelligence({
          interval,
          from_date: from.toISOString(),
          to_date: to.toISOString(),
        })
        .then((response) => response.data);
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  const summary = query.data?.summary;
  const cards = [
    ["Total Revenue", money(summary?.total_revenue ?? 0)],
    ["Total Orders", summary?.total_orders ?? 0],
    ["Average Order Value", money(summary?.average_order_value ?? 0)],
    ["Items Sold", summary?.total_items_sold ?? 0],
    ["Total Discount", money(summary?.total_discount ?? 0)],
    ["Total Tax", money(summary?.total_tax ?? 0)],
  ];
  return (
    <DashboardLayout>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" fontWeight={800}>
            Sales Analytics
          </Typography>
          <Typography color="text.secondary">
            Company-scoped business intelligence from aggregated sales data.
          </Typography>
        </Box>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <FormControl fullWidth>
              <InputLabel>Date Range</InputLabel>
              <Select
                label="Date Range"
                value={range}
                onChange={(e) => setRange(e.target.value)}
              >
                <MenuItem value="1">Today</MenuItem>
                <MenuItem value="7">Last 7 Days</MenuItem>
                <MenuItem value="30">Last 30 Days</MenuItem>
                <MenuItem value="90">Last 90 Days</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <FormControl fullWidth>
              <InputLabel>Trend</InputLabel>
              <Select
                label="Trend"
                value={interval}
                onChange={(e) => setInterval(e.target.value)}
              >
                <MenuItem value="daily">Daily</MenuItem>
                <MenuItem value="weekly">Weekly</MenuItem>
                <MenuItem value="monthly">Monthly</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
        {query.isError && (
          <Alert severity="error">
            Sales analytics could not be loaded. Check the selected date range
            and try again.
          </Alert>
        )}
        <Grid container spacing={2}>
          {cards.map(([title, value]) => (
            <Grid key={String(title)} size={{ xs: 6, md: 4, lg: 2 }}>
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
        {!query.isLoading && !query.data?.trend.length ? (
          <Alert severity="info">
            No sales data available for the selected period.
          </Alert>
        ) : (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, lg: 8 }}>
              <Card>
                <CardContent>
                  <Typography fontWeight={700} mb={2}>
                    Revenue and Orders
                  </Typography>
                  <Box height={320}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={query.data?.trend ?? []}>
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
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, lg: 4 }}>
              <Card>
                <CardContent>
                  <Typography fontWeight={700} mb={2}>
                    Payment Methods
                  </Typography>
                  <Box height={320}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={query.data?.payment_methods ?? []}
                          dataKey="revenue"
                          nameKey="name"
                          label
                        />
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, lg: 6 }}>
              <Card>
                <CardContent>
                  <Typography fontWeight={700} mb={2}>
                    Top Products
                  </Typography>
                  <Box height={280}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={query.data?.products ?? []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="revenue" fill="#165dff" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, lg: 6 }}>
              <Card>
                <CardContent>
                  <Typography fontWeight={700} mb={2}>
                    Top Customers
                  </Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Customer</TableCell>
                        <TableCell>Orders</TableCell>
                        <TableCell align="right">Spend</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(query.data?.customers ?? []).map((customer) => (
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
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </Stack>
    </DashboardLayout>
  );
}
