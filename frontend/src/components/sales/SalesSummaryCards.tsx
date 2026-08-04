import { Card, CardContent, Grid, Typography } from "@mui/material";

interface SalesSummaryCardsProps {
  totalSales: number;
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
}

export function SalesSummaryCards({
  totalSales,
  totalRevenue,
  totalOrders,
  averageOrderValue,
}: SalesSummaryCardsProps): React.JSX.Element {
  const cards = [
    {
      label: "Total Sales",
      value: `₹${totalSales.toFixed(2)}`,
    },
    {
      label: "Total Revenue",
      value: `₹${totalRevenue.toFixed(2)}`,
    },
    {
      label: "Total Orders",
      value: totalOrders,
    },
    {
      label: "Average Order Value",
      value: `₹${averageOrderValue.toFixed(2)}`,
    },
  ];

  return (
    <Grid container spacing={2} mb={3}>
      {cards.map((card) => (
        <Grid
          key={card.label}
          size={{
            xs: 6,
            md: 3,
          }}
        >
          <Card variant="outlined">
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                {card.label}
              </Typography>

              <Typography variant="h5" fontWeight={800}>
                {card.value}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
