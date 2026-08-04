import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
} from "@mui/material";

import { type Sale } from "../../api/salesApi";

interface SalesTableProps {
  sales: Sale[];
  loading: boolean;
  onDetails: (sale: Sale) => void;
  onEdit: (sale: Sale) => void;
  onDelete: (sale: Sale) => void;
}

export function SalesTable({
  sales,
  loading,
  onDetails,
  onEdit,
  onDelete,
}: SalesTableProps): React.JSX.Element {
  if (loading) {
    return <Typography>Loading sales...</Typography>;
  }

  if (sales.length === 0) {
    return <Typography color="text.secondary">No sales found.</Typography>;
  }

  return (
    <Stack spacing={1}>
      {sales.map((sale) => (
        <Card key={sale.id} variant="outlined">
          <CardContent>
            <Stack
              direction={{
                xs: "column",
                sm: "row",
              }}
              spacing={1}
              alignItems={{
                sm: "center",
              }}
            >
              <Box sx={{ flexGrow: 1 }}>
                <Typography fontWeight={700}>
                  {sale.invoice_number} {" · "} {sale.customer_name}
                </Typography>

                <Typography variant="body2" color="text.secondary">
                  {new Date(sale.sale_date).toLocaleString()}
                  {" · "}
                  {sale.items.map((item) => item.product_name).join(", ")}
                </Typography>
              </Box>

              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                flexWrap="wrap"
              >
                <Chip
                  size="small"
                  label={sale.sales_channel.replace("_", " ")}
                />

                <Typography fontWeight={800}>
                  ₹{sale.total_amount.toFixed(2)}
                </Typography>

                <Button size="small" onClick={() => onDetails(sale)}>
                  Details
                </Button>

                <Button size="small" onClick={() => onEdit(sale)}>
                  Edit
                </Button>

                <Button
                  size="small"
                  color="error"
                  onClick={() => onDelete(sale)}
                >
                  Delete
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}
