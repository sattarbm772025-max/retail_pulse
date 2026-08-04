import { Grid, TextField } from "@mui/material";

type ProductFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
};

export default function ProductField({
  label,
  value,
  onChange,
  type = "text",
}: ProductFieldProps) {
  return (
    <Grid
      size={{
        xs: 12,
        sm: 6,
      }}
    >
      <TextField
        fullWidth
        label={label}
        value={value}
        type={type}
        onChange={(event) => onChange(event.target.value)}
      />
    </Grid>
  );
}
