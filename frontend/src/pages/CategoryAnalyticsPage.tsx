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
import { analyticsApi } from "../api/analyticsApi";
import { catalogApi } from "../api/catalogApi";

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
            (item as { msg?: unknown }).msg ??
              "Validation error",
          );
        }

        return String(item);
      })
      .join(", ");
  }

  return "Unable to load category analytics.";
};

/* =========================================================
   PAGE
========================================================= */

export function CategoryAnalyticsPage(): React.JSX.Element {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");

  /* -------------------------------------------------------
     LOAD CATEGORIES
  ------------------------------------------------------- */

  const categoriesQuery = useQuery({
    queryKey: ["analytics-categories"],
    queryFn: () =>
      catalogApi
        .categories()
        .then((response) => response.data),
    staleTime: 60_000,
  });

  /* -------------------------------------------------------
     ALL CATEGORY ANALYTICS
  ------------------------------------------------------- */

  const allCategoriesQuery = useQuery({
    queryKey: ["category-analytics-all"],
    queryFn: () =>
      analyticsApi
        .dashboard()
        .then((response) => response.data),
    enabled: categoryId === "",
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  /* -------------------------------------------------------
     SINGLE CATEGORY DETAILS
  ------------------------------------------------------- */

  const categoryDetailsQuery = useQuery({
    queryKey: [
      "category-analytics-details",
      categoryId,
    ],
    queryFn: () =>
      analyticsApi
        .categoryDetails(Number(categoryId))
        .then((response) => response.data),
    enabled: categoryId !== "",
    staleTime: 30_000,
  });

  /* -------------------------------------------------------
     ALL CATEGORY DATA
  ------------------------------------------------------- */

  const allCategoryData = useMemo(() => {
    if (categoryId !== "") {
      return [];
    }

    return allCategoriesQuery.data?.categories ?? [];
  }, [allCategoriesQuery.data, categoryId]);

  /* -------------------------------------------------------
     SEARCH FILTER
  ------------------------------------------------------- */

  const filteredCategories = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) {
      return allCategoryData;
    }

    return allCategoryData.filter((category) =>
      category.name.toLowerCase().includes(value),
    );
  }, [allCategoryData, search]);

  /* -------------------------------------------------------
     SELECTED CATEGORY
  ------------------------------------------------------- */

  const selectedCategory =
    categoryDetailsQuery.data;

  /* -------------------------------------------------------
     SUMMARY
  ------------------------------------------------------- */

  const totalRevenue = useMemo(() => {
    if (categoryId !== "") {
      return Number(
        selectedCategory?.total_revenue ?? 0,
      );
    }

    return filteredCategories.reduce(
      (sum, category) =>
        sum + Number(category.value || 0),
      0,
    );
  }, [
    categoryId,
    selectedCategory,
    filteredCategories,
  ]);

  const totalProducts =
    categoryId !== ""
      ? selectedCategory?.total_products ?? 0
      : filteredCategories.length;

  const totalStock =
    categoryId !== ""
      ? selectedCategory?.total_stock ?? 0
      : 0;

  const totalUnitsSold =
    categoryId !== ""
      ? selectedCategory?.total_units_sold ?? 0
      : 0;

  const loading =
    categoriesQuery.isLoading ||
    allCategoriesQuery.isLoading ||
    categoryDetailsQuery.isLoading;

  const error =
    categoriesQuery.error ||
    allCategoriesQuery.error ||
    categoryDetailsQuery.error;

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <DashboardLayout>
      <Stack spacing={3}>
        {/* HEADER */}

        <Box>
          <Typography
            variant="h4"
            fontWeight={800}
          >
            Category Analytics
          </Typography>

          <Typography color="text.secondary">
            Analyze category revenue, products, stock and
            sales performance.
          </Typography>
        </Box>

        {/* ERROR */}

        {error && (
          <Alert severity="error">
            {errorMessage(error)}
          </Alert>
        )}

        {/* FILTERS */}

        <Card variant="outlined">
          <CardContent>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Search Category"
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  disabled={categoryId !== ""}
                />
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>
                    Category
                  </InputLabel>

                  <Select
                    label="Category"
                    value={categoryId}
                    onChange={(event) =>
                      setCategoryId(
                        String(event.target.value),
                      )
                    }
                  >
                    <MenuItem value="">
                      All Categories
                    </MenuItem>

                    {(categoriesQuery.data ?? []).map(
                      (category) => (
                        <MenuItem
                          key={category.id}
                          value={String(category.id)}
                        >
                          {category.name}
                        </MenuItem>
                      ),
                    )}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* KPI CARDS */}

        <Grid container spacing={2}>
          <Grid
            size={{
              xs: 12,
              sm: 6,
              md: 3,
            }}
          >
            <Card>
              <CardContent>
                <Typography
                  color="text.secondary"
                >
                  {categoryId
                    ? "Products"
                    : "Categories"}
                </Typography>

                <Typography
                  variant="h4"
                  fontWeight={800}
                >
                  {loading
                    ? "..."
                    : totalProducts}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid
            size={{
              xs: 12,
              sm: 6,
              md: 3,
            }}
          >
            <Card>
              <CardContent>
                <Typography
                  color="text.secondary"
                >
                  Revenue
                </Typography>

                <Typography
                  variant="h4"
                  fontWeight={800}
                >
                  {loading
                    ? "..."
                    : money(totalRevenue)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid
            size={{
              xs: 12,
              sm: 6,
              md: 3,
            }}
          >
            <Card>
              <CardContent>
                <Typography
                  color="text.secondary"
                >
                  Units Sold
                </Typography>

                <Typography
                  variant="h4"
                  fontWeight={800}
                >
                  {categoryId
                    ? totalUnitsSold
                    : "-"}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid
            size={{
              xs: 12,
              sm: 6,
              md: 3,
            }}
          >
            <Card>
              <CardContent>
                <Typography
                  color="text.secondary"
                >
                  Current Stock
                </Typography>

                <Typography
                  variant="h4"
                  fontWeight={800}
                >
                  {categoryId
                    ? totalStock
                    : "-"}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* ALL CATEGORY CHART */}

        {categoryId === "" &&
          filteredCategories.length > 0 && (
            <Card>
              <CardContent>
                <Typography
                  variant="h6"
                  fontWeight={700}
                  mb={2}
                >
                  Revenue by Category
                </Typography>

                <Box height={350}>
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <BarChart
                      data={filteredCategories}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                      />

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
                        dataKey="value"
                        name="Revenue"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          )}

        {/* ALL CATEGORY PERFORMANCE */}

        {categoryId === "" && (
          <Card>
            <CardContent>
              <Typography
                variant="h6"
                fontWeight={700}
                mb={2}
              >
                Category Performance
              </Typography>

              {loading ? (
                <Typography>
                  Loading category analytics...
                </Typography>
              ) : filteredCategories.length ===
                0 ? (
                <Alert severity="info">
                  No category data found.
                </Alert>
              ) : (
                <Grid container spacing={2}>
                  {filteredCategories.map(
                    (category) => (
                      <Grid
                        key={category.name}
                        size={{ xs: 12 }}
                      >
                        <Card variant="outlined">
                          <CardContent>
                            <Grid
                              container
                              spacing={2}
                              alignItems="center"
                            >
                              <Grid
                                size={{
                                  xs: 12,
                                  md: 5,
                                }}
                              >
                                <Typography fontWeight={700}>
                                  {category.name}
                                </Typography>

                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  Product Category
                                </Typography>
                              </Grid>

                              <Grid
                                size={{
                                  xs: 6,
                                  md: 3,
                                }}
                              >
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  Revenue
                                </Typography>

                                <Typography fontWeight={700}>
                                  {money(
                                    category.value,
                                  )}
                                </Typography>
                              </Grid>

                              <Grid
                                size={{
                                  xs: 6,
                                  md: 4,
                                }}
                              >
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  Performance
                                </Typography>

                                <Typography
                                  fontWeight={700}
                                  color={
                                    category.value >
                                    10000
                                      ? "success.main"
                                      : "warning.main"
                                  }
                                >
                                  {category.value >
                                  10000
                                    ? "High Revenue"
                                    : "Average Revenue"}
                                </Typography>
                              </Grid>
                            </Grid>
                          </CardContent>
                        </Card>
                      </Grid>
                    ),
                  )}
                </Grid>
              )}
            </CardContent>
          </Card>
        )}

        {/* SINGLE CATEGORY DETAILS */}

        {categoryId !== "" && (
          <Card>
            <CardContent>
              {categoryDetailsQuery.isLoading ? (
                <Typography>
                  Loading category details...
                </Typography>
              ) : !selectedCategory ? (
                <Alert severity="info">
                  Category details could not be
                  found.
                </Alert>
              ) : (
                <>
                  <Stack
                    direction={{
                      xs: "column",
                      md: "row",
                    }}
                    justifyContent="space-between"
                    spacing={2}
                    mb={3}
                  >
                    <Box>
                      <Typography
                        variant="h5"
                        fontWeight={800}
                      >
                        {selectedCategory.name}
                      </Typography>

                      <Typography
                        color="text.secondary"
                      >
                        {selectedCategory.description ||
                          "No category description"}
                      </Typography>
                    </Box>

                    <Typography
                      fontWeight={700}
                      color={
                        selectedCategory.total_revenue >
                        10000
                          ? "success.main"
                          : "warning.main"
                      }
                    >
                      {selectedCategory.total_revenue >
                      10000
                        ? "High Revenue"
                        : "Average Revenue"}
                    </Typography>
                  </Stack>

                  {/* PRODUCTS */}

                  <Typography
                    variant="h6"
                    fontWeight={700}
                    mb={2}
                  >
                    Products in Category
                  </Typography>

                  {selectedCategory.products
                    .length === 0 ? (
                    <Alert severity="info">
                      No products found in this
                      category.
                    </Alert>
                  ) : (
                    <Grid container spacing={2}>
                      {selectedCategory.products.map(
                        (product) => (
                          <Grid
                            key={product.id}
                            size={{
                              xs: 12,
                              md: 6,
                            }}
                          >
                            <Card variant="outlined">
                              <CardContent>
                                <Typography
                                  fontWeight={700}
                                >
                                  {product.name}
                                </Typography>

                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  SKU: {product.sku}
                                </Typography>

                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  Brand:{" "}
                                  {product.brand ||
                                    "No brand"}
                                </Typography>

                                <Typography
                                  fontWeight={700}
                                  mt={1}
                                >
                                  Price:{" "}
                                  {money(
                                    Number(
                                      product.price ??
                                        0,
                                    ),
                                  )}
                                </Typography>
                              </CardContent>
                            </Card>
                          </Grid>
                        ),
                      )}
                    </Grid>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}
      </Stack>
    </DashboardLayout>
  );
}