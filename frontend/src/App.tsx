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
import { InventoryForecastPage } from "./pages/InventoryForecastPage";

const theme = createTheme({
  palette: {
    primary: {
      main: "#2563eb",
      dark: "#0f1e46",
    },

    background: {
      default: "#eef0f7",
      paper: "#ffffff",
    },
  },

  typography: {
    fontFamily: "Inter, Roboto, Arial, sans-serif",
  },

  shape: {
    borderRadius: 14,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          border: "1px solid #e5e7eb",
          boxShadow: "0 8px 24px rgba(15, 30, 70, 0.05)",
        },
      },
    },
    MuiButton: {
      styleOverrides: { root: { borderRadius: 10, fontWeight: 700 } },
    },
    MuiTableCell: {
      styleOverrides: {
        head: { fontWeight: 800, color: "#334155", background: "#f8fafc" },
      },
    },
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
                <Route
                  path="/inventory/forecast"
                  element={<InventoryForecastPage />}
                />
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
