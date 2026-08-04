import {
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";

import { type Sale } from "../../api/salesApi";

interface SaleDetailsDialogProps {
  sale: Sale | null;
  close: () => void;
}

export function SaleDetailsDialog({
  sale,
  close,
}: SaleDetailsDialogProps): React.JSX.Element | null {
  if (!sale) {
    return null;
  }

  return (
    <Dialog open onClose={close} fullWidth maxWidth="sm">
      <DialogTitle>Invoice {sale.invoice_number}</DialogTitle>

      <DialogContent>
        <Stack spacing={2}>
          <Typography>
            <strong>Customer:</strong> {sale.customer_name}
          </Typography>

          <Typography>
            <strong>Date:</strong> {new Date(sale.sale_date).toLocaleString()}
          </Typography>

          <Typography>
            <strong>Sales Channel:</strong>{" "}
            {sale.sales_channel.replace("_", " ")}
          </Typography>

          <Typography>
            <strong>Payment Method:</strong>{" "}
            {sale.payment_method.replace("_", " ")}
          </Typography>

          {sale.items.map((item) => (
            <Card key={item.id} variant="outlined">
              <CardContent>
                <Typography fontWeight={700}>
                  {item.product_name}
                  {" · "}
                  {item.category_name}
                </Typography>

                <Typography variant="body2">
                  Quantity: {item.quantity}
                  {" × ₹"}
                  {item.unit_price}
                </Typography>

                <Typography variant="body2">
                  Discount: ₹{item.discount}
                </Typography>

                <Typography variant="body2">Tax: ₹{item.tax}</Typography>

                <Typography fontWeight={700} sx={{ mt: 1 }}>
                  Final: ₹{(item.total ?? 0).toFixed(2)}
                </Typography>
              </CardContent>
            </Card>
          ))}

          <Typography variant="h6" fontWeight={700}>
            Total Amount: ₹{sale.total_amount.toFixed(2)}
          </Typography>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={close}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
