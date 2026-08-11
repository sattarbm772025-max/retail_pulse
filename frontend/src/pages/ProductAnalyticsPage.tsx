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
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

import { DashboardLayout } from "../layouts/DashboardLayout";
import { analyticsApi } from "../api/analyticsApi";

interface ProductAnalytics {
  id: number;
  name: string;
  category: string;
  brand: string;
  units_sold: number;
  revenue: number;
  stock: number;
}

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

  return "Unable to load product analytics.";
};

export function ProductAnalyticsPage(): React.JSX.Element {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");

  const { data, isLoading, error } = useQuery<ProductAnalytics[]>({
    queryKey: ["product-analytics"],
    queryFn: () =>
      analyticsApi.productAnalytics().then((response) => response.data),
  });

  const products = useMemo(() => {
    if (!data) return [];

    return data.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.brand.toLowerCase().includes(search.toLowerCase());

      const matchesCategory = category === "" || item.category === category;

      return matchesSearch && matchesCategory;
    });
  }, [data, search, category]);

  const categories = useMemo(() => {
    return [...new Set((data ?? []).map((p) => p.category))];
  }, [data]);

  const totalRevenue = products.reduce((sum, p) => sum + p.revenue, 0);

  const totalUnits = products.reduce((sum, p) => sum + p.units_sold, 0);

  const totalStock = products.reduce((sum, p) => sum + p.stock, 0);

  return (
    <DashboardLayout>
      <Typography variant="h4" fontWeight={700} mb={3}>
        Product Analytics
      </Typography>

      <Grid container spacing={2} mb={3}>
        <Grid size={{ xs: 12, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary">Products</Typography>

              <Typography variant="h4">{products.length}</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary">Revenue</Typography>

              <Typography variant="h4">₹{totalRevenue.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary">Units Sold</Typography>

              <Typography variant="h4">{totalUnits}</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary">Current Stock</Typography>

              <Typography variant="h4">{totalStock}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card variant="outlined">
        <CardContent>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} mb={3}>
            <TextField
              fullWidth
              label="Search Product / Brand"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <FormControl sx={{ minWidth: 220 }}>
              <InputLabel>Category</InputLabel>

              <Select
                value={category}
                label="Category"
                onChange={(e) => setCategory(e.target.value)}
              >
                <MenuItem value="">All Categories</MenuItem>

                {categories.map((item) => (
                  <MenuItem key={item} value={item}>
                    {item}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          {error && <Alert severity="error">{errorMessage(error)}</Alert>}

          {isLoading ? (
            <Typography>Loading product analytics...</Typography>
          ) : (
            <>
              <Box height={350} mb={4}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={products}>
                    <CartesianGrid strokeDasharray="3 3" />

                    <XAxis dataKey="name" />

                    <YAxis />

                    <Tooltip />

                    <Bar dataKey="revenue" name="Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
              <Grid container spacing={2}>
                {products.map((product) => (
                  <Grid key={product.id} size={{ xs: 12 }}>
                    <Card variant="outlined">
                      <CardContent>
                        <Grid container spacing={2} alignItems="center">
                          <Grid size={{ xs: 12, md: 3 }}>
                            <Typography fontWeight={700}>
                              {product.name}
                            </Typography>

                            <Typography variant="body2" color="text.secondary">
                              {product.brand}
                            </Typography>
                          </Grid>

                          <Grid size={{ xs: 6, md: 2 }}>
                            <Typography variant="body2" color="text.secondary">
                              Category
                            </Typography>

                            <Typography>{product.category}</Typography>
                          </Grid>

                          <Grid size={{ xs: 6, md: 2 }}>
                            <Typography variant="body2" color="text.secondary">
                              Units Sold
                            </Typography>

                            <Typography fontWeight={700}>
                              {product.units_sold}
                            </Typography>
                          </Grid>

                          <Grid size={{ xs: 6, md: 2 }}>
                            <Typography variant="body2" color="text.secondary">
                              Revenue
                            </Typography>

                            <Typography fontWeight={700}>
                              ₹{product.revenue.toFixed(2)}
                            </Typography>
                          </Grid>

                          <Grid size={{ xs: 6, md: 1.5 }}>
                            <Typography variant="body2" color="text.secondary">
                              Stock
                            </Typography>

                            <Typography fontWeight={700}>
                              {product.stock}
                            </Typography>
                          </Grid>

                          <Grid size={{ xs: 12, md: 1.5 }}>
                            <Typography
                              color={
                                product.stock > 10
                                  ? "success.main"
                                  : "error.main"
                              }
                              fontWeight={700}
                            >
                              {product.stock > 10 ? "Healthy" : "Low Stock"}
                            </Typography>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
