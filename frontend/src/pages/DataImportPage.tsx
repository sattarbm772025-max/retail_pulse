import { ChangeEvent, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import UploadFileOutlinedIcon from "@mui/icons-material/UploadFileOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { importApi } from "../api/importApi";
import { DashboardLayout } from "../layouts/DashboardLayout";

type Batch = {
  id: number;
  import_type: string;
  filename: string;
  status: string;
  total_records: number;
  valid_records: number;
  failed_records: number;
  duplicate_records: number;
  successful_records: number;
  preview?: Record<string, string>[];
  detected_columns?: string[];
  errors?: { row_number: number; error_type: string; error_message: string }[];
  created_at?: string;
  uploaded_by_name?: string;
};
const MAX_SIZE = 10 * 1024 * 1024;

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
function statusColor(status: string): "success" | "warning" | "error" | "info" {
  return status === "COMPLETED"
    ? "success"
    : status.includes("ERROR")
      ? "warning"
      : status === "FAILED"
        ? "error"
        : "info";
}
const templates: Record<string, string> = {
  PRODUCTS:
    "Product Name,SKU,Category,Unit Price,Stock Quantity,Cost Price,Brand,Supplier\nWireless Mouse,WM-100,Accessories,799,50,450,RetailPulse,Main Supplier\n",
  CUSTOMERS:
    "Name,Email,Phone,Customer Type,Address,City,State,Country,Postal Code\nAsha Kumar,asha@example.com,+919876543210,RETAIL,12 Market Road,Chennai,Tamil Nadu,India,600001\n",
  SALES:
    "Customer,Product,Quantity,Unit Price,Sale Date,Sales Channel,Payment Method,Payment Status,Notes\nAsha Kumar,Wireless Mouse,2,799,2026-09-09,RETAIL_STORE,CASH,PAID,Imported sample sale\n",
};

function downloadTemplate(type: string) {
  download(
    new Blob([templates[type]], { type: "text/csv" }),
    `${type.toLowerCase()}-import-template.csv`,
  );
}

export function DataImportPage() {
  const [type, setType] = useState("PRODUCTS");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [batch, setBatch] = useState<Batch | null>(null);
  const client = useQueryClient();
  const history = useQuery({
    queryKey: ["import-history"],
    queryFn: async () => (await importApi.history()).data,
    staleTime: 30_000,
  });
  const upload = useMutation({
    mutationFn: () => importApi.upload(type, file!),
    onSuccess: ({ data }) => {
      setBatch(data);
      client.invalidateQueries({ queryKey: ["import-history"] });
    },
    onError: (e: any) =>
      setFileError(
        e.response?.data?.detail || "Upload failed. Please try again.",
      ),
  });
  const validate = useMutation({
    mutationFn: (id: number) => importApi.validate(id),
    onSuccess: ({ data }) => setBatch(data),
    onError: (e: any) =>
      setFileError(e.response?.data?.detail || "Validation failed"),
  });
  const process = useMutation({
    mutationFn: (id: number) => importApi.process(id),
    onSuccess: ({ data }) => {
      setBatch(data);
      client.invalidateQueries({ queryKey: ["import-history"] });
    },
    onError: (e: any) =>
      setFileError(e.response?.data?.detail || "Import processing failed"),
  });
  const chooseFile = (event: ChangeEvent<HTMLInputElement>) => {
    const chosen = event.target.files?.[0] || null;
    setFileError("");
    setBatch(null);
    if (!chosen) return setFile(null);
    if (!chosen.name.toLowerCase().endsWith(".csv")) {
      setFile(null);
      return setFileError("Only .csv files are supported.");
    }
    if (chosen.size > MAX_SIZE) {
      setFile(null);
      return setFileError("File must be 10 MB or smaller.");
    }
    setFile(chosen);
  };
  const busy = upload.isPending || validate.isPending || process.isPending;
  const headers = batch?.detected_columns || [];
  return (
    <DashboardLayout>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" fontWeight={700}>
            Data Import
          </Typography>
          <Typography color="text.secondary">
            Validate CSV data before it enters your company workspace.
          </Typography>
        </Box>
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h6">
                1. Select data and upload CSV
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <FormControl fullWidth>
                    <InputLabel>Import type</InputLabel>
                    <Select
                      label="Import type"
                      value={type}
                      onChange={(e) => {
                        setType(e.target.value);
                        setBatch(null);
                      }}
                    >
                      <MenuItem value="PRODUCTS">Products</MenuItem>
                      <MenuItem value="CUSTOMERS">Customers</MenuItem>
                      <MenuItem value="SALES">Sales Transactions</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, md: 8 }}>
                  <Button
                    component="label"
                    variant="outlined"
                    startIcon={<UploadFileOutlinedIcon />}
                    fullWidth
                    sx={{ height: 56 }}
                  >
                    Choose CSV
                    <input
                      hidden
                      type="file"
                      accept=".csv,text/csv"
                      onChange={chooseFile}
                    />
                  </Button>
                </Grid>
              </Grid>
              {file && (
                <Alert
                  severity="info"
                  action={
                    <Button
                      onClick={() => {
                        setFile(null);
                        setBatch(null);
                      }}
                    >
                      Remove
                    </Button>
                  }
                >
                  {file.name} ({Math.ceil(file.size / 1024)} KB)
                </Alert>
              )}
              {fileError && <Alert severity="error">{fileError}</Alert>}
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <Button
                  variant="outlined"
                  onClick={() => downloadTemplate(type)}
                >
                  Download {type.toLowerCase()} template
                </Button>
                <Button
                  variant="contained"
                  disabled={!file || busy}
                  onClick={() => upload.mutate()}
                >
                  {upload.isPending ? "Uploading…" : "Upload & Validate"}
                </Button>
              </Stack>
              {busy && <LinearProgress />}
            </Stack>
          </CardContent>
        </Card>
        {batch && (
          <>
            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Box>
                      <Typography variant="h6">
                        2. Validation preview
                      </Typography>
                      <Typography color="text.secondary">
                        {batch.filename} · {batch.import_type}
                      </Typography>
                    </Box>
                    <Chip
                      label={batch.status.replaceAll("_", " ")}
                      color={statusColor(batch.status)}
                    />
                  </Stack>
                  <Grid container spacing={2}>
                    {[
                      ["Total", batch.total_records],
                      ["Valid", batch.valid_records],
                      ["Invalid", batch.failed_records],
                      ["Duplicates", batch.duplicate_records],
                    ].map(([label, value]) => (
                      <Grid size={{ xs: 6, md: 3 }} key={String(label)}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography color="text.secondary">
                              {label}
                            </Typography>
                            <Typography variant="h5">{value}</Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                  {headers.length > 0 && (
                    <Box sx={{ overflowX: "auto" }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            {headers.map((header) => (
                              <TableCell key={header}>{header}</TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {batch.preview?.map((row, index) => (
                            <TableRow key={index}>
                              {headers.map((header) => (
                                <TableCell key={header}>
                                  {row[header] || "—"}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Box>
                  )}
                  {batch.errors?.length ? (
                    <Alert severity="warning">
                      {batch.errors.slice(0, 5).map((error) => (
                        <div key={`${error.row_number}-${error.error_message}`}>
                          Row {error.row_number}: {error.error_message}
                        </div>
                      ))}
                    </Alert>
                  ) : (
                    <Alert severity="success">
                      All rows passed validation.
                    </Alert>
                  )}
                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="outlined"
                      disabled={busy}
                      onClick={() => validate.mutate(batch.id)}
                    >
                      Validate again
                    </Button>
                    <Button
                      variant="contained"
                      disabled={
                        busy ||
                        batch.status === "FAILED" ||
                        batch.valid_records === 0
                      }
                      onClick={() => process.mutate(batch.id)}
                    >
                      {process.isPending
                        ? "Importing…"
                        : "Import valid records"}
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
            {batch.status.startsWith("COMPLETED") && (
              <Alert severity={batch.failed_records ? "warning" : "success"}>
                Import completed: {batch.successful_records} added,{" "}
                {batch.failed_records} failed.
              </Alert>
            )}
          </>
        )}
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h6">Import history</Typography>
              {history.isLoading ? (
                <CircularProgress />
              ) : history.isError ? (
                <Alert severity="error">Could not load import history.</Alert>
              ) : (
                <Box sx={{ overflowX: "auto" }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>Type / file</TableCell>
                        <TableCell>Uploaded by</TableCell>
                        <TableCell>Totals</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Errors</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {history.data?.items?.length ? (
                        history.data.items.map((item: Batch) => (
                          <TableRow key={item.id}>
                            <TableCell>#{item.id}</TableCell>
                            <TableCell>
                              <b>{item.import_type}</b>
                              <br />
                              {item.filename}
                            </TableCell>
                            <TableCell>
                              {item.uploaded_by_name || "—"}
                            </TableCell>
                            <TableCell>
                              {item.successful_records}/{item.total_records}
                            </TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                label={item.status.replaceAll("_", " ")}
                                color={statusColor(item.status)}
                              />
                            </TableCell>
                            <TableCell>
                              {item.failed_records ? (
                                <Button
                                  size="small"
                                  startIcon={<DownloadOutlinedIcon />}
                                  onClick={async () =>
                                    download(
                                      (await importApi.errors(item.id)).data,
                                      `${item.filename}-errors.csv`,
                                    )
                                  }
                                >
                                  CSV
                                </Button>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} align="center">
                            <Stack alignItems="center" spacing={1} py={2}>
                              <Typography fontWeight={600}>
                                No imports yet
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                Download a template above, add your company
                                data, then upload it to create your first
                                import.
                              </Typography>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </Box>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </DashboardLayout>
  );
}
