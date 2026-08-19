import { useState, type ReactElement } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { analyticsApi } from "../api/analyticsApi";
import { catalogApi } from "../api/catalogApi";
import { customerApi } from "../api/customerApi";
import { DashboardLayout } from "../layouts/DashboardLayout";
import KpiCards from "../components/analytics/KpiCards";
import { downloadPdf } from "../utils/download";

const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

export function AnalyticsPage() {
 const [datePreset, setDatePreset] = useState("custom");

const [filters, setFilters] = useState({
  from_date: "",
  to_date: "",
  product_id: "",
  category_id: "",
  customer_id: "",
  payment_method: "",
});
const products = useQuery({
  queryKey: ["analytics-products"],
  queryFn: () =>
    catalogApi
      .products({
        status: "ACTIVE",
        sort: "name",
      })
      .then((response) => response.data),
});

const categories = useQuery({
  queryKey: ["analytics-categories"],
  queryFn: () =>
    catalogApi.categories().then((response) => response.data),
});

const customers = useQuery({
  queryKey: ["analytics-customers"],
  queryFn: () =>
    customerApi
      .list({ status: "ACTIVE" })
      .then((response) => response.data),
});
const handleDatePreset = (preset: string) => {
  const now = new Date();

  if (preset === "this_month") {
    const firstDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
    );

    setFilters({
      ...filters,
      from_date: firstDay.toISOString(),
      to_date: now.toISOString(),
    });
  } else if (preset === "last_month") {
    const firstDay = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1,
    );

    const lastDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      0,
      23,
      59,
      59,
    );

    setFilters({
      ...filters,
      from_date: firstDay.toISOString(),
      to_date: lastDay.toISOString(),
    });
  } else {
    setFilters({
      ...filters,
      from_date: "",
      to_date: "",
    });
  }

  setDatePreset(preset);
};
  const dashboard = useQuery({
    queryKey: ["analytics", filters],
    queryFn: () =>
      analyticsApi.dashboard(filters).then((response) => response.data),
    refetchInterval: 60_000,
  });
  const data = dashboard.data;
  const exportCsv = async () => {
    if (!data) return;
    await analyticsApi.recordExport();
    const rows = [["Metric", "Value"], ...Object.entries(data.kpis)];
    const blob = new Blob([rows.map((row) => row.join(",")).join("\n")], {
      type: "text/csv",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "retailpulse-dashboard.csv";
    link.click();
    URL.revokeObjectURL(url);
  };
  const downloadPDF = () =>
    downloadPdf(analyticsApi.exportPDF, "analytics-report.pdf");
  return (
    <DashboardLayout>
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        mb={2}
      >
        <Box>
          <Typography variant="h4" fontWeight={800}>
            Retail analytics
          </Typography>
          <Typography color="text.secondary">
            Business KPIs from your sales and inventory data.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button onClick={() => dashboard.refetch()}>Refresh</Button>
          <Button variant="contained" onClick={exportCsv}>
            Export CSV
          </Button>
          <Button variant="contained" onClick={downloadPDF}>
            Download PDF
          </Button>
        </Stack>
      </Stack>
      <Stack
  direction={{ xs: "column", md: "row" }}
  spacing={1}
  mb={3}
  flexWrap="wrap"
>
  <Select
    displayEmpty
    value={datePreset}
    onChange={(e) =>
      handleDatePreset(String(e.target.value))
    }
    sx={{ minWidth: 170 }}
  >
    <MenuItem value="custom">Custom Range</MenuItem>
    <MenuItem value="this_month">This Month</MenuItem>
    <MenuItem value="last_month">Last Month</MenuItem>
  </Select>

  {datePreset === "custom" && (
    <>
      <TextField
        label="From"
        type="date"
        InputLabelProps={{ shrink: true }}
        value={filters.from_date}
        onChange={(e) =>
          setFilters({
            ...filters,
            from_date: e.target.value,
          })
        }
      />

      <TextField
        label="To"
        type="date"
        InputLabelProps={{ shrink: true }}
        value={filters.to_date}
        onChange={(e) =>
          setFilters({
            ...filters,
            to_date: e.target.value,
          })
        }
      />
    </>
  )}

  <Select
    displayEmpty
    value={filters.product_id}
    onChange={(e) =>
      setFilters({
        ...filters,
        product_id: String(e.target.value),
      })
    }
    sx={{ minWidth: 180 }}
  >
    <MenuItem value="">All Products</MenuItem>

    {(products.data ?? []).map((product) => (
      <MenuItem
        key={product.id}
        value={String(product.id)}
      >
        {product.name}
      </MenuItem>
    ))}
  </Select>

  <Select
    displayEmpty
    value={filters.category_id}
    onChange={(e) =>
      setFilters({
        ...filters,
        category_id: String(e.target.value),
      })
    }
    sx={{ minWidth: 180 }}
  >
    <MenuItem value="">All Categories</MenuItem>

    {(categories.data ?? []).map((category) => (
      <MenuItem
        key={category.id}
        value={String(category.id)}
      >
        {category.name}
      </MenuItem>
    ))}
  </Select>

  <Select
    displayEmpty
    value={filters.customer_id}
    onChange={(e) =>
      setFilters({
        ...filters,
        customer_id: String(e.target.value),
      })
    }
    sx={{ minWidth: 180 }}
  >
    <MenuItem value="">All Customers</MenuItem>

    {(customers.data ?? []).map((customer) => (
      <MenuItem
        key={customer.id}
        value={String(customer.id)}
      >
        {customer.full_name}
      </MenuItem>
    ))}
  </Select>

  <Select
    displayEmpty
    value={filters.payment_method}
    onChange={(e) =>
      setFilters({
        ...filters,
        payment_method: String(e.target.value),
      })
    }
    sx={{ minWidth: 180 }}
  >
    <MenuItem value="">All Payments</MenuItem>
    <MenuItem value="CASH">Cash</MenuItem>
    <MenuItem value="CARD">Card</MenuItem>
    <MenuItem value="UPI">UPI</MenuItem>
    <MenuItem value="BANK_TRANSFER">
      Bank Transfer
    </MenuItem>
  </Select>
</Stack>
      <Grid container spacing={2} mb={3}>
        {[
          [
            "Total Revenue",
            money(data?.kpis.total_revenue ?? 0),
            "/analytics/sales",
          ],
          ["Total Orders", data?.kpis.total_orders ?? 0, "/analytics/sales"],
          [
            "Products Sold",
            data?.kpis.products_sold ?? 0,
            "/analytics/products",
          ],
          [
            "Average Order",
            money(data?.kpis.average_order_value ?? 0),
            "/analytics/sales",
          ],
          [
            "Inventory Value",
            money(data?.kpis.inventory_value ?? 0),
            "/inventory",
          ],
          ["Low Stock", data?.kpis.low_stock_products ?? 0, "/inventory"],
          ["Out of Stock", data?.kpis.out_of_stock_products ?? 0, "/inventory"],
          [
            "Categories",
            data?.kpis.total_categories ?? 0,
            "/analytics/categories",
          ],
        ].map(([name, value, route]) => (
          <Grid key={String(name)} size={{ xs: 6, md: 3 }}>
            <KpiCards
              title={String(name)}
              value={value as string | number}
              route={String(route)}
            />
          </Grid>
        ))}
      </Grid>
      {!data && !dashboard.isLoading && (
        <Card>
          <CardContent>
            <Typography>No data is available for these filters.</Typography>
          </CardContent>
        </Card>
      )}
      <Grid container spacing={2}>
        {data && (
          <>
            <Chart title="Revenue trend">
              <LineChart data={data.revenue_trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#165dff" />
              </LineChart>
            </Chart>
            <Chart title="Top products">
              <BarChart data={data.top_products}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#165dff" />
              </BarChart>
            </Chart>
            <Chart title="Sales by payment">
              <PieChart>
                <Pie
                  data={data.payments}
                  dataKey="value"
                  nameKey="name"
                  fill="#7c4dff"
                  label
                />
              </PieChart>
            </Chart>
            <Chart title="Inventory by category">
              <BarChart data={data.inventory_categories}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#00a884" />
              </BarChart>
            </Chart>
          </>
        )}
      </Grid>
    </DashboardLayout>
  );
}
function Chart({ title, children }: { title: string; children: ReactElement }) {
  return (
    <Grid size={{ xs: 12, md: 6 }}>
      <Card variant="outlined">
        <CardContent>
          <Typography fontWeight={700} mb={2}>
            {title}
          </Typography>
          <ResponsiveContainer width="100%" height={280}>
            {children}
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </Grid>
  );
}
