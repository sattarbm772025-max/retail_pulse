import { useState } from "react";
import {
  Alert, Box, Button, Card, CardContent, FormControl, Grid, InputLabel,
  MenuItem, Pagination, Select, Skeleton, Stack, Table, TableBody,
  TableCell, TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";

import { DashboardLayout } from "../layouts/DashboardLayout";
import { reportApi, type ReportFilters, type ReportType } from "../api/reportApi";

const reportOptions: { value: ReportType; label: string }[] = [
  { value: "sales", label: "Sales Report" },
  { value: "inventory", label: "Inventory Report" },
  { value: "customers", label: "Customer Report" },
  { value: "product_performance", label: "Product Performance Report" },
  { value: "stock_movement", label: "Stock Movement Report" },
];

function reportSort(reportType: ReportType) {
  if (reportType === "sales" || reportType === "stock_movement") return "date";
  if (reportType === "inventory") return "product";
  if (reportType === "customers") return "name";
  return "revenue";
}

export function ReportsPage() {
  const [filters, setFilters] = useState<ReportFilters>({
    report_type: "sales", page: 1, page_size: 25, sort_by: "date", sort_direction: "desc",
  });
  const [submitted, setSubmitted] = useState(filters);
  const report = useQuery({
    queryKey: ["report", submitted],
    queryFn: () => reportApi.generate(submitted).then((response) => response.data),
  });
  const update = (key: keyof ReportFilters, value: string | number) => {
    setFilters((current) => {
      const next = { ...current, [key]: value, page: 1 };
      if (key === "report_type") next.sort_by = reportSort(value as ReportType);
      return next;
    });
  };
  const run = () => setSubmitted({ ...filters });
  const pageChange = (_: unknown, page: number) => {
    const next = { ...filters, page };
    setFilters(next); setSubmitted(next);
  };

  return <DashboardLayout><Stack spacing={3}>
    <Box>
      <Typography variant="h4" fontWeight={800}>Reports</Typography>
      <Typography color="text.secondary">Generate a structured, company-scoped view from your live operational data.</Typography>
    </Box>
    <Card><CardContent><Stack spacing={2}>
      <Typography variant="h6">Report builder</Typography>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 3 }}><FormControl fullWidth><InputLabel>Report type</InputLabel><Select label="Report type" value={filters.report_type} onChange={(e) => update("report_type", e.target.value)}>{reportOptions.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}</Select></FormControl></Grid>
        <Grid size={{ xs: 6, md: 2 }}><TextField fullWidth label="From" type="date" InputLabelProps={{ shrink: true }} value={String(filters.date_from ?? "").slice(0, 10)} onChange={(e) => update("date_from", e.target.value ? `${e.target.value}T00:00:00` : "")} /></Grid>
        <Grid size={{ xs: 6, md: 2 }}><TextField fullWidth label="To" type="date" InputLabelProps={{ shrink: true }} value={String(filters.date_to ?? "").slice(0, 10)} onChange={(e) => update("date_to", e.target.value ? `${e.target.value}T23:59:59` : "")} /></Grid>
        <Grid size={{ xs: 12, md: 3 }}><TextField fullWidth label="Brand" value={filters.brand ?? ""} onChange={(e) => update("brand", e.target.value)} placeholder="Optional" /></Grid>
        <Grid size={{ xs: 12, md: 2 }}><Button fullWidth sx={{ height: "100%" }} variant="contained" onClick={run}>Generate report</Button></Grid>
      </Grid>
      <Alert severity="info">Day 2 complete: report generation, sorting and pagination are available. Filter pickers, exports, history and schedules are planned next.</Alert>
    </Stack></CardContent></Card>
    <Card><CardContent><Stack spacing={2}>
      <Typography variant="h6">{report.data?.report_name ?? "Generated report"}</Typography>
      {report.isLoading ? <><Skeleton height={48}/><Skeleton height={48}/><Skeleton height={48}/></> : report.isError ? <Alert severity="error">The report could not be generated. Check the selected dates and try again.</Alert> : report.data && <>
        <Typography variant="body2" color="text.secondary">{report.data.pagination.total} records · Page {report.data.pagination.page} of {report.data.pagination.pages}</Typography>
        <Box sx={{ overflowX: "auto" }}><Table size="small"><TableHead><TableRow>{report.data.columns.map((column) => <TableCell key={column.key}>{column.label}</TableCell>)}</TableRow></TableHead><TableBody>{report.data.rows.length ? report.data.rows.map((row, index) => <TableRow key={index}>{report.data.columns.map((column) => <TableCell key={column.key}>{row[column.key] ?? "—"}</TableCell>)}</TableRow>) : <TableRow><TableCell align="center" colSpan={report.data.columns.length}>No data matches the applied filters.</TableCell></TableRow>}</TableBody></Table></Box>
        <Pagination count={report.data.pagination.pages} page={report.data.pagination.page} onChange={pageChange} />
      </>}
    </Stack></CardContent></Card>
  </Stack></DashboardLayout>;
}
