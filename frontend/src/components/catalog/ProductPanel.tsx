import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  Grid,
} from "@mui/material";

import {
  catalogApi,
  type Category,
  type Product,
  type ProductPayload,
} from "../../api/catalogApi";

import ProductField from "./ProductField";

const blankProduct: ProductPayload = {
  name: "",
  sku: "",
  category_id: 0,
  brand: "",
  description: "",
  unit_price: 0,
  cost_price: 0,
  stock_quantity: 0,
  unit_of_measure: "Unit",
  status: "ACTIVE",
};

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

type ProductPanelProps = {
  products: Product[];
  categories: Category[];
  loading: boolean;
  error: string;

  filters: {
    search: string;
    status: string;
    categoryId: string;
    brand: string;
    sort: string;
  };

  setFilters: {
    setSearch: (value: string) => void;
    setStatus: (value: string) => void;
    setCategoryId: (value: string) => void;
    setBrand: (value: string) => void;
    setSort: (value: string) => void;
  };
};

export default function ProductPanel({
  products,
  categories,
  loading,
  error,
  filters,
  setFilters,
}: ProductPanelProps) {
  const client = useQueryClient();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductPayload>(blankProduct);

  const [message, setMessage] = useState("");
  const [customCategory, setCustomCategory] = useState("");

  const save = useMutation({
    mutationFn: () =>
      editing
        ? catalogApi.updateProduct(editing.id, form)
        : catalogApi.createProduct(form),

    onSuccess: () => {
      client.invalidateQueries({
        queryKey: ["products"],
      });

      client.invalidateQueries({
        queryKey: ["catalog-summary"],
      });

      setOpen(false);
      setEditing(null);
      setForm(blankProduct);
    },

    onError: (error) => {
      setMessage(errorMessage(error));
    },
  });

  const remove = useMutation({
    mutationFn: (id: number) => catalogApi.deleteProduct(id),

    onSuccess: () => {
      client.invalidateQueries({
        queryKey: ["products"],
      });
    },

    onError: (error) => {
      setMessage(errorMessage(error));
    },
  });

  const createCategory = useMutation({
    mutationFn: () =>
      catalogApi.createCategory({
        name: customCategory.trim(),
        description: "Created while adding a product",
        status: "ACTIVE",
      }),
    onSuccess: (response) => {
      client.invalidateQueries({ queryKey: ["categories"] });
      setForm((current) => ({ ...current, category_id: response.data.id }));
      setCustomCategory("");
    },
    onError: (error) => setMessage(errorMessage(error)),
  });

  const openForm = (product?: Product) => {
    setEditing(product ?? null);

    setForm(
      product
        ? {
            name: product.name,
            sku: product.sku,
            category_id: product.category_id,
            brand: product.brand ?? "",
            description: product.description ?? "",
            unit_price: product.unit_price,
            cost_price: product.cost_price,
            stock_quantity: product.stock_quantity,
            unit_of_measure: product.unit_of_measure,
            status: product.status,
          }
        : {
            ...blankProduct,
            category_id: categories[0]?.id ?? 0,
          },
    );

    setOpen(true);
  };

  return (
    <Stack spacing={2}>
      <Stack
        direction={{
          xs: "column",
          md: "row",
        }}
        spacing={1}
      >
        <TextField
          label="Search name, SKU or brand"
          value={filters.search}
          onChange={(e) => setFilters.setSearch(e.target.value)}
          fullWidth
        />

        <TextField
          label="Brand"
          value={filters.brand}
          onChange={(e) => setFilters.setBrand(e.target.value)}
        />

        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Category</InputLabel>

          <Select
            label="Category"
            value={filters.categoryId}
            onChange={(e) => setFilters.setCategoryId(e.target.value)}
          >
            <MenuItem value="">All</MenuItem>

            {categories.map((c) => (
              <MenuItem key={c.id} value={String(c.id)}>
                {c.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button variant="contained" onClick={() => openForm()}>
          Add Product
        </Button>
      </Stack>

      {message && <Alert severity="error">{message}</Alert>}

      {error && <Alert severity="error">{error}</Alert>}

      <Stack spacing={1}>
        {loading ? (
          <Typography>Loading products...</Typography>
        ) : (
          products.map((product) => (
            <Card key={product.id} variant="outlined">
              <CardContent>
                <Typography fontWeight={700}>{product.name}</Typography>

                <Typography color="text.secondary">
                  {product.category_name}
                  {" · "}
                  {product.brand || "Unbranded"}
                  {" · ₹"}
                  {product.unit_price}
                </Typography>

                <Button size="small" onClick={() => openForm(product)}>
                  Edit
                </Button>

                <Button
                  size="small"
                  color="error"
                  onClick={() => remove.mutate(product.id)}
                >
                  Delete
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </Stack>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{editing ? "Edit Product" : "Add Product"}</DialogTitle>

        <DialogContent>
          <Grid container spacing={2}>
            <ProductField
              label="Product Name"
              value={form.name}
              onChange={(v) =>
                setForm({
                  ...form,
                  name: v,
                })
              }
            />

            <ProductField
              label="SKU"
              value={form.sku}
              onChange={(v) =>
                setForm({
                  ...form,
                  sku: v,
                })
              }
            />

            <ProductField
              label="Brand"
              value={form.brand}
              onChange={(v) =>
                setForm({
                  ...form,
                  brand: v,
                })
              }
            />

            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth required>
                <InputLabel>Category</InputLabel>
                <Select
                  label="Category"
                  value={form.category_id ? String(form.category_id) : ""}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      category_id: Number(event.target.value),
                    })
                  }
                >
                  {categories.map((category) => (
                    <MenuItem key={category.id} value={String(category.id)}>
                      {category.name}
                    </MenuItem>
                  ))}
                  <MenuItem value="0">Other — create a category</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {form.category_id === 0 && (
              <Grid size={{ xs: 12 }}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                  <TextField
                    fullWidth
                    label="New category name"
                    value={customCategory}
                    onChange={(event) => setCustomCategory(event.target.value)}
                  />
                  <Button
                    variant="outlined"
                    disabled={
                      !customCategory.trim() || createCategory.isPending
                    }
                    onClick={() => createCategory.mutate()}
                  >
                    Create category
                  </Button>
                </Stack>
              </Grid>
            )}

            <ProductField
              label="Selling Price (Unit Price)"
              type="number"
              value={String(form.unit_price)}
              onChange={(v) =>
                setForm({
                  ...form,
                  unit_price: Number(v),
                })
              }
            />

            <ProductField
              label="Cost Price (Unit Cost)"
              type="number"
              value={String(form.cost_price)}
              onChange={(v) => setForm({ ...form, cost_price: Number(v) })}
            />

            <ProductField
              label="Initial Stock Quantity"
              type="number"
              value={String(form.stock_quantity)}
              onChange={(v) => setForm({ ...form, stock_quantity: Number(v) })}
            />

            <ProductField
              label="Unit of Measure"
              value={form.unit_of_measure}
              onChange={(v) => setForm({ ...form, unit_of_measure: v })}
            />

            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                multiline
                minRows={2}
                label="Description"
                value={form.description}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>

          <Button
            variant="contained"
            disabled={
              !form.category_id ||
              form.unit_price <= 0 ||
              form.cost_price > form.unit_price
            }
            onClick={() => save.mutate()}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
