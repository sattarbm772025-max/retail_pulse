import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  TextField,
} from "@mui/material";

import type { CustomerPayload } from "../../api/customerApi";

interface CustomerDialogProps {
  open: boolean;
  editing: boolean;
  form: CustomerPayload;
  setForm: React.Dispatch<React.SetStateAction<CustomerPayload>>;
  error: string;
  saving: boolean;
  onClose: () => void;
  onSubmit: () => void;
}

export function CustomerDialog({
  open,
  editing,
  form,
  setForm,
  error,
  saving,
  onClose,
  onSubmit,
}: CustomerDialogProps): React.JSX.Element {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{editing ? "Edit Customer" : "Add Customer"}</DialogTitle>

      <DialogContent>
        <Grid container spacing={2} sx={{ pt: 1 }}>
          {error && (
            <Grid size={12}>
              <Alert severity="error">{error}</Alert>
            </Grid>
          )}

          <Grid
            size={{
              xs: 12,
            }}
          >
            <TextField
              fullWidth
              label="First Name"
              value={form.first_name}
              onChange={(e) =>
                setForm({
                  ...form,
                  first_name: e.target.value,
                })
              }
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              label="Last Name"
              value={form.last_name}
              onChange={(e) => setForm({ ...form, last_name: e.target.value })}
            />
          </Grid>

          <Grid
            size={{
              xs: 12,
            }}
          >
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm({
                  ...form,
                  email: e.target.value,
                })
              }
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              label="Address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="City"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="State"
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="Country"
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="Postal Code"
              value={form.postal_code}
              onChange={(e) =>
                setForm({ ...form, postal_code: e.target.value })
              }
            />
          </Grid>

          <Grid
            size={{
              xs: 12,
            }}
          >
            <TextField
              fullWidth
              label="Phone"
              value={form.phone}
              onChange={(e) =>
                setForm({
                  ...form,
                  phone: e.target.value,
                })
              }
            />
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>

        <Button
          variant="contained"
          disabled={
            saving ||
            !form.first_name.trim() ||
            !form.last_name.trim() ||
            !form.email.trim() ||
            !form.phone.trim() ||
            !form.address.trim() ||
            !form.city.trim() ||
            !form.state.trim() ||
            !form.country.trim() ||
            !form.postal_code.trim()
          }
          onClick={onSubmit}
        >
          {editing ? "Save Changes" : "Create Customer"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default CustomerDialog;
