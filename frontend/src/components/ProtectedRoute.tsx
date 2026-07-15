import { CircularProgress, Box } from '@mui/material'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export function ProtectedRoute() {
  const { profile, loading } = useAuth()
  if (loading) return <Box sx={{ display: 'grid', minHeight: '100vh', placeItems: 'center' }}><CircularProgress /></Box>
  return profile ? <Outlet /> : <Navigate to="/login" replace />
}
