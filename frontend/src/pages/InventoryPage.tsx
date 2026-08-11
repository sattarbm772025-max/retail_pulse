import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  Select,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { catalogApi } from "../api/catalogApi";
import {
  inventoryApi,
  type InventoryItem,
  type StockAdjustmentPayload,
} from "../api/inventoryApi";
import { useAuth } from "../context/AuthContext";
import { DashboardLayout } from "../layouts/DashboardLayout";
import { InventoryStockChart } from "../components/inventory/InventoryStockChart";
import { InventoryStatusPie } from "../components/inventory/InventoryStatusPie";
import { InventoryMovementChart } from "../components/inventory/InventoryMovementChart";
import { InventoryCategoryChart } from "../components/inventory/InventoryCategoryChart";

const pageSize = 10;
const label = (value: string) => value.replaceAll("_", " ");
const color = (status: string) =>
  status === "IN_STOCK"
    ? "success"
    : status === "LOW_STOCK"
      ? "warning"
      : "error";

export function InventoryPage() {
  const { profile } = useAuth();
  const client = useQueryClient();
  const isAdmin = ["SUPER_ADMIN", "COMPANY_ADMIN"].includes(
    profile?.role ?? "",
  );
  const [filters, setFilters] = useState({
    search: "",
    category: "",
    brand: "",
    status: "",
    sort: "updated",
  });
  const [page, setPage] = useState(0);
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [history, setHistory] = useState<InventoryItem | null>(null);
  const [historyPage, setHistoryPage] = useState(0);
  const [reorder, setReorder] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState<StockAdjustmentPayload>({
    adjustment_type: "STOCK_IN",
    quantity: 1,
    reason: "",
    remarks: "",
  });
  const [level, setLevel] = useState({ reorder_level: 0, reason: "" });
  const [error, setError] = useState("");
  const setFilter = (name: keyof typeof filters, value: string) => {
    setFilters({ ...filters, [name]: value });
    setPage(0);
  };
  const invalidate = () => {
    client.invalidateQueries({ queryKey: ["inventory"] });
    client.invalidateQueries({ queryKey: ["inventory-summary"] });
    client.invalidateQueries({ queryKey: ["inventory-charts"] });
  };
  const inventory = useQuery({
    queryKey: ["inventory", filters, page],
    queryFn: () =>
      inventoryApi
        .list({
          search: filters.search || undefined,
          category_id: filters.category || undefined,
          brand: filters.brand || undefined,
          stock_status: filters.status || undefined,
          sort: filters.sort,
          page: page + 1,
          page_size: pageSize,
        })
        .then((r) => r.data),
  });
  const summary = useQuery({
    queryKey: ["inventory-summary"],
    queryFn: () => inventoryApi.summary().then((r) => r.data),
  });
  const charts = useQuery({
    queryKey: ["inventory-charts"],
    queryFn: () => inventoryApi.charts().then((r) => r.data),
  });
  const categories = useQuery({
    queryKey: ["inventory-categories"],
    queryFn: () => catalogApi.categories().then((r) => r.data),
  });
  const moves = useQuery({
    queryKey: ["inventory-movements", history?.id, historyPage],
    enabled: !!history,
    queryFn: () =>
      inventoryApi
        .movements(history!.id, { page: historyPage + 1, page_size: pageSize })
        .then((r) => r.data),
  });
  const adjust = useMutation({
    mutationFn: () => inventoryApi.adjust(item!.id, form),
    onSuccess: () => {
      invalidate();
      setItem(null);
    },
    onError: (e: any) =>
      setError(e.response?.data?.detail ?? "Unable to adjust stock."),
  });
  const updateReorder = useMutation({
    mutationFn: () =>
      inventoryApi.reorder(reorder!.id, level.reorder_level, level.reason),
    onSuccess: () => {
      invalidate();
      setReorder(null);
    },
    onError: (e: any) =>
      setError(e.response?.data?.detail ?? "Unable to update reorder level."),
  });
  const cards = [
    ["Total products", summary.data?.total_products],
    ["Inventory quantity", summary.data?.total_inventory_quantity],
    ["Low stock", summary.data?.low_stock_products],
    ["Out of stock", summary.data?.out_of_stock_products],
  ];
  return (
    <DashboardLayout>
      <Typography variant="h4" fontWeight={800}>
        Inventory overview
      </Typography>
      <Typography color="text.secondary" mb={3}>
        Monitor stock, make traceable adjustments, and investigate every
        movement.
      </Typography>
      <Grid container spacing={2} mb={3}>
        {cards.map(([title, value]) => (
          <Grid key={String(title)} size={{ xs: 6, md: 3 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  {title}
                </Typography>
                {summary.isLoading ? (
                  <Skeleton width="60%" />
                ) : (
                  <Typography variant="h5" fontWeight={800}>
                    {value ?? 0}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      <Grid container spacing={2} mb={3}>
        <Grid size={{ xs: 12, md: 7 }}>
          <BarChart
            title="Inventory by category"
            data={charts.data?.inventory_by_category ?? []}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <DonutChart
            title="Stock status distribution"
            data={charts.data?.stock_status_distribution ?? []}
          />
        </Grid>
      </Grid>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6">Stock by Product</Typography>

              <InventoryStockChart
                data={(inventory.data?.items ?? []).map((item) => ({
                  product: item.product_name,
                  stock: item.available_stock,
                }))}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6">Stock Status</Typography>

              <InventoryStatusPie
                data={(charts.data?.stock_status_distribution ?? []).map(
                  (item) => ({ name: item.status, value: item.count }),
                )}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6">Inventory Movement</Typography>

              <InventoryMovementChart data={charts.data?.movement_trend ?? []} />
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6">Stock by Category</Typography>

              <InventoryCategoryChart
                data={(charts.data?.inventory_by_category ?? []).map((item) => ({
                  category: item.category,
                  stock: item.quantity,
                }))}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      <Card variant="outlined">
        <CardContent>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1} mb={2}>
            <TextField
              label="Search product or SKU"
              value={filters.search}
              onChange={(e) => setFilter("search", e.target.value)}
              fullWidth
            />
            <Select
              value={filters.category}
              displayEmpty
              onChange={(e) => setFilter("category", String(e.target.value))}
            >
              <MenuItem value="">All categories</MenuItem>
              {categories.data?.map((category) => (
                <MenuItem key={category.id} value={String(category.id)}>
                  {category.name}
                </MenuItem>
              ))}
            </Select>
            <TextField
              label="Brand"
              value={filters.brand}
              onChange={(e) => setFilter("brand", e.target.value)}
            />
            <Select
              value={filters.status}
              displayEmpty
              onChange={(e) => setFilter("status", String(e.target.value))}
            >
              <MenuItem value="">All statuses</MenuItem>
              <MenuItem value="IN_STOCK">In stock</MenuItem>
              <MenuItem value="LOW_STOCK">Low stock</MenuItem>
              <MenuItem value="OUT_OF_STOCK">Out of stock</MenuItem>
            </Select>
            <Select
              value={filters.sort}
              onChange={(e) => setFilter("sort", String(e.target.value))}
            >
              <MenuItem value="updated">Recently updated</MenuItem>
              <MenuItem value="name">Product name</MenuItem>
              <MenuItem value="stock">Current stock</MenuItem>
            </Select>
          </Stack>
          <TableContainer>
            <Table size="small" sx={{ minWidth: 1050 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Product</TableCell>
                  <TableCell>SKU</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Brand</TableCell>
                  <TableCell align="right">Current</TableCell>
                  <TableCell align="right">Reserved</TableCell>
                  <TableCell align="right">Available</TableCell>
                  <TableCell align="right">Reorder</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {inventory.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={10}>
                      <Skeleton />
                    </TableCell>
                  </TableRow>
                ) : (
                  inventory.data?.items.map((record) => (
                    <TableRow key={record.id} hover>
                      <TableCell sx={{ fontWeight: 700 }}>
                        {record.product_name}
                      </TableCell>
                      <TableCell>{record.sku}</TableCell>
                      <TableCell>{record.category_name}</TableCell>
                      <TableCell>{record.brand || "—"}</TableCell>
                      <TableCell align="right">
                        {record.current_stock}
                      </TableCell>
                      <TableCell align="right">
                        {record.reserved_stock}
                      </TableCell>
                      <TableCell align="right">
                        {record.available_stock}
                      </TableCell>
                      <TableCell align="right">
                        {record.reorder_level}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          color={color(record.stock_status)}
                          label={label(record.stock_status)}
                        />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5}>
                          <Button
                            size="small"
                            onClick={(e) => {
                              e.currentTarget.blur();
                              setHistoryPage(0);
                              setHistory(record);
                            }}
                          >
                            History
                          </Button>
                          {isAdmin && (
                            <>
                              <Button
                                size="small"
                                onClick={(e) => {
                                  e.currentTarget.blur();
                                  setError("");
                                  setLevel({
                                    reorder_level: record.reorder_level,
                                    reason: "",
                                  });
                                  setReorder(record);
                                }}
                              >
                                Level
                              </Button>
                              <Button
                                size="small"
                                variant="contained"
                                onClick={(e) => {
                                  e.currentTarget.blur();
                                  setError("");
                                  setForm({
                                    adjustment_type: "STOCK_IN",
                                    quantity: 1,
                                    reason: "",
                                    remarks: "",
                                  });
                                  setItem(record);
                                }}
                              >
                                Adjust
                              </Button>
                            </>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
                {!inventory.isLoading && !inventory.data?.items.length && (
                  <TableRow>
                    <TableCell colSpan={10} align="center">
                      No inventory matches these filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={inventory.data?.total ?? 0}
            page={page}
            onPageChange={(_, next) => setPage(next)}
            rowsPerPage={pageSize}
            rowsPerPageOptions={[pageSize]}
          />
        </CardContent>
      </Card>
      <Dialog
        open={!!item}
        onClose={() => setItem(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Adjust stock — {item?.product_name}</DialogTitle>
        <DialogContent>
          <Stack mt={1} spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}
            <Select
              value={form.adjustment_type}
              onChange={(e) =>
                setForm({
                  ...form,
                  adjustment_type: e.target
                    .value as StockAdjustmentPayload["adjustment_type"],
                  direction: undefined,
                })
              }
            >
              <MenuItem value="STOCK_IN">Stock addition</MenuItem>
              <MenuItem value="STOCK_OUT">Stock removal</MenuItem>
              <MenuItem value="MANUAL_ADJUSTMENT">Manual adjustment</MenuItem>
            </Select>
            {form.adjustment_type === "MANUAL_ADJUSTMENT" && (
              <Select
                displayEmpty
                value={form.direction ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    direction: e.target.value as "INCREASE" | "DECREASE",
                  })
                }
              >
                <MenuItem value="" disabled>
                  Choose direction
                </MenuItem>
                <MenuItem value="INCREASE">Increase stock</MenuItem>
                <MenuItem value="DECREASE">Decrease stock</MenuItem>
              </Select>
            )}
            <TextField
              label="Quantity"
              type="number"
              inputProps={{ min: 1 }}
              value={form.quantity}
              onChange={(e) =>
                setForm({ ...form, quantity: Number(e.target.value) })
              }
            />
            <TextField
              required
              label="Reason"
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
            />
            <TextField
              label="Remarks"
              multiline
              minRows={2}
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setItem(null)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={
              adjust.isPending ||
              !form.reason ||
              (form.adjustment_type === "MANUAL_ADJUSTMENT" && !form.direction)
            }
            onClick={() => adjust.mutate()}
          >
            Save adjustment
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={!!reorder}
        onClose={() => setReorder(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Set reorder level — {reorder?.product_name}</DialogTitle>
        <DialogContent>
          <Stack mt={1} spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="Reorder level"
              type="number"
              inputProps={{ min: 0 }}
              value={level.reorder_level}
              onChange={(e) =>
                setLevel({ ...level, reorder_level: Number(e.target.value) })
              }
            />
            <TextField
              required
              label="Reason for change"
              value={level.reason}
              onChange={(e) => setLevel({ ...level, reason: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReorder(null)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={updateReorder.isPending || !level.reason}
            onClick={() => updateReorder.mutate()}
          >
            Update level
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={!!history}
        onClose={() => setHistory(null)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Movement history — {history?.product_name}</DialogTitle>
        <DialogContent>
          <TableContainer>
            <Table size="small" sx={{ minWidth: 700 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Type</TableCell>
                  <TableCell align="right">Changed</TableCell>
                  <TableCell align="right">Previous</TableCell>
                  <TableCell align="right">Updated</TableCell>
                  <TableCell>Reason</TableCell>
                  <TableCell>User</TableCell>
                  <TableCell>Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {moves.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <Skeleton />
                    </TableCell>
                  </TableRow>
                ) : (
                  moves.data?.items.map((move) => (
                    <TableRow key={move.id}>
                      <TableCell>{label(move.movement_type)}</TableCell>
                      <TableCell align="right">
                        {move.quantity_changed > 0
                          ? `+${move.quantity_changed}`
                          : move.quantity_changed}
                      </TableCell>
                      <TableCell align="right">
                        {move.previous_quantity}
                      </TableCell>
                      <TableCell align="right">
                        {move.updated_quantity}
                      </TableCell>
                      <TableCell>{move.reason}</TableCell>
                      <TableCell>{move.performed_by_name}</TableCell>
                      <TableCell>
                        {new Date(move.created_at).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={moves.data?.total ?? 0}
            page={historyPage}
            onPageChange={(_, next) => setHistoryPage(next)}
            rowsPerPage={pageSize}
            rowsPerPageOptions={[pageSize]}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistory(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </DashboardLayout>
  );
}

function BarChart({
  title,
  data,
}: {
  title: string;
  data: { category: string; quantity: number }[];
}) {
  const max = Math.max(...data.map((item) => item.quantity), 1);
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography fontWeight={700} mb={2}>
          {title}
        </Typography>
        <Stack spacing={1}>
          {data.map((item, index) => (
            <Box key={`${item.category}-${index}`}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2">{item.category}</Typography>
                <Typography variant="body2" fontWeight={700}>
                  {item.quantity}
                </Typography>
              </Stack>
              <Box
                sx={{
                  height: 10,
                  bgcolor: "action.hover",
                  borderRadius: 5,
                  overflow: "hidden",
                }}
              >
                <Box
                  sx={{
                    height: "100%",
                    width: `${(item.quantity / max) * 100}%`,
                    bgcolor: "primary.main",
                  }}
                />
              </Box>
            </Box>
          )) || <Typography color="text.secondary">No data yet.</Typography>}
        </Stack>
      </CardContent>
    </Card>
  );
}
function DonutChart({
  title,
  data,
}: {
  title: string;
  data: { status: string; count: number }[];
}) {
  const total = data.reduce((sum, item) => sum + item.count, 0);
  const colors = ["#2e7d32", "#ed6c02", "#d32f2f", "#1976d2"];
  let offset = 0;
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography fontWeight={700} mb={2}>
          {title}
        </Typography>
        <Stack direction="row" alignItems="center" spacing={2}>
          <svg width="125" viewBox="0 0 42 42" aria-label={title}>
            {data.map((item, index) => {
              const dash = total ? (item.count / total) * 100 : 0;
              const node = (
                <circle
                  key={`${item.status}-${index}`}
                  cx="21"
                  cy="21"
                  r="15.9155"
                  fill="transparent"
                  stroke={colors[index]}
                  strokeWidth="7"
                  strokeDasharray={`${dash} ${100 - dash}`}
                  strokeDashoffset={-offset}
                  transform="rotate(-90 21 21)"
                />
              );
              offset += dash;
              return node;
            })}
          </svg>
          <Stack spacing={0.5}>
            {data.map((item, index) => (
              <Stack
                key={`${item.status}-${index}`}
                direction="row"
                spacing={1}
              >
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    bgcolor: colors[index],
                  }}
                />
                <Typography variant="body2">
                  {label(item.status)}: {item.count}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
