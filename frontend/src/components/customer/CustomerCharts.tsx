import { Card, CardContent, Grid, Typography } from "@mui/material";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

import type { Customer } from "../../api/customerApi";

interface Props {
  customers: Customer[];
}

export function CustomerCharts({ customers }: Props): React.JSX.Element {
  const spendingData = customers.map((customer) => ({
    name: customer.name,
    spent: customer.total_spent,
  }));

  const frequencyData = customers.map((customer) => ({
    name: customer.name,
    orders: customer.total_orders,
  }));

  const segmentMap = customers.reduce(
    (acc, customer) => {
      const key = customer.segment || "Regular";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const segmentData = Object.entries(segmentMap).map(([name, value]) => ({
    name,
    value,
  }));

  const colors = [
    "#1976d2",
    "#2e7d32",
    "#ed6c02",
    "#9c27b0",
    "#d32f2f",
    "#0288d1",
  ];

  return (
    <Grid container spacing={2} mb={3}>
      {/* Spending Trend */}
      <Grid
        size={{
          xs: 12,
          md: 6,
        }}
      >
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" fontWeight={700} mb={2}>
              Spending Trend
            </Typography>

            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={spendingData}>
                <CartesianGrid strokeDasharray="3 3" />

                <XAxis dataKey="name" />

                <YAxis />

                <Tooltip />

                <Legend />

                <Line type="monotone" dataKey="spent" name="Spent (₹)" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>

      {/* Purchase Frequency */}
      <Grid
        size={{
          xs: 12,
          md: 6,
        }}
      >
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" fontWeight={700} mb={2}>
              Purchase Frequency
            </Typography>

            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={frequencyData}>
                <CartesianGrid strokeDasharray="3 3" />

                <XAxis dataKey="name" />

                <YAxis />

                <Tooltip />

                <Legend />

                <Bar dataKey="orders" name="Orders" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>

      {/* Customer Segment */}
      <Grid size={12}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" fontWeight={700} mb={2}>
              Customer Segment Distribution
            </Typography>

            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={segmentData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={120}
                  label
                >
                  {segmentData.map((_, index) => (
                    <Cell key={index} fill={colors[index % colors.length]} />
                  ))}
                </Pie>

                <Tooltip />

                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}
