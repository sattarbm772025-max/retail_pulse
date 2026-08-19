import { useMemo, useState } from "react";
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
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { DashboardLayout } from "../layouts/DashboardLayout";
import {
  analyticsApi,
  type ProductAnalytics,
} from "../api/analyticsApi";

/* =========================================================
   HELPERS
========================================================= */

const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);

const errorMessage = (error: unknown): string => {
  const detail = (
    error as {
      response?: {
        data?: {
          detail?: unknown;
        };
      };
    }
  )?.response?.data?.detail;

  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (
          typeof item === "object" &&
          item !== null &&
          "msg" in item
        ) {
          return String(
            (item as { msg?: unknown }).msg ?? "Validation error",
          );
        }

        return String(item);
      })
      .join(", ");
  }

  return "Unable to load product analytics.";
};

/* =========================================================
   PAGE
========================================================= */

export function ProductAnalyticsPage(): React.JSX.Element {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");

  const query = useQuery({
    queryKey: ["product-analytics"],
    queryFn: () =>
      analyticsApi
        .productAnalytics()
        .then((response) => response.data),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const data = query.data ?? [];

  /* -------------------------------------------------------
     FILTER PRODUCTS
  ------------------------------------------------------- */

  const categories = useMemo(() => {
    return Array.from(
      new Set(
        data
          .map((product) => product.category)
          .filter(Boolean),
      ),
    ).sort();
  }, [data]);

  const products = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return data.filter((product) => {
      const matchesSearch =
        !searchValue ||
        product.name.toLowerCase().includes(searchValue) ||
        product.brand.toLowerCase().includes(searchValue);

      const matchesCategory =
        !category || product.category === category;

      return matchesSearch && matchesCategory;
    });
  }, [data, search, category]);

  /* -------------------------------------------------------
     SUMMARY
  ------------------------------------------------------- */

  const totalRevenue = useMemo(
    () =>
      products.reduce(
        (sum, product) => sum + Number(product.revenue || 0),
        0,
      ),
    [products],
  );

  const totalUnits = useMemo(
    () =>
      products.reduce(
        (sum, product) => sum + Number(product.units_sold || 0),
        0,
      ),
    [products],
  );

  const totalStock = useMemo(
    () =>
      products.reduce(
        (sum, product) => sum + Number(product.stock || 0),
        0,
      ),
    [products],
  );

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <DashboardLayout>
      <Stack spacing={3}>
        {/* HEADER */}

        <Box>
          <Typography variant="h4" fontWeight={800}>
            Product Analytics
          </Typography>

          <Typography color="text.secondary">
            Analyze product sales, revenue and current inventory
            across your company.
          </Typography>
        </Box>

        {/* ERROR */}

        {query.error && (
          <Alert severity="error">
            {errorMessage(query.error)}
          </Alert>
        )}

        {/* KPI CARDS */}

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography color="text.secondary">
                  Products
                </Typography>

                <Typography variant="h4" fontWeight={800}>
                  {query.isLoading ? "..." : products.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography color="text.secondary">
                  Revenue
                </Typography>

                <Typography variant="h4" fontWeight={800}>
                  {query.isLoading ? "..." : money(totalRevenue)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography color="text.secondary">
                  Units Sold
                </Typography>

                <Typography variant="h4" fontWeight={800}>
                  {query.isLoading ? "..." : totalUnits}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Typography color="text.secondary">
                  Current Stock
                </Typography>

                <Typography variant="h4" fontWeight={800}>
                  {query.isLoading ? "..." : totalStock}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* FILTERS */}

        <Card variant="outlined">
          <CardContent>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2}
            >
              <TextField
                fullWidth
                label="Search Product / Brand"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
              />

              <FormControl sx={{ minWidth: 240 }}>
                <InputLabel>Category</InputLabel>

                <Select
                  value={category}
                  label="Category"
                  onChange={(event) =>
                    setCategory(String(event.target.value))
                  }
                >
                  <MenuItem value="">
                    All Categories
                  </MenuItem>

                  {categories.map((item) => (
                    <MenuItem key={item} value={item}>
                      {item}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </CardContent>
        </Card>

        {/* EMPTY STATE */}

        {!query.isLoading &&
          !query.error &&
          products.length === 0 && (
            <Alert severity="info">
              No products found for the selected filters.
            </Alert>
          )}

        {/* CHART */}

        {products.length > 0 && (
          <Card>
            <CardContent>
              <Typography
                variant="h6"
                fontWeight={700}
                mb={2}
              >
                Product Revenue
              </Typography>

              <Box height={350}>
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <BarChart data={products}>
                    <CartesianGrid strokeDasharray="3 3" />

                    <XAxis
                      dataKey="name"
                      interval={0}
                      angle={-25}
                      textAnchor="end"
                      height={80}
                    />

                    <YAxis />

                    <Tooltip
                      formatter={(value) =>
                        money(Number(value ?? 0))
                      }
                    />

                    <Bar
                      dataKey="revenue"
                      name="Revenue"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        )}

        {/* PRODUCT LIST */}

        {products.length > 0 && (
          <Card variant="outlined">
            <CardContent>
              <Typography
                variant="h6"
                fontWeight={700}
                mb={2}
              >
                Product Performance
              </Typography>

              <Grid container spacing={2}>
                {products.map((product) => (
                  <Grid
                    key={product.id}
                    size={{ xs: 12 }}
                  >
                    <Card variant="outlined">
                      <CardContent>
                        <Grid
                          container
                          spacing={2}
                          alignItems="center"
                        >
                          {/* PRODUCT */}

                          <Grid
                            size={{
                              xs: 12,
                              md: 3,
                            }}
                          >
                            <Typography fontWeight={700}>
                              {product.name}
                            </Typography>

                            <Typography
                              variant="body2"
                              color="text.secondary"
                            >
                              {product.brand || "No brand"}
                            </Typography>
                          </Grid>

                          {/* CATEGORY */}

                          <Grid
                            size={{
                              xs: 6,
                              md: 2,
                            }}
                          >
                            <Typography
                              variant="body2"
                              color="text.secondary"
                            >
                              Category
                            </Typography>

                            <Typography>
                              {product.category ||
                                "Uncategorized"}
                            </Typography>
                          </Grid>

                          {/* UNITS */}

                          <Grid
                            size={{
                              xs: 6,
                              md: 2,
                            }}
                          >
                            <Typography
                              variant="body2"
                              color="text.secondary"
                            >
                              Units Sold
                            </Typography>

                            <Typography fontWeight={700}>
                              {product.units_sold}
                            </Typography>
                          </Grid>

                          {/* REVENUE */}

                          <Grid
                            size={{
                              xs: 6,
                              md: 2,
                            }}
                          >
                            <Typography
                              variant="body2"
                              color="text.secondary"
                            >
                              Revenue
                            </Typography>

                            <Typography fontWeight={700}>
                              {money(product.revenue)}
                            </Typography>
                          </Grid>

                          {/* STOCK */}

                          <Grid
                            size={{
                              xs: 6,
                              md: 1.5,
                            }}
                          >
                            <Typography
                              variant="body2"
                              color="text.secondary"
                            >
                              Stock
                            </Typography>

                            <Typography fontWeight={700}>
                              {product.stock}
                            </Typography>
                          </Grid>

                          {/* STATUS */}

                          <Grid
                            size={{
                              xs: 12,
                              md: 1.5,
                            }}
                          >
                            <Typography
                              fontWeight={700}
                              color={
                                product.stock > 10
                                  ? "success.main"
                                  : product.stock > 0
                                    ? "warning.main"
                                    : "error.main"
                              }
                            >
                              {product.stock > 10
                                ? "Healthy"
                                : product.stock > 0
                                  ? "Low Stock"
                                  : "Out of Stock"}
                            </Typography>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        )}
      </Stack>
    </DashboardLayout>
  );
}