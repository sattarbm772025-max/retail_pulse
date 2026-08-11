import { Card, CardContent, Grid, Typography } from "@mui/material";

interface CustomerSummary {
  total_customers: number;
  active_customers: number;
  inactive_customers: number;
  vip_customers: number;
  total_revenue: number;
}

interface Props {
  summary?: CustomerSummary;
  loading: boolean;
}

export function CustomerDashboardCards({
  summary,
  loading,
}: Props): React.JSX.Element {
  const cards = [
    {
      title: "Total Customers",
      value: summary?.total_customers ?? 0,
    },
    {
      title: "Active Customers",
      value: summary?.active_customers ?? 0,
    },
    {
      title: "Inactive Customers",
      value: summary?.inactive_customers ?? 0,
    },
    {
      title: "VIP Customers",
      value: summary?.vip_customers ?? 0,
    },
    {
      title: "Revenue",
      value: `₹${(summary?.total_revenue ?? 0).toFixed(2)}`,
    },
  ];

  return (
    <Grid container spacing={2} mb={3}>
      {cards.map((card) => (
        <Grid
          key={card.title}
          size={{
            xs: 12,
            sm: 6,
            md: 2.4,
          }}
        >
          <Card variant="outlined">
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                {card.title}
              </Typography>

              <Typography variant="h5" fontWeight={700} mt={1}>
                {loading ? "..." : card.value}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
