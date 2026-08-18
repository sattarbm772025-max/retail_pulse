import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Box, Button, Stack, Typography } from "@mui/material";

import { DashboardLayout } from "../layouts/DashboardLayout";

import {
  customerApi,
  type Customer,
  type CustomerPayload,
} from "../api/customerApi";

import { CustomerDashboardCards } from "../components/customer/CustomerDashboardCards";
import { CustomerCharts } from "../components/customer/CustomerCharts";
import { CustomerTable } from "../components/customer/CustomerTable";
import { CustomerDialog } from "../components/customer/CustomerDialog";
import { CustomerProfile } from "../components/customer/CustomerProfile";
import { downloadPdf } from "../utils/download";

const blankCustomer: CustomerPayload = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  country: "",
  postal_code: "",
};

const errorMessage = (error: unknown) => {
  const detail = (
    error as {
      response?: {
        data?: {
          detail?: unknown;
        };
      };
    }
  )?.response?.data?.detail;

  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    return detail
      .map((item: { msg?: string }) => item.msg ?? "Invalid value")
      .join(", ");
  }

  return "Something went wrong.";
};

export function CustomersPage() {
  const client = useQueryClient();

  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const [editing, setEditing] = useState<Customer | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(
    null,
  );

  const [message, setMessage] = useState("");

  const [form, setForm] = useState<CustomerPayload>(blankCustomer);

  const [filters, setFilters] = useState({
    search: "",
    status: "",
    segment: "",
    sort: "recent",
  });

  const downloadCsv = async () => {
    const response = await customerApi.exportCsv();
    const url = URL.createObjectURL(
      new Blob([response.data], { type: "text/csv" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "customers.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const summary = useQuery({
    queryKey: ["customer-summary"],
    queryFn: () => customerApi.summary().then((response) => response.data),
  });

  const customers = useQuery({
    queryKey: ["customers", filters],
    queryFn: () =>
      customerApi
        .list({
          search: filters.search || undefined,
          status: filters.status || undefined,
          segment: filters.segment || undefined,
          sort: filters.sort,
        })
        .then((response) => response.data),
  });

  const profile = useQuery({
    enabled: selectedCustomerId !== null,
    queryKey: ["customer-profile", selectedCustomerId],
    queryFn: () =>
      customerApi
        .profile(selectedCustomerId!)
        .then((response) => response.data),
  });

  const save = useMutation({
    mutationFn: () =>
      editing ? customerApi.update(editing.id, form) : customerApi.create(form),

    onSuccess: () => {
      client.invalidateQueries({
        queryKey: ["customers"],
      });

      client.invalidateQueries({
        queryKey: ["customer-summary"],
      });

      setOpen(false);
      setEditing(null);
      setForm(blankCustomer);
      setMessage("");
    },

    onError: (error) => {
      setMessage(errorMessage(error));
    },
  });

  const remove = useMutation({
    mutationFn: (id: number) => customerApi.delete(id),

    onSuccess: () => {
      client.invalidateQueries({
        queryKey: ["customers"],
      });

      client.invalidateQueries({
        queryKey: ["customer-summary"],
      });
    },
  });

  const activate = useMutation({
    mutationFn: (id: number) => customerApi.activate(id),

    onSuccess: () => {
      client.invalidateQueries({
        queryKey: ["customers"],
      });
    },
  });

  const deactivate = useMutation({
    mutationFn: (id: number) => customerApi.deactivate(id),

    onSuccess: () => {
      client.invalidateQueries({
        queryKey: ["customers"],
      });
    },
  });

  const openCreate = () => {
    setEditing(null);
    setForm(blankCustomer);
    setMessage("");
    setOpen(true);
  };

  const openEdit = (customer: Customer) => {
    setEditing(customer);

    setForm({
      first_name: customer.name.split(" ")[0] ?? "",
      last_name: customer.name.split(" ").slice(1).join(" "),
      email: customer.email,
      phone: customer.phone,
      address: "",
      city: "",
      state: "",
      country: "",
      postal_code: "",
    });

    setMessage("");
    setOpen(true);
  };

  const openProfile = (id: number) => {
    setSelectedCustomerId(id);
    setProfileOpen(true);
  };

  return (
    <DashboardLayout>
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        spacing={2}
        mb={3}
      >
        <Box>
          <Typography variant="h4" fontWeight={800}>
            Customer Management
          </Typography>

          <Typography color="text.secondary">
            Manage customers, purchase history and analytics.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={downloadCsv}>
            Export CSV
          </Button>
          <Button
            variant="outlined"
            onClick={() => downloadPdf(customerApi.exportPdf, "customers.pdf")}
          >
            Download PDF
          </Button>
          <Button variant="contained" onClick={openCreate}>
            Add Customer
          </Button>
        </Stack>
      </Stack>

      <CustomerDashboardCards
        summary={summary.data}
        loading={summary.isLoading}
      />

      <CustomerCharts customers={customers.data ?? []} />

      <CustomerTable
        customers={customers.data ?? []}
        loading={customers.isLoading}
        filters={filters}
        setFilters={setFilters}
        onView={openProfile}
        onEdit={openEdit}
        onDelete={(id) => {
          if (window.confirm("Delete this customer?")) {
            remove.mutate(id);
          }
        }}
        onActivate={(id) => activate.mutate(id)}
        onDeactivate={(id) => deactivate.mutate(id)}
      />

      <CustomerDialog
        open={open}
        editing={Boolean(editing)}
        form={form}
        setForm={setForm}
        error={message}
        saving={save.isPending}
        onClose={() => {
          setOpen(false);
          setEditing(null);
          setForm(blankCustomer);
          setMessage("");
        }}
        onSubmit={() => save.mutate()}
      />

      <CustomerProfile
        open={profileOpen}
        customer={profile.data}
        loading={profile.isLoading}
        onClose={() => {
          setProfileOpen(false);
          setSelectedCustomerId(null);
        }}
      />
    </DashboardLayout>
  );
}
