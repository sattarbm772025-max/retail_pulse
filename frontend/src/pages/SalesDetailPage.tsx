import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Card,
  CardContent,
  Grid,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { DashboardLayout } from "../layouts/DashboardLayout";
import { salesApi, type Sale } from "../api/salesApi";

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

  return "Unable to load sales.";
};

export function SalesDetailPage(): React.JSX.Element {
  const [search, setSearch] = useState("");
  const [channel, setChannel] = useState("");
  const [payment, setPayment] = useState("");

  const sales = useQuery({
    queryKey: ["sales-drilldown", search, channel, payment],
    queryFn: () =>
      salesApi
        .list({
          search,
          sales_channel: channel || undefined,
          payment_method: payment || undefined,
        })
        .then((res) => res.data),
  });

  return (
    <DashboardLayout>
      <Typography variant="h4" fontWeight={700} mb={3}>
        Sales Drill Down
      </Typography>

      <Card variant="outlined">
        <CardContent>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} mb={3}>
            <TextField
              fullWidth
              label="Search Invoice / Customer"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <Select
              value={channel}
              displayEmpty
              onChange={(e) => setChannel(e.target.value)}
            >
              <MenuItem value="">All Channels</MenuItem>
              <MenuItem value="RETAIL_STORE">Retail Store</MenuItem>
              <MenuItem value="ONLINE_STORE">Online Store</MenuItem>
              <MenuItem value="MARKETPLACE">Marketplace</MenuItem>
            </Select>

            <Select
              value={payment}
              displayEmpty
              onChange={(e) => setPayment(e.target.value)}
            >
              <MenuItem value="">All Payments</MenuItem>
              <MenuItem value="CASH">Cash</MenuItem>
              <MenuItem value="CARD">Card</MenuItem>
              <MenuItem value="UPI">UPI</MenuItem>
              <MenuItem value="BANK_TRANSFER">Bank Transfer</MenuItem>
            </Select>
          </Stack>

          {sales.error && (
            <Alert severity="error">{errorMessage(sales.error)}</Alert>
          )}

          {sales.isLoading ? (
            <Typography>Loading sales...</Typography>
          ) : (
            <Stack spacing={2}>
              {sales.data?.map((sale: Sale) => (
                <Card key={sale.id} variant="outlined">
                  <CardContent>
                    <Grid container spacing={2} alignItems="center">
                      <Grid size={{ xs: 12, md: 2 }}>
                        <Typography fontWeight={700}>
                          {sale.invoice_number}
                        </Typography>
                      </Grid>

                      <Grid size={{ xs: 12, md: 2 }}>
                        <Typography>{sale.customer_name}</Typography>
                      </Grid>

                      <Grid size={{ xs: 12, md: 2 }}>
                        <Typography>
                          {new Date(sale.sale_date).toLocaleDateString()}
                        </Typography>
                      </Grid>

                      <Grid size={{ xs: 12, md: 2 }}>
                        <Typography>₹{sale.total_amount.toFixed(2)}</Typography>
                      </Grid>

                      <Grid size={{ xs: 12, md: 2 }}>
                        <Typography>
                          {sale.payment_method.replace("_", " ")}
                        </Typography>
                      </Grid>

                      <Grid size={{ xs: 12, md: 2 }}>
                        <Typography>
                          {sale.sales_channel.replace("_", " ")}
                        </Typography>
                      </Grid>

                      <Grid size={12}>
                        <Box mt={1}>
                          <Typography variant="subtitle2" gutterBottom>
                            Products
                          </Typography>

                          {sale.items.map((item) => (
                            <Typography
                              key={item.id}
                              variant="body2"
                              color="text.secondary"
                            >
                              • {item.product_name}
                              {" × "}
                              {item.quantity}
                              {" @ ₹"}
                              {item.unit_price}
                            </Typography>
                          ))}
                        </Box>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
