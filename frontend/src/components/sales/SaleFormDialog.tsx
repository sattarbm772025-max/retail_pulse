import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from "@mui/material";

import { type Product } from "../../api/catalogApi";
import { type SaleItem, type SalePayload } from "../../api/salesApi";
import { FormField } from "./FormField";
import { SaleLine } from "./SaleLine";

interface SaleFormDialogProps {
  open: boolean;
  close: () => void;
  form: SalePayload;
  setForm: React.Dispatch<React.SetStateAction<SalePayload>>;
  products: Product[];
  error: string;
  saving: boolean;
  submit: () => void;
  editing: boolean;
}

const newLine = (): SaleItem => ({
  product_id: 0,
  quantity: 1,
  unit_price: 0,
  discount: 0,
  tax: 0,
});

export function SaleFormDialog({
  open,
  close,
  form,
  setForm,
  products,
  error,
  saving,
  submit,
  editing,
}: SaleFormDialogProps): React.JSX.Element {
  const updateLine = (index: number, update: Partial<SaleItem>) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index
          ? {
              ...item,
              ...update,
            }
          : item,
      ),
    }));
  };

  const total = form.items.reduce(
    (sum, line) =>
      sum + line.quantity * line.unit_price - line.discount + line.tax,
    0,
  );

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="md">
      <DialogTitle>{editing ? "Edit Sale" : "Create Sale"}</DialogTitle>

      <DialogContent>
        <Grid container spacing={2} sx={{ pt: 1 }}>
          {error && (
            <Grid size={12}>
              <Alert severity="error">{error}</Alert>
            </Grid>
          )}

          <FormField
            label="Customer Name"
            value={form.customer_name}
            onChange={(value) =>
              setForm((prev) => ({
                ...prev,
                customer_name: value,
              }))
            }
          />

          <FormField
            label="Sale Date & Time"
            type="datetime-local"
            value={form.sale_date ?? ""}
            onChange={(value) =>
              setForm((prev) => ({
                ...prev,
                sale_date: value,
              }))
            }
          />

          <Grid
            size={{
              xs: 12,
              sm: 6,
            }}
          >
            <FormControl fullWidth>
              <InputLabel>Sales Channel</InputLabel>

              <Select
                label="Sales Channel"
                value={form.sales_channel}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    sales_channel: e.target.value,
                  }))
                }
              >
                <MenuItem value="RETAIL_STORE">Retail Store</MenuItem>

                <MenuItem value="ONLINE_STORE">Online Store</MenuItem>

                <MenuItem value="MARKETPLACE">Marketplace</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid
            size={{
              xs: 12,
              sm: 6,
            }}
          >
            <FormControl fullWidth>
              <InputLabel>Payment Method</InputLabel>

              <Select
                label="Payment Method"
                value={form.payment_method}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    payment_method: e.target.value,
                  }))
                }
              >
                <MenuItem value="CASH">Cash</MenuItem>

                <MenuItem value="CARD">Card</MenuItem>

                <MenuItem value="UPI">UPI</MenuItem>

                <MenuItem value="BANK_TRANSFER">Bank Transfer</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid size={12}>
            <Typography fontWeight={700}>Sale Items</Typography>
          </Grid>

          {form.items.map((line, index) => (
            <SaleLine
              key={index}
              index={index}
              line={line}
              products={products}
              update={updateLine}
              remove={() =>
                setForm((prev) => ({
                  ...prev,
                  items: prev.items.filter((_, current) => current !== index),
                }))
              }
              canRemove={form.items.length > 1}
            />
          ))}
        </Grid>

        <Button
          sx={{ mt: 2 }}
          variant="outlined"
          onClick={() =>
            setForm((prev) => ({
              ...prev,
              items: [...prev.items, newLine()],
            }))
          }
        >
          Add Another Product
        </Button>

        <Alert severity="info" sx={{ mt: 2 }}>
          Final Amount: ₹{total.toFixed(2)}
        </Alert>
      </DialogContent>

      <DialogActions>
        <Button onClick={close}>Cancel</Button>

        <Button
          variant="contained"
          disabled={
            !form.customer_name ||
            form.items.some((item) => !item.product_id || item.quantity < 1) ||
            saving
          }
          onClick={submit}
        >
          {editing ? "Save Changes" : "Create Sale"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
