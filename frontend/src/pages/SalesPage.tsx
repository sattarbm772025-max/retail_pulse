import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Box, Button, Stack, Typography } from "@mui/material";

import { DashboardLayout } from "../layouts/DashboardLayout";
import { catalogApi, type Product } from "../api/catalogApi";
import { customerApi } from "../api/customerApi";
import {
  salesApi,
  type Sale,
  type SaleItem,
  type SalePayload,
} from "../api/salesApi";

import { SalesSummaryCards } from "../components/sales/SalesSummaryCards";
import { SalesFilters } from "../components/sales/SalesFilters";
import { SalesTable } from "../components/sales/SalesTable";
import { SaleFormDialog } from "../components/sales/SaleFormDialog";
import { SaleDetailsDialog } from "../components/sales/SaleDetailsDialog";

const newLine = (): SaleItem => ({
  product_id: 0,
  quantity: 1,
  unit_price: 0,
  discount: 0,
  tax: 0,
});

const blankSale = (): SalePayload => ({
  customer_id: 0,
  sale_date: new Date().toISOString().slice(0, 16),
  sales_channel: "RETAIL_STORE",
  payment_method: "CASH",
  payment_status: "PAID",
  notes: "",
  items: [newLine()],
});

const apiError = (error: unknown) => {
  const value = (
    error as {
      response?: {
        data?: {
          detail?: unknown;
        };
      };
    }
  )?.response?.data?.detail;

  if (typeof value === "string") return value;

  if (Array.isArray(value)) {
    return value.map((item: { msg?: string }) => item.msg).join(", ");
  }

  return "Unable to save the sale.";
};

export function SalesPage() {
  const client = useQueryClient();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Sale | null>(null);
  const [details, setDetails] = useState<Sale | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState<SalePayload>(blankSale());

  const [filters, setFilters] = useState({
    search: "",
    channel: "",
    payment: "",
    categoryId: "",
    dateFrom: "",
    dateTo: "",
    sort: "date",
  });

  const products = useQuery({
    queryKey: ["sale-products"],
    queryFn: () =>
      catalogApi
        .products({
          status: "ACTIVE",
          sort: "name",
        })
        .then((response) => response.data),
  });

  const categories = useQuery({
    queryKey: ["sale-categories"],
    queryFn: () => catalogApi.categories().then((response) => response.data),
  });

  const customers = useQuery({
    queryKey: ["sale-customers"],
    queryFn: () => customerApi.list({ status: "ACTIVE" }).then((response) => response.data),
  });

  const sales = useQuery({
    queryKey: ["sales", filters],
    queryFn: () =>
      salesApi
        .list({
          search: filters.search,
          sales_channel: filters.channel || undefined,
          payment_method: filters.payment || undefined,
          category_id: filters.categoryId || undefined,
          date_from: filters.dateFrom || undefined,
          date_to: filters.dateTo ? `${filters.dateTo}T23:59:59` : undefined,
          sort: filters.sort,
        })
        .then((response) => response.data),
  });

  const summary = useQuery({
    queryKey: ["sales-summary"],
    queryFn: () => salesApi.summary().then((response) => response.data),
  });

  const save = useMutation({
    mutationFn: () =>
      editing ? salesApi.update(editing.id, form) : salesApi.create(form),

    onSuccess: () => {
      [
        "sales",
        "sales-summary",
        "catalog-summary",
        "products",
        "inventory",
        "inventory-summary",
      ].forEach((key) =>
        client.invalidateQueries({
          queryKey: [key],
        }),
      );

      setOpen(false);
      setEditing(null);
    },

    onError: (error) => setError(apiError(error)),
  });

  const remove = useMutation({
    mutationFn: (id: number) => salesApi.delete(id),

    onSuccess: () => {
      [
        "sales",
        "sales-summary",
        "catalog-summary",
        "products",
        "inventory",
        "inventory-summary",
      ].forEach((key) =>
        client.invalidateQueries({
          queryKey: [key],
        }),
      );
    },
  });

  const openForm = (sale?: Sale) => {
    setError("");
    setEditing(sale ?? null);

    setForm(
      sale
        ? {
            customer_id: sale.customer_id ?? 0,
            sale_date: sale.sale_date.slice(0, 16),
            sales_channel: sale.sales_channel,
            payment_method: sale.payment_method,
            payment_status: sale.payment_status,
            notes: sale.notes ?? "",
            items: sale.items.map((item) => ({
              product_id: item.product_id,
              quantity: item.quantity,
              unit_price: item.unit_price,
              discount: item.discount,
              tax: item.tax,
            })),
          }
        : blankSale(),
    );

    setOpen(true);
  };

  return (
    <DashboardLayout>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        spacing={2}
        mb={3}
      >
        <Box>
          <Typography variant="h4" fontWeight={800}>
            Sales Transactions
          </Typography>

          <Typography color="text.secondary">
            Record sales and keep inventory accurate in real time.
          </Typography>
        </Box>

        <Button variant="contained" onClick={() => openForm()}>
          New Sale
        </Button>
      </Stack>

      <SalesSummaryCards
        totalSales={summary.data?.total_sales ?? 0}
        totalRevenue={summary.data?.total_revenue ?? 0}
        totalOrders={summary.data?.total_orders ?? 0}
        averageOrderValue={summary.data?.average_order_value ?? 0}
      />

      <SalesFilters
        filters={filters}
        setFilters={setFilters}
        categories={categories.data ?? []}
      />

      <SalesTable
        loading={sales.isLoading}
        sales={sales.data ?? []}
        onDetails={setDetails}
        onEdit={openForm}
        onDelete={(sale) => {
          if (
            window.confirm(
              `Delete ${sale.invoice_number}? Stock will be restored.`,
            )
          ) {
            remove.mutate(sale.id);
          }
        }}
      />

      <SaleFormDialog
        open={open}
        close={() => setOpen(false)}
        form={form}
        setForm={setForm}
        products={(products.data ?? []) as Product[]}
        customers={customers.data ?? []}
        error={error}
        saving={save.isPending}
        submit={() => save.mutate()}
        editing={Boolean(editing)}
      />

      <SaleDetailsDialog sale={details} close={() => setDetails(null)} />
    </DashboardLayout>
  );
}
