import {
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
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
  if (loading) return <Typography>Loading sales...</Typography>;
  if (!sales.length)
    return (
      <Typography color="text.secondary">
        No sales found. Create your first sale to see it here.
      </Typography>
    );

  return (
    <Card>
      <CardContent sx={{ p: 0, overflowX: "auto" }}>
        <Table size="small" sx={{ minWidth: 780 }}>
          <TableHead>
            <TableRow>
              <TableCell>Invoice</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Items</TableCell>
              <TableCell>Channel</TableCell>
              <TableCell>Payment</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sales.map((sale) => (
              <TableRow key={sale.id} hover>
                <TableCell>
                  <Typography fontWeight={800}>
                    {sale.invoice_number}
                  </Typography>
                </TableCell>
                <TableCell>{sale.customer_name}</TableCell>
                <TableCell>
                  {new Date(sale.sale_date).toLocaleDateString()}
                </TableCell>
                <TableCell>{sale.items.length}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={sale.sales_channel.replaceAll("_", " ")}
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    color={
                      sale.payment_status === "PAID" ? "success" : "warning"
                    }
                    label={sale.payment_status}
                  />
                </TableCell>
                <TableCell align="right">
                  <Typography fontWeight={800}>
                    ₹{sale.total_amount.toFixed(2)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5}>
                    <Button size="small" onClick={() => onDetails(sale)}>
                      View
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
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
