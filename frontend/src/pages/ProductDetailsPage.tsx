import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Card,
  CardContent,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import { useParams } from "react-router-dom";

import { DashboardLayout } from "../layouts/DashboardLayout";
import { analyticsApi } from "../api/analyticsApi";

export function ProductDetailsPage(): React.JSX.Element {
  const { id } = useParams();

  const { data, isLoading, error } = useQuery({
    queryKey: ["product-details", id],
    queryFn: () =>
      analyticsApi.productDetails(Number(id)).then((res) => res.data),
    enabled: !!id,
  });

  return (
    <DashboardLayout>
      <Stack spacing={3}>
        <Typography variant="h4" fontWeight={800}>
          Product Details
        </Typography>

        {error && (
          <Alert severity="error">Unable to load product details.</Alert>
        )}

        {isLoading ? (
          <Typography>Loading...</Typography>
        ) : (
          <>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" fontWeight={700}>
                      Product Information
                    </Typography>

                    <Stack spacing={1} mt={2}>
                      <Typography>
                        <b>Name:</b> {data.name}
                      </Typography>

                      <Typography>
                        <b>SKU:</b> {data.sku}
                      </Typography>

                      <Typography>
                        <b>Brand:</b> {data.brand}
                      </Typography>

                      <Typography>
                        <b>Description:</b>{" "}
                        {data.description || "No description"}
                      </Typography>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" fontWeight={700}>
                      Pricing
                    </Typography>

                    <Stack spacing={1} mt={2}>
                      <Typography>
                        <b>Selling Price:</b> ₹{data.unit_price}
                      </Typography>

                      <Typography>
                        <b>Cost Price:</b> ₹{data.cost_price}
                      </Typography>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 3 }}>
                <Card>
                  <CardContent>
                    <Typography variant="body2">Current Stock</Typography>

                    <Typography variant="h4">{data.stock}</Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, md: 3 }}>
                <Card>
                  <CardContent>
                    <Typography variant="body2">Reorder Level</Typography>

                    <Typography variant="h4">{data.reorder_level}</Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, md: 3 }}>
                <Card>
                  <CardContent>
                    <Typography variant="body2">Units Sold</Typography>

                    <Typography variant="h4">
                      {data.total_units_sold}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, md: 3 }}>
                <Card>
                  <CardContent>
                    <Typography variant="body2">Revenue</Typography>

                    <Typography variant="h4">
                      ₹{data.total_revenue.toFixed(2)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={700} mb={2}>
                  Inventory Status
                </Typography>

                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      Available Stock
                    </Typography>

                    <Typography variant="h5" fontWeight={700}>
                      {data.stock}
                    </Typography>
                  </Grid>

                  <Grid size={{ xs: 12, md: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      Stock Status
                    </Typography>

                    <Typography
                      variant="h5"
                      fontWeight={700}
                      color={
                        data.stock_status === "OUT_OF_STOCK"
                          ? "error.main"
                          : data.stock_status === "LOW_STOCK"
                            ? "warning.main"
                            : "success.main"
                      }
                    >
                      {data.stock_status}
                    </Typography>
                  </Grid>

                  <Grid size={{ xs: 12, md: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      Forecast
                    </Typography>

                    <Typography variant="h5" fontWeight={700}>
                      {data.forecast ?? 0}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={700} mb={2}>
                  Recent Sales History
                </Typography>

                {data.sales_history?.length ? (
                  <Stack spacing={2}>
                    {data.sales_history.map((sale: any) => (
                      <Card key={sale.id} variant="outlined">
                        <CardContent>
                          <Grid container spacing={2} alignItems="center">
                            <Grid size={{ xs: 12, md: 3 }}>
                              <Typography fontWeight={700}>
                                {sale.invoice_number}
                              </Typography>

                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                {new Date(sale.sale_date).toLocaleString()}
                              </Typography>
                            </Grid>

                            <Grid size={{ xs: 12, md: 3 }}>
                              <Typography>Customer</Typography>

                              <Typography fontWeight={700}>
                                {sale.customer_name}
                              </Typography>
                            </Grid>

                            <Grid size={{ xs: 6, md: 2 }}>
                              <Typography>Qty</Typography>

                              <Typography fontWeight={700}>
                                {sale.quantity}
                              </Typography>
                            </Grid>

                            <Grid size={{ xs: 6, md: 2 }}>
                              <Typography>Price</Typography>

                              <Typography fontWeight={700}>
                                ₹{sale.unit_price}
                              </Typography>
                            </Grid>

                            <Grid size={{ xs: 12, md: 2 }}>
                              <Typography>Total</Typography>

                              <Typography fontWeight={700} color="primary">
                                ₹{sale.total.toFixed(2)}
                              </Typography>
                            </Grid>
                          </Grid>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                ) : (
                  <Typography color="text.secondary">
                    No sales history available.
                  </Typography>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </Stack>
    </DashboardLayout>
  );
}
