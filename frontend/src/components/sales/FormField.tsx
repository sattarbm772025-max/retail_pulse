import { Grid, TextField } from "@mui/material";

interface FormFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  disabled?: boolean;
}

export function FormField({
  label,
  value,
  onChange,
  type = "text",
  disabled = false,
}: FormFieldProps): React.JSX.Element {
  return (
    <Grid
      size={{
        xs: 12,
        sm: 6,
      }}
    >
      <TextField
        label={label}
        value={value}
        type={type}
        disabled={disabled}
        fullWidth
        onChange={(event) => onChange(event.target.value)}
        InputLabelProps={
          type === "datetime-local"
            ? {
                shrink: true,
              }
            : undefined
        }
      />
    </Grid>
  );
}
