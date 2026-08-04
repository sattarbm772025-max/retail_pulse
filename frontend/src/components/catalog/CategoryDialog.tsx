import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from "@mui/material";

import type { CategoryPayload } from "../../api/catalogApi";

interface Props {
  open: boolean;
  editing: boolean;
  form: CategoryPayload;
  loading?: boolean;
  onClose: () => void;
  onChange: (value: CategoryPayload) => void;
  onSave: () => void;
}

export default function CategoryDialog({
  open,
  editing,
  form,
  loading = false,
  onClose,
  onChange,
  onSave,
}: Props) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{editing ? "Edit Category" : "Add Category"}</DialogTitle>

      <DialogContent>
        <Stack spacing={2} mt={1}>
          <TextField
            label="Category Name"
            value={form.name}
            fullWidth
            onChange={(e) =>
              onChange({
                ...form,
                name: e.target.value,
              })
            }
          />

          <TextField
            label="Description"
            value={form.description}
            fullWidth
            multiline
            rows={3}
            onChange={(e) =>
              onChange({
                ...form,
                description: e.target.value,
              })
            }
          />

          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>

            <Select
              label="Status"
              value={form.status}
              onChange={(e) =>
                onChange({
                  ...form,
                  status: e.target.value as "ACTIVE" | "INACTIVE",
                })
              }
            >
              <MenuItem value="ACTIVE">Active</MenuItem>
              <MenuItem value="INACTIVE">Inactive</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>

        <Button
          variant="contained"
          onClick={onSave}
          disabled={!form.name || loading}
        >
          {editing ? "Update" : "Create"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
