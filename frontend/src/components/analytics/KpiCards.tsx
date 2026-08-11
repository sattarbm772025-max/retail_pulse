import { Card, CardActionArea, CardContent, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";

interface Props {
  title: string;
  value: string | number;
  route: string;
}

export default function KpiCards({
  title,
  value,
  route,
}: Props): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <Card elevation={2}>
      <CardActionArea onClick={() => navigate(route)}>
        <CardContent>
          <Typography variant="body2" color="text.secondary">
            {title}
          </Typography>

          <Typography variant="h4" fontWeight="bold">
            {value}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
