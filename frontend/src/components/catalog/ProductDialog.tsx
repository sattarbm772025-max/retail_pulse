import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
} from "@mui/material";

import type { Product, ProductPayload } from "../../api/catalogApi";

import ProductField from "./ProductField";

interface Props {
  open: boolean;
  editing: Product | null;
  form: ProductPayload;
  loading?: boolean;
  onClose: () => void;
  onChange: (value: ProductPayload) => void;
  onSave: () => void;
}

export default function ProductDialog({
  open,
  editing,
  form,
  loading = false,
  onClose,
  onChange,
  onSave,
}: Props) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{editing ? "Edit Product" : "Add Product"}</DialogTitle>

      <DialogContent>
        <Grid container spacing={2}>
          <ProductField
            label="Product Name"
            value={form.name}
            onChange={(value) =>
              onChange({
                ...form,
                name: value,
              })
            }
          />

          <ProductField
            label="SKU"
            value={form.sku}
            onChange={(value) =>
              onChange({
                ...form,
                sku: value,
              })
            }
          />

          <ProductField
            label="Brand"
            value={form.brand}
            onChange={(value) =>
              onChange({
                ...form,
                brand: value,
              })
            }
          />

          <ProductField
            label="Unit Price"
            type="number"
            value={String(form.unit_price)}
            onChange={(value) =>
              onChange({
                ...form,
                unit_price: Number(value),
              })
            }
          />
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>

        <Button variant="contained" onClick={onSave} disabled={loading}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
