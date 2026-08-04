import {
  Button,
  Card,
  CardContent,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";

import { type Product } from "../../api/catalogApi";
import { type SaleItem } from "../../api/salesApi";
import { FormField } from "./FormField";

interface SaleLineProps {
  index: number;
  line: SaleItem;
  products: Product[];
  update: (index: number, value: Partial<SaleItem>) => void;
  remove: () => void;
  canRemove: boolean;
}

export function SaleLine({
  index,
  line,
  products,
  update,
  remove,
  canRemove,
}: SaleLineProps): React.JSX.Element {
  const product = products.find((item) => item.id === line.product_id);

  return (
    <Grid size={12}>
      <Card variant="outlined">
        <CardContent>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography fontWeight={700}>Product {index + 1}</Typography>

            {canRemove && (
              <Button color="error" size="small" onClick={remove}>
                Remove
              </Button>
            )}
          </Stack>

          <Grid container spacing={1} mt={0.5}>
            <Grid
              size={{
                xs: 12,
                sm: 6,
              }}
            >
              <FormControl fullWidth>
                <InputLabel>Product</InputLabel>

                <Select
                  label="Product"
                  value={line.product_id || ""}
                  onChange={(event) => {
                    const selected = products.find(
                      (item) => item.id === Number(event.target.value),
                    );

                    update(index, {
                      product_id: Number(event.target.value),
                      unit_price: selected?.unit_price ?? 0,
                    });
                  }}
                >
                  {products.map((item) => (
                    <MenuItem key={item.id} value={item.id}>
                      {item.name}
                      {" · Stock "}
                      {item.stock_quantity}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <FormField
              label="Category"
              value={product?.category_name ?? "Select product"}
              disabled
              onChange={() => {}}
            />

            <FormField
              label="Quantity"
              type="number"
              value={String(line.quantity)}
              onChange={(value) =>
                update(index, {
                  quantity: Number(value),
                })
              }
            />

            <FormField
              label="Unit Price"
              type="number"
              value={String(line.unit_price)}
              onChange={(value) =>
                update(index, {
                  unit_price: Number(value),
                })
              }
            />

            <FormField
              label="Discount"
              type="number"
              value={String(line.discount)}
              onChange={(value) =>
                update(index, {
                  discount: Number(value),
                })
              }
            />

            <FormField
              label="Tax"
              type="number"
              value={String(line.tax)}
              onChange={(value) =>
                update(index, {
                  tax: Number(value),
                })
              }
            />
          </Grid>
        </CardContent>
      </Card>
    </Grid>
  );
}
