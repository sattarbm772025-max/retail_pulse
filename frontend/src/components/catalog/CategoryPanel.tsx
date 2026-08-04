import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import {
  catalogApi,
  type Category,
  type CategoryPayload,
} from "../../api/catalogApi";

const blankCategory: CategoryPayload = {
  name: "",
  description: "",
  status: "ACTIVE",
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

  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    return detail
      .map((item: { msg?: string }) => item.msg ?? "Invalid value")
      .join(", ");
  }

  return "Something went wrong. Please try again.";
};

type Props = {
  categories: Category[];
  loading: boolean;
  error: string;
};

export default function CategoryPanel({ categories, loading, error }: Props) {
  const client = useQueryClient();

  const [form, setForm] = useState<CategoryPayload>(blankCategory);
  const [editing, setEditing] = useState<Category | null>(null);
  const [message, setMessage] = useState("");

  const save = useMutation({
    mutationFn: () =>
      editing
        ? catalogApi.updateCategory(editing.id, form)
        : catalogApi.createCategory(form),

    onSuccess: () => {
      client.invalidateQueries({
        queryKey: ["categories"],
      });

      client.invalidateQueries({
        queryKey: ["catalog-summary"],
      });

      setForm(blankCategory);
      setEditing(null);
      setMessage("Category saved successfully.");
    },

    onError: (error) => {
      setMessage(errorMessage(error));
    },
  });

  const remove = useMutation({
    mutationFn: (id: number) => catalogApi.deleteCategory(id),

    onSuccess: () => {
      client.invalidateQueries({
        queryKey: ["categories"],
      });

      client.invalidateQueries({
        queryKey: ["catalog-summary"],
      });
    },

    onError: (error) => {
      setMessage(errorMessage(error));
    },
  });

  return (
    <Stack spacing={3}>
      <Stack
        direction={{
          xs: "column",
          md: "row",
        }}
        spacing={2}
      >
        <TextField
          label="Category Name"
          value={form.name}
          onChange={(event) =>
            setForm({
              ...form,
              name: event.target.value,
            })
          }
          fullWidth
        />

        <TextField
          label="Description"
          value={form.description}
          onChange={(event) =>
            setForm({
              ...form,
              description: event.target.value,
            })
          }
          fullWidth
        />

        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Status</InputLabel>

          <Select
            label="Status"
            value={form.status}
            onChange={(event) =>
              setForm({
                ...form,
                status: event.target.value,
              })
            }
          >
            <MenuItem value="ACTIVE">Active</MenuItem>
            <MenuItem value="INACTIVE">Inactive</MenuItem>
          </Select>
        </FormControl>

        <Button
          variant="contained"
          disabled={!form.name || save.isPending}
          onClick={() => save.mutate()}
        >
          {editing ? "Update" : "Create"}
        </Button>

        {editing && (
          <Button
            onClick={() => {
              setEditing(null);
              setForm(blankCategory);
            }}
          >
            Cancel
          </Button>
        )}
      </Stack>

      {message && (
        <Alert severity={message.includes("success") ? "success" : "error"}>
          {message}
        </Alert>
      )}

      {error && <Alert severity="error">{error}</Alert>}

      <Stack spacing={1}>
        {loading ? (
          <Typography>Loading categories...</Typography>
        ) : (
          categories.map((category) => (
            <Card key={category.id} variant="outlined">
              <CardContent
                sx={{
                  display: "flex",
                  gap: 2,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <Box sx={{ flexGrow: 1 }}>
                  <Typography fontWeight={700}>{category.name}</Typography>

                  <Typography variant="body2" color="text.secondary">
                    {category.description || "No description"}
                    {" · "}
                    {category.product_count}
                    {" products"}
                  </Typography>
                </Box>

                <Chip
                  label={category.status}
                  color={category.status === "ACTIVE" ? "success" : "default"}
                  size="small"
                />

                <Button
                  size="small"
                  onClick={() => {
                    setEditing(category);

                    setForm({
                      name: category.name,
                      description: category.description ?? "",
                      status: category.status,
                    });
                  }}
                >
                  Edit
                </Button>

                <Button
                  size="small"
                  color="error"
                  onClick={() => {
                    if (window.confirm(`Delete ${category.name}?`)) {
                      remove.mutate(category.id);
                    }
                  }}
                >
                  Delete
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </Stack>
    </Stack>
  );
}
