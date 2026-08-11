import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  Box,
  Card,
  CardContent,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";

import { DashboardLayout } from "../layouts/DashboardLayout";
import { analyticsApi } from "../api/analyticsApi";

export function SalesAnalyticsPage() {
  const [channel, setChannel] = useState("");
  const [payment, setPayment] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["sales-analytics", channel, payment, fromDate, toDate],
    queryFn: () =>
      analyticsApi
        .dashboard({
          channel: channel || undefined,
          payment_method: payment || undefined,
          from_date: fromDate || undefined,
          to_date: toDate || undefined,
        })
        .then((res) => res.data),
  });

  const kpis = data?.kpis;

  return (
    <DashboardLayout>
      <Stack spacing={3}>
        <Typography variant="h4" fontWeight={800}>
          Sales Analytics
        </Typography>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField
              fullWidth
              type="date"
              label="From"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 3 }}>
            <TextField
              fullWidth
              type="date"
              label="To"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 3 }}>
            <FormControl fullWidth>
              <InputLabel>Channel</InputLabel>

              <Select
                label="Channel"
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="RETAIL_STORE">Retail Store</MenuItem>
                <MenuItem value="ONLINE_STORE">Online Store</MenuItem>
                <MenuItem value="MARKETPLACE">Marketplace</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, md: 3 }}>
            <FormControl fullWidth>
              <InputLabel>Payment</InputLabel>

              <Select
                label="Payment"
                value={payment}
                onChange={(e) => setPayment(e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="CASH">Cash</MenuItem>
                <MenuItem value="CARD">Card</MenuItem>
                <MenuItem value="UPI">UPI</MenuItem>
                <MenuItem value="BANK_TRANSFER">Bank Transfer</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        <Grid container spacing={2}>
          <Grid size={{ xs: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography variant="body2">Revenue</Typography>

                <Typography variant="h5" fontWeight={700}>
                  ₹{kpis?.total_revenue?.toFixed(2) ?? "0.00"}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography variant="body2">Orders</Typography>

                <Typography variant="h5" fontWeight={700}>
                  {kpis?.total_orders ?? 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography variant="body2">Products Sold</Typography>

                <Typography variant="h5" fontWeight={700}>
                  {kpis?.products_sold ?? 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography variant="body2">Average Order</Typography>

                <Typography variant="h5" fontWeight={700}>
                  ₹{kpis?.average_order_value?.toFixed(2) ?? "0.00"}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, lg: 8 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={700} mb={2}>
                  Revenue Trend
                </Typography>

                <Box height={350}>
                  <ResponsiveContainer>
                    <LineChart data={data?.revenue_trend ?? []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />

                      <Line type="monotone" dataKey="value" name="Revenue" />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, lg: 4 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={700} mb={2}>
                  Payment Methods
                </Typography>

                <Box height={300}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={data?.payments ?? []}
                        dataKey="value"
                        nameKey="name"
                        outerRadius={100}
                        label
                      >
                        {(data?.payments ?? []).map((_, index) => (
                          <Cell key={index} />
                        ))}
                      </Pie>

                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={700} mb={2}>
                  Sales Channel Performance
                </Typography>

                <Box height={350}>
                  <ResponsiveContainer>
                    <BarChart data={data?.channels ?? []}>
                      <CartesianGrid strokeDasharray="3 3" />

                      <XAxis dataKey="name" />

                      <YAxis />

                      <Tooltip />

                      <Legend />

                      <Bar dataKey="value" name="Revenue" />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={700} mb={2}>
                  Revenue by Payment Method
                </Typography>

                {(data?.payments ?? []).map((payment: any) => (
                  <Box
                    key={payment.name}
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      py: 1,
                      borderBottom: "1px solid #eee",
                    }}
                  >
                    <Typography>{payment.name}</Typography>

                    <Typography fontWeight={700}>
                      ₹{payment.value.toFixed(2)}
                    </Typography>
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={700} mb={2}>
                  Sales Channel Summary
                </Typography>

                {(data?.channels ?? []).map((channel: any) => (
                  <Box
                    key={channel.name}
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      py: 1,
                      borderBottom: "1px solid #eee",
                    }}
                  >
                    <Typography>{channel.name.replace("_", " ")}</Typography>

                    <Typography fontWeight={700}>
                      ₹{channel.value.toFixed(2)}
                    </Typography>
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {isLoading && (
          <Typography align="center">Loading sales analytics...</Typography>
        )}
      </Stack>
    </DashboardLayout>
  );
}
