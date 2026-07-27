import {
  Card,
  CardContent,
  Chip,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import { DashboardLayout } from "../layouts/DashboardLayout";
import { useAuth } from "../context/AuthContext";

export function ProfilePage() {
  const { profile } = useAuth();
  const details = [
    ["Name", profile?.name],
    ["Email", profile?.email],
    ["Role", profile?.role.replaceAll("_", " ")],
    ["Company", profile?.company.name],
    [
      "Last login",
      profile?.last_login
        ? new Date(profile.last_login).toLocaleString()
        : "Not recorded",
    ],
  ];
  return (
    <DashboardLayout>
      <Typography variant="h4" fontWeight={800}>
        My profile
      </Typography>
      <Typography color="text.secondary" mb={3}>
        Your RetailPulse account and organization information.
      </Typography>
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={3}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
            >
              <Typography variant="h6">Account details</Typography>
              <Chip
                color={profile?.status === "ACTIVE" ? "success" : "default"}
                label={profile?.status ?? "Unknown"}
              />
            </Stack>
            <Grid container spacing={2}>
              {details.map(([label, value]) => (
                <Grid key={label} size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">
                    {label}
                  </Typography>
                  <Typography fontWeight={600}>{value ?? "—"}</Typography>
                </Grid>
              ))}
            </Grid>
          </Stack>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
