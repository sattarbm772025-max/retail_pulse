import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import {
  customerApi,
  type Customer,
  type CustomerPayload,
} from "../api/customerApi";
import { DashboardLayout } from "../layouts/DashboardLayout";
import { useAuth } from "../context/AuthContext";

const empty: CustomerPayload = {
  full_name: "",
  email: "",
  phone: "",
  customer_type: "RETAIL",
  status: "ACTIVE",
};
export function CustomersPage() {
  const client = useQueryClient();
  const { profile } = useAuth();
  const admin = ["SUPER_ADMIN", "COMPANY_ADMIN"].includes(profile?.role ?? "");
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");
  const customers = useQuery({
    queryKey: ["customers", search, type],
    queryFn: () =>
      customerApi
        .list({
          search,
          customer_type: type || undefined,
          page: 1,
          page_size: 25,
        })
        .then((r) => r.data),
  });
  const detail = useQuery({
    queryKey: ["customer", selected?.id],
    enabled: !!selected,
    queryFn: () => customerApi.detail(selected!.id).then((r) => r.data),
  });
  const create = useMutation({
    mutationFn: () => customerApi.create(form),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["customers"] });
      setOpen(false);
    },
    onError: (e: any) =>
      setError(e.response?.data?.detail ?? "Unable to create customer"),
  });
  return (
    <DashboardLayout>
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        mb={2}
      >
        <BoxTitle />
        <Button
          variant="contained"
          disabled={!admin}
          onClick={() => {
            setForm(empty);
            setError("");
            setOpen(true);
          }}
        >
          Add customer
        </Button>
      </Stack>
      <Card variant="outlined">
        <CardContent>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} mb={2}>
            <TextField
              fullWidth
              label="Search name, ID, email, phone"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select
              displayEmpty
              value={type}
              onChange={(e) => setType(String(e.target.value))}
            >
              <MenuItem value="">All types</MenuItem>
              <MenuItem value="RETAIL">Retail</MenuItem>
              <MenuItem value="WHOLESALE">Wholesale</MenuItem>
              <MenuItem value="CORPORATE">Corporate</MenuItem>
            </Select>
          </Stack>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Customer</TableCell>
                <TableCell>Contact</TableCell>
                <TableCell>Type / Segment</TableCell>
                <TableCell>Orders</TableCell>
                <TableCell>Revenue</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {customers.data?.items.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell>
                    <b>{customer.full_name}</b>
                    <br />
                    {customer.customer_id}
                  </TableCell>
                  <TableCell>
                    {customer.email}
                    <br />
                    {customer.phone}
                  </TableCell>
                  <TableCell>
                    {customer.customer_type} / {customer.segment}
                  </TableCell>
                  <TableCell>{customer.total_orders}</TableCell>
                  <TableCell>₹{customer.total_revenue.toFixed(2)}</TableCell>
                  <TableCell>
                    <Button onClick={() => setSelected(customer)}>
                      Profile
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Add customer</DialogTitle>
        <DialogContent>
          <Stack mt={1} spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              required
              label="Full name"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
            <TextField
              required
              label="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <TextField
              required
              label="Phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <Select
              value={form.customer_type}
              onChange={(e) =>
                setForm({ ...form, customer_type: String(e.target.value) })
              }
            >
              <MenuItem value="RETAIL">Retail</MenuItem>
              <MenuItem value="WHOLESALE">Wholesale</MenuItem>
              <MenuItem value="CORPORATE">Corporate</MenuItem>
            </Select>
            <TextField
              label="City"
              value={form.city ?? ""}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!form.full_name || !form.email || !form.phone}
            onClick={() => create.mutate()}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={!!selected}
        onClose={() => setSelected(null)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>{detail.data?.full_name} — customer profile</DialogTitle>
        <DialogContent>
          <Typography mb={2}>
            Lifetime revenue: ₹
            {detail.data?.total_revenue?.toFixed(2) ?? "0.00"} · Orders:{" "}
            {detail.data?.total_orders ?? 0} · Segment: {detail.data?.segment}
          </Typography>
          <Typography fontWeight={700}>Recent transactions</Typography>
          {detail.data?.recent_transactions.map((sale) => (
            <Typography key={sale.invoice_number}>
              {sale.invoice_number} — ₹{sale.amount} —{" "}
              {new Date(sale.date).toLocaleDateString()}
            </Typography>
          ))}
          <Typography fontWeight={700} mt={2}>
            Activity timeline
          </Typography>
          {detail.data?.timeline.map((event, index) => (
            <Typography key={`${event.action}-${index}`}>
              {event.action}: {event.description}
            </Typography>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelected(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </DashboardLayout>
  );
}
function BoxTitle() {
  return (
    <div>
      <Typography variant="h4" fontWeight={800}>
        Customers
      </Typography>
      <Typography color="text.secondary">
        Manage customers, purchase history, and loyalty segments.
      </Typography>
    </div>
  );
}
