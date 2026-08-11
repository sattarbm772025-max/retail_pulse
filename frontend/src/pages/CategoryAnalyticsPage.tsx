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
  BarChart,
  Bar,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { DashboardLayout } from "../layouts/DashboardLayout";
import { analyticsApi } from "../api/analyticsApi";
import { catalogApi } from "../api/catalogApi";

export function CategoryAnalyticsPage() {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => catalogApi.categories().then((res) => res.data),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["category-analytics", categoryId],
    queryFn: () =>
      analyticsApi
        .dashboard({
          category_id: categoryId || undefined,
        })
        .then((res) => res.data),
  });

  const categoryData =
    data?.categories.filter((item: any) =>
      item.name.toLowerCase().includes(search.toLowerCase()),
    ) ?? [];

  return (
    <DashboardLayout>
      <Stack spacing={3}>
        <Typography variant="h4" fontWeight={800}>
          Category Analytics
        </Typography>

        <Grid container spacing={2}>
          <Grid
            size={{
              xs: 12,
              md: 6,
            }}
          >
            <TextField
              fullWidth
              label="Search Category"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </Grid>

          <Grid
            size={{
              xs: 12,
              md: 6,
            }}
          >
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>

              <Select
                label="Category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <MenuItem value="">All Categories</MenuItem>

                {categories.map((category: any) => (
                  <MenuItem key={category.id} value={category.id}>
                    {category.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        <Grid container spacing={2}>
          <Grid
            size={{
              xs: 12,
              md: 3,
            }}
          >
            <Card>
              <CardContent>
                <Typography variant="body2">Total Categories</Typography>

                <Typography variant="h4">{categoryData.length}</Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid
            size={{
              xs: 12,
              md: 3,
            }}
          >
            <Card>
              <CardContent>
                <Typography variant="body2">Revenue</Typography>

                <Typography variant="h4">
                  ₹
                  {categoryData
                    .reduce((sum: number, item: any) => sum + item.value, 0)
                    .toFixed(2)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid
            size={{
              xs: 12,
              md: 6,
            }}
          >
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={700} mb={2}>
                  Revenue by Category
                </Typography>

                <Box height={350}>
                  <ResponsiveContainer>
                    <BarChart data={categoryData}>
                      <CartesianGrid strokeDasharray="3 3" />

                      <XAxis dataKey="name" />

                      <YAxis />

                      <Tooltip />

                      <Bar dataKey="value" name="Revenue" />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight={700} mb={2}>
              Category Performance
            </Typography>

            {isLoading ? (
              <Typography>Loading...</Typography>
            ) : categoryData.length === 0 ? (
              <Typography color="text.secondary">
                No category data found.
              </Typography>
            ) : (
              <Grid container spacing={2}>
                {categoryData.map((category: any) => (
                  <Grid key={category.name} size={{ xs: 12 }}>
                    <Card variant="outlined">
                      <CardContent>
                        <Grid container spacing={2} alignItems="center">
                          <Grid
                            size={{
                              xs: 12,
                              md: 5,
                            }}
                          >
                            <Typography fontWeight={700}>
                              {category.name}
                            </Typography>

                            <Typography variant="body2" color="text.secondary">
                              Product Category
                            </Typography>
                          </Grid>

                          <Grid
                            size={{
                              xs: 6,
                              md: 3,
                            }}
                          >
                            <Typography variant="body2" color="text.secondary">
                              Revenue
                            </Typography>

                            <Typography fontWeight={700}>
                              ₹{category.value.toFixed(2)}
                            </Typography>
                          </Grid>

                          <Grid
                            size={{
                              xs: 6,
                              md: 4,
                            }}
                          >
                            <Typography variant="body2" color="text.secondary">
                              Performance
                            </Typography>

                            <Typography
                              fontWeight={700}
                              color={
                                category.value > 10000
                                  ? "success.main"
                                  : "warning.main"
                              }
                            >
                              {category.value > 10000
                                ? "High Revenue"
                                : "Average Revenue"}
                            </Typography>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </CardContent>
        </Card>
      </Stack>
    </DashboardLayout>
  );
}
