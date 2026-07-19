import { Alert, Box } from '@mui/material'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function AdminRoute() {
  const { profile } = useAuth()
  if (!profile) return <Navigate to="/login" replace />
  if (!['SUPER_ADMIN', 'COMPANY_ADMIN'].includes(profile.role)) return <Box p={4}><Alert severity="error">Only company administrators can manage this area.</Alert></Box>
  return <Outlet />
}
