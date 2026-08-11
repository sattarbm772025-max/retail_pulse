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

export function CategoryDetailsPage(): React.JSX.Element {
  const { id } = useParams();

  const { data, isLoading, error } = useQuery({
    queryKey: ["category-details", id],
    queryFn: () =>
      analyticsApi.categoryDetails(Number(id)).then((res) => res.data),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <Typography>Loading...</Typography>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <Alert severity="error">Unable to load category details.</Alert>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Stack spacing={3}>
        <Typography variant="h4" fontWeight={800}>
          Category Details
        </Typography>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={700}>
                  Category Information
                </Typography>

                <Stack spacing={1} mt={2}>
                  <Typography>
                    <b>Name:</b> {data.name}
                  </Typography>

                  <Typography>
                    <b>Description:</b> {data.description || "No description"}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={700}>
                  Summary
                </Typography>

                <Stack spacing={1} mt={2}>
                  <Typography>
                    <b>Total Products:</b> {data.total_products}
                  </Typography>

                  <Typography>
                    <b>Total Stock:</b> {data.total_stock}
                  </Typography>

                  <Typography>
                    <b>Units Sold:</b> {data.total_units_sold}
                  </Typography>

                  <Typography>
                    <b>Total Revenue:</b> ₹{data.total_revenue.toFixed(2)}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={700} mb={2}>
                  Products in this Category
                </Typography>

                {data.products.length === 0 ? (
                  <Typography color="text.secondary">
                    No products found in this category.
                  </Typography>
                ) : (
                  <Grid container spacing={2}>
                    {data.products.map((product: any) => (
                      <Grid
                        key={product.id}
                        size={{
                          xs: 12,
                          sm: 6,
                          md: 4,
                          lg: 3,
                        }}
                      >
                        <Card variant="outlined">
                          <CardContent>
                            <Stack spacing={1}>
                              <Typography variant="subtitle1" fontWeight={700}>
                                {product.name}
                              </Typography>

                              <Typography variant="body2">
                                <b>SKU:</b> {product.sku}
                              </Typography>

                              <Typography variant="body2">
                                <b>Brand:</b> {product.brand}
                              </Typography>

                              <Typography variant="body2">
                                <b>Price:</b> ₹
                                {Number(product.price).toFixed(2)}
                              </Typography>
                            </Stack>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Stack>
    </DashboardLayout>
  );
}

export default CategoryDetailsPage;
