import {
  CssBaseline,
  ThemeProvider,
  createTheme,
} from "@mui/material";

import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";

import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminRoute } from "./components/AdminRoute";

import { DashboardPage } from "./pages/DashboardPage";

import {
  ForgotPasswordPage,
  LoginPage,
  RegisterPage,
} from "./pages/AuthPage";

import { CatalogPage } from "./pages/CatalogPage";
import { SalesPage } from "./pages/SalesPage";
import { InventoryPage } from "./pages/InventoryPage";



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
    fontFamily:
      "Inter, Roboto, Arial, sans-serif",
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

              <Route
                path="/login"
                element={<LoginPage />}
              />


              <Route
                path="/register"
                element={<RegisterPage />}
              />


              <Route
                path="/forgot-password"
                element={<ForgotPasswordPage />}
              />



              {/* Protected Routes */}

              <Route
                element={<ProtectedRoute />}
              >

                <Route
                  path="/dashboard"
                  element={<DashboardPage />}
                />


                <Route
                  path="/sales"
                  element={<SalesPage />}
                />


                <Route
                  path="/inventory"
                  element={<InventoryPage />}
                />



                {/* Admin Only Routes */}

                <Route
                  element={<AdminRoute />}
                >

                  <Route
                    path="/catalog"
                    element={<CatalogPage />}
                  />

                </Route>


              </Route>



              {/* Default Route */}

              <Route
                path="*"
                element={
                  <Navigate
                    to="/dashboard"
                    replace
                  />
                }
              />


            </Routes>

          </AuthProvider>

        </BrowserRouter>


      </ThemeProvider>

    </QueryClientProvider>

  );

}