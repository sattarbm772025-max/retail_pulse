import { PieChart, Pie, Tooltip, Legend, ResponsiveContainer } from "recharts";

type Props = {
  data: {
    name: string;
    value: number;
  }[];
};

export function InventoryStatusPie({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          outerRadius={110}
          label
        />

        <Tooltip />

        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
