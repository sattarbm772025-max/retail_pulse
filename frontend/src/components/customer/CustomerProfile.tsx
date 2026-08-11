import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  Divider,
  Stack,
  Typography,
} from "@mui/material";

import type { CustomerProfile as CustomerProfileType } from "../../api/customerApi";

interface CustomerProfileProps {
  open: boolean;
  customer?: CustomerProfileType;
  loading: boolean;
  onClose: () => void;
}

export function CustomerProfile({
  open,
  customer,
  loading,
  onClose,
}: CustomerProfileProps): React.JSX.Element {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Customer Profile</DialogTitle>

      <DialogContent dividers>
        {loading ? (
          <Box display="flex" justifyContent="center" py={5}>
            <CircularProgress />
          </Box>
        ) : !customer ? (
          <Typography>No customer selected.</Typography>
        ) : (
          <Stack spacing={3}>
            {/* Customer Information */}

            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  Customer Information
                </Typography>

                <Divider sx={{ mb: 2 }} />

                <Stack spacing={1}>
                  <Typography>
                    <b>Name:</b> {customer.name}
                  </Typography>

                  <Typography>
                    <b>Email:</b> {customer.email}
                  </Typography>

                  <Typography>
                    <b>Phone:</b> {customer.phone}
                  </Typography>

                  <Typography>
                    <b>Status:</b> {customer.status}
                  </Typography>

                  <Typography>
                    <b>Segment:</b> {customer.segment}
                  </Typography>

                  <Typography>
                    <b>Total Orders:</b> {customer.total_orders}
                  </Typography>

                  <Typography>
                    <b>Total Spent:</b> ₹{customer.total_spent.toFixed(2)}
                  </Typography>

                  <Typography>
                    <b>Last Purchase:</b>{" "}
                    {customer.last_purchase
                      ? new Date(customer.last_purchase).toLocaleString()
                      : "No purchases"}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>

            {/* Purchase History */}

            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  Purchase History
                </Typography>

                <Divider sx={{ mb: 2 }} />

                {customer.purchase_history.length === 0 ? (
                  <Typography color="text.secondary">
                    No purchase history available.
                  </Typography>
                ) : (
                  <Stack spacing={2}>
                    {customer.purchase_history.map((purchase) => (
                      <Card key={purchase.id} variant="outlined">
                        <CardContent>
                          <Typography fontWeight={700}>
                            {purchase.invoice_number}
                          </Typography>

                          <Typography variant="body2">
                            Date:{" "}
                            {new Date(purchase.sale_date).toLocaleString()}
                          </Typography>

                          <Typography>
                            Amount: ₹{purchase.total_amount.toFixed(2)}
                          </Typography>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>

            {/* Timeline */}

            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  Activity Timeline
                </Typography>

                <Divider sx={{ mb: 2 }} />

                {customer.timeline.length === 0 ? (
                  <Typography color="text.secondary">
                    No activity available.
                  </Typography>
                ) : (
                  <Stack spacing={2}>
                    {customer.timeline.map((item) => (
                      <Card key={item.id} variant="outlined">
                        <CardContent>
                          <Typography fontWeight={600}>{item.event}</Typography>

                          <Typography variant="body2" color="text.secondary">
                            {new Date(item.created_at).toLocaleString()}
                          </Typography>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Stack>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

export default CustomerProfile;
