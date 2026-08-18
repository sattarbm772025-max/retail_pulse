import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";

import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminRoute } from "./components/AdminRoute";

import { DashboardPage } from "./pages/DashboardPage";

import {
  ForgotPasswordPage,
  LoginPage,
  RegisterPage,
  ResetPasswordPage,
} from "./pages/AuthPage";

import { CatalogPage } from "./pages/CatalogPage";
import { SalesPage } from "./pages/SalesPage";
import { InventoryPage } from "./pages/InventoryPage";
import { ProfilePage } from "./pages/ProfilePage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { CustomersPage } from "./pages/CustomersPage";
import { SalesDetailPage } from "./pages/SalesDetailPage";
import { ProductAnalyticsPage } from "./pages/ProductAnalyticsPage";
import { CategoryAnalyticsPage } from "./pages/CategoryAnalyticsPage";
import { SalesAnalyticsPage } from "./pages/SalesAnalyticsPage";
import { ForeCastPage } from "./pages/ForeCastPage";

const theme = createTheme({
  palette: {
    primary: {
      main: "#165dff",
    },

    background: {
      default: "#f5f7fb",
    },
  },

  typography: {
    fontFamily: "Inter, Roboto, Arial, sans-serif",
  },

  shape: {
    borderRadius: 10,
  },
});

const client = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={client}>
      <ThemeProvider theme={theme}>
        <CssBaseline />

        <BrowserRouter>
          <AuthProvider>
            <Routes>
              {/* Public Routes */}

              <Route path="/login" element={<LoginPage />} />

              <Route path="/register" element={<RegisterPage />} />

              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />

              {/* Protected Routes */}

              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<DashboardPage />} />

                <Route path="/sales" element={<SalesPage />} />

                <Route path="/inventory" element={<InventoryPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/customers" element={<CustomersPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/forecast" element={<ForeCastPage />} />

                <Route
                  path="/analytics/sales"
                  element={<SalesAnalyticsPage />}
                />

                <Route
                  path="/analytics/products"
                  element={<ProductAnalyticsPage />}
                />

                <Route
                  path="/analytics/categories"
                  element={<CategoryAnalyticsPage />}
                />

                {/* Admin Only Routes */}

                <Route element={<AdminRoute />}>
                  <Route path="/catalog" element={<CatalogPage />} />
                </Route>
              </Route>

              {/* Default Route */}

              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
