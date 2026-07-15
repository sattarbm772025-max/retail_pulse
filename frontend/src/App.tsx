import { CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage, RegisterPage } from './pages/AuthPage'

const theme = createTheme({ palette: { primary: { main: '#165dff' }, background: { default: '#f5f7fb' } }, typography: { fontFamily: 'Inter, Roboto, Arial, sans-serif' }, shape: { borderRadius: 10 } })
const client = new QueryClient()
export default function App() { return <QueryClientProvider client={client}><ThemeProvider theme={theme}><CssBaseline /><BrowserRouter><AuthProvider><Routes><Route path="/login" element={<LoginPage />} /><Route path="/register" element={<RegisterPage />} /><Route element={<ProtectedRoute />}><Route path="/dashboard" element={<DashboardPage />} /></Route><Route path="*" element={<Navigate to="/dashboard" replace />} /></Routes></AuthProvider></BrowserRouter></ThemeProvider></QueryClientProvider> }
