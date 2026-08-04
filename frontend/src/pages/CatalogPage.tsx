import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { useSearchParams } from "react-router-dom";

import { catalogApi } from "../api/catalogApi";

import { DashboardLayout } from "../layouts/DashboardLayout";

import CategoryPanel from "../components/catalog/CategoryPanel";
import ProductPanel from "../components/catalog/ProductPanel";

const errorMessage = (error: unknown) => {
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
      .map((item: { msg?: string }) => item.msg ?? "Invalid value")
      .join(", ");
  }

  return "Something went wrong. Please try again.";
};

export function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const tab = searchParams.get("tab") === "products" ? 1 : 0;

  const setTab = (value: number) => {
    setSearchParams({
      tab: value === 1 ? "products" : "categories",
    });
  };

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [brand, setBrand] = useState("");
  const [sort, setSort] = useState("recent");

  const summary = useQuery({
    queryKey: ["catalog-summary"],
    queryFn: () => catalogApi.summary().then((response) => response.data),
  });

  const categories = useQuery({
    queryKey: ["categories", search],
    queryFn: () =>
      catalogApi.categories(search).then((response) => response.data),
  });

  const products = useQuery({
    queryKey: ["products", search, status, categoryId, brand, sort],
    queryFn: () =>
      catalogApi
        .products({
          search,
          status: status || undefined,
          category_id: categoryId || undefined,
          brand,
          sort,
        })
        .then((response) => response.data),
  });

  const cards = [
    ["Total products", summary.data?.total_products ?? 0],
    ["Active products", summary.data?.active_products ?? 0],
    ["Inactive products", summary.data?.inactive_products ?? 0],
    ["Total categories", summary.data?.total_categories ?? 0],
  ];

  return (
    <DashboardLayout>
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        spacing={2}
        mb={3}
      >
        <Box>
          <Typography variant="h4" fontWeight={800}>
            Catalog Management
          </Typography>

          <Typography color="text.secondary">
            Manage product master data for your organization.
          </Typography>
        </Box>

        <Button variant="contained" onClick={() => setTab(tab === 0 ? 1 : 0)}>
          Add {tab === 0 ? "Category" : "Product"}
        </Button>
      </Stack>

      <Grid container spacing={2} mb={3}>
        {cards.map(([label, value]) => (
          <Grid
            key={label}
            size={{
              xs: 6,
              md: 3,
            }}
          >
            <Card variant="outlined">
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  {label}
                </Typography>

                <Typography variant="h4" fontWeight={800}>
                  {value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card variant="outlined">
        <Tabs
          value={tab}
          onChange={(_, value) => setTab(value)}
          sx={{
            px: 2,
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <Tab label="Categories" />
          <Tab label="Products" />
        </Tabs>

        <Box
          p={{
            xs: 2,
            md: 3,
          }}
        >
          {tab === 0 ? (
            <CategoryPanel
              categories={categories.data ?? []}
              loading={categories.isLoading}
              error={categories.error ? errorMessage(categories.error) : ""}
            />
          ) : (
            <ProductPanel
              products={products.data ?? []}
              categories={categories.data ?? []}
              loading={products.isLoading}
              error={products.error ? errorMessage(products.error) : ""}
              filters={{
                search,
                status,
                categoryId,
                brand,
                sort,
              }}
              setFilters={{
                setSearch,
                setStatus,
                setCategoryId,
                setBrand,
                setSort,
              }}
            />
          )}
        </Box>
      </Card>
    </DashboardLayout>
  );
}
