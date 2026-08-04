import { MenuItem, Select, Stack, TextField } from "@mui/material";

interface Filters {
  search: string;
  channel: string;
  payment: string;
  categoryId: string;
  dateFrom: string;
  dateTo: string;
  sort: string;
}

interface Category {
  id: number;
  name: string;
}

interface SalesFiltersProps {
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  categories: Category[];
}

export function SalesFilters({
  filters,
  setFilters,
  categories,
}: SalesFiltersProps): React.JSX.Element {
  const set = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <Stack spacing={1} mb={2}>
      <Stack
        direction={{
          xs: "column",
          md: "row",
        }}
        spacing={1}
      >
        <TextField
          label="Invoice, customer or product"
          value={filters.search}
          onChange={(e) => set("search", e.target.value)}
          fullWidth
        />

        <TextField
          label="From date"
          type="date"
          value={filters.dateFrom}
          onChange={(e) => set("dateFrom", e.target.value)}
          InputLabelProps={{ shrink: true }}
        />

        <TextField
          label="To date"
          type="date"
          value={filters.dateTo}
          onChange={(e) => set("dateTo", e.target.value)}
          InputLabelProps={{ shrink: true }}
        />

        <Select
          displayEmpty
          value={filters.categoryId}
          onChange={(e) => set("categoryId", String(e.target.value))}
        >
          <MenuItem value="">All categories</MenuItem>

          {categories.map((category) => (
            <MenuItem key={category.id} value={String(category.id)}>
              {category.name}
            </MenuItem>
          ))}
        </Select>
      </Stack>

      <Stack
        direction={{
          xs: "column",
          md: "row",
        }}
        spacing={1}
      >
        <Select
          displayEmpty
          value={filters.channel}
          onChange={(e) => set("channel", String(e.target.value))}
        >
          <MenuItem value="">All channels</MenuItem>
          <MenuItem value="RETAIL_STORE">Retail Store</MenuItem>
          <MenuItem value="ONLINE_STORE">Online Store</MenuItem>
          <MenuItem value="MARKETPLACE">Marketplace</MenuItem>
        </Select>

        <Select
          displayEmpty
          value={filters.payment}
          onChange={(e) => set("payment", String(e.target.value))}
        >
          <MenuItem value="">All payments</MenuItem>
          <MenuItem value="CASH">Cash</MenuItem>
          <MenuItem value="CARD">Card</MenuItem>
          <MenuItem value="UPI">UPI</MenuItem>
          <MenuItem value="BANK_TRANSFER">Bank Transfer</MenuItem>
        </Select>

        <Select
          value={filters.sort}
          onChange={(e) => set("sort", String(e.target.value))}
        >
          <MenuItem value="date">Date</MenuItem>
          <MenuItem value="invoice">Invoice</MenuItem>
          <MenuItem value="total">Total Amount</MenuItem>
        </Select>
      </Stack>
    </Stack>
  );
}
