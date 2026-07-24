import { Alert, Box } from "@mui/material";
import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

export function AdminRoute() {
  const { profile } = useAuth();

  if (!profile) {
    return <Navigate to="/login" replace />;
  }

  const allowedRoles = [
    "SUPER_ADMIN",
    "COMPANY_ADMIN",
  ];

  const hasAdminAccess = allowedRoles.includes(
    profile.role
  );

  if (!hasAdminAccess) {
    return (
      <Box p={4}>
        <Alert severity="error">
          Only company administrators can manage this area.
        </Alert>
      </Box>
    );
  }

  return <Outlet />;
}