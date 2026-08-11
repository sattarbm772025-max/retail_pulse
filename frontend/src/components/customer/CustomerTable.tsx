import {
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import type { Customer } from "../../api/customerApi";

interface CustomerTableProps {
  customers: Customer[];
  loading: boolean;

  filters: {
    search: string;
    status: string;
    segment: string;
    sort: string;
  };

  setFilters: React.Dispatch<
    React.SetStateAction<{
      search: string;
      status: string;
      segment: string;
      sort: string;
    }>
  >;

  onView: (id: number) => void;
  onEdit: (customer: Customer) => void;
  onDelete: (id: number) => void;
  onActivate: (id: number) => void;
  onDeactivate: (id: number) => void;
}

export function CustomerTable({
  customers,
  loading,
  filters,
  setFilters,
  onView,
  onEdit,
  onDelete,
  onActivate,
  onDeactivate,
}: CustomerTableProps): React.JSX.Element {
  const updateFilter = (key: keyof typeof filters, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <Stack spacing={2}>
      {/* Filters */}

      <Grid container spacing={2}>
        <Grid
          size={{
            xs: 12,
            md: 4,
          }}
        >
          <TextField
            fullWidth
            label="Search Customer"
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
          />
        </Grid>

        <Grid
          size={{
            xs: 12,
            md: 2,
          }}
        >
          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>

            <Select
              value={filters.status}
              label="Status"
              onChange={(e) => updateFilter("status", e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="ACTIVE">Active</MenuItem>
              <MenuItem value="INACTIVE">Inactive</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid
          size={{
            xs: 12,
            md: 3,
          }}
        >
          <FormControl fullWidth>
            <InputLabel>Segment</InputLabel>

            <Select
              value={filters.segment}
              label="Segment"
              onChange={(e) => updateFilter("segment", e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="VIP">VIP</MenuItem>
              <MenuItem value="LOYAL">Loyal</MenuItem>
              <MenuItem value="REGULAR">Regular</MenuItem>
              <MenuItem value="NEW">New</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid
          size={{
            xs: 12,
            md: 3,
          }}
        >
          <FormControl fullWidth>
            <InputLabel>Sort</InputLabel>

            <Select
              value={filters.sort}
              label="Sort"
              onChange={(e) => updateFilter("sort", e.target.value)}
            >
              <MenuItem value="recent">Recent</MenuItem>
              <MenuItem value="name">Name</MenuItem>
              <MenuItem value="spent">Total Spent</MenuItem>
              <MenuItem value="orders">Orders</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      {/* Customer List */}

      {loading ? (
        <Typography>Loading customers...</Typography>
      ) : customers.length === 0 ? (
        <Typography>No customers found.</Typography>
      ) : (
        customers.map((customer) => (
          <Card key={customer.id} variant="outlined">
            <CardContent>
              <Stack
                direction={{
                  xs: "column",
                  md: "row",
                }}
                spacing={2}
                alignItems={{
                  md: "center",
                }}
              >
                <Stack spacing={0.5} flexGrow={1}>
                  <Typography fontWeight={700}>{customer.name}</Typography>

                  <Typography variant="body2" color="text.secondary">
                    {customer.email}
                  </Typography>

                  <Typography variant="body2" color="text.secondary">
                    {customer.phone}
                  </Typography>

                  <Typography variant="body2">
                    Orders: {customer.total_orders}
                    {" • "}₹{customer.total_spent.toFixed(2)}
                  </Typography>

                  <Typography variant="caption" color="text.secondary">
                    Last Purchase:{" "}
                    {customer.last_purchase
                      ? new Date(customer.last_purchase).toLocaleDateString()
                      : "Never"}
                  </Typography>
                </Stack>

                <Chip
                  label={customer.status}
                  color={customer.status === "ACTIVE" ? "success" : "default"}
                />

                <Chip label={customer.segment} color="primary" />

                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Button size="small" onClick={() => onView(customer.id)}>
                    View
                  </Button>

                  <Button size="small" onClick={() => onEdit(customer)}>
                    Edit
                  </Button>

                  <Button
                    size="small"
                    color="error"
                    onClick={() => onDelete(customer.id)}
                  >
                    Delete
                  </Button>

                  {customer.status === "ACTIVE" ? (
                    <Button
                      size="small"
                      color="warning"
                      onClick={() => onDeactivate(customer.id)}
                    >
                      Deactivate
                    </Button>
                  ) : (
                    <Button
                      size="small"
                      color="success"
                      onClick={() => onActivate(customer.id)}
                    >
                      Activate
                    </Button>
                  )}
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        ))
      )}
    </Stack>
  );
}
