import { Box, Button, Card, CardContent, Chip, Grid, Stack, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { DashboardLayout } from '../layouts/DashboardLayout'
import { catalogApi } from '../api/catalogApi'

export function DashboardPage() {
  const { profile } = useAuth(); const navigate = useNavigate(); if (!profile) return null
  const summary = useQuery({ queryKey: ['catalog-summary'], queryFn: () => catalogApi.summary().then(response => response.data) })
  const items = [['Total products', summary.data?.total_products ?? 0], ['Active products', summary.data?.active_products ?? 0], ['Inactive products', summary.data?.inactive_products ?? 0], ['Total categories', summary.data?.total_categories ?? 0]]
  return <DashboardLayout><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2} mb={4}><Box><Typography variant="h4" fontWeight={800}>Good to see you, {profile.name.split(' ')[0]}</Typography><Typography color="text.secondary" mt={1}>Your organization analytics workspace is ready.</Typography></Box><Chip label={profile.company.name} variant="outlined" sx={{ alignSelf: 'start', bgcolor: 'background.paper' }}/></Stack><Grid container spacing={2}>{items.map(([label, value]) => <Grid key={label} size={{ xs: 12, sm: 6, md: 3 }}><Card variant="outlined"><CardContent><Typography color="text.secondary" variant="body2">{label}</Typography><Typography fontWeight={700} mt={1}>{value}</Typography></CardContent></Card></Grid>)}</Grid><Card variant="outlined" sx={{ mt: 3 }}><CardContent><Typography variant="h6" fontWeight={700}>Tenant-secure workspace</Typography><Typography color="text.secondary" mt={1}>All products, inventory, users, and future analytics requests are scoped to {profile.company.name}.</Typography><Button sx={{ mt: 2 }} variant="contained" onClick={() => navigate('/catalog')}>Manage catalog</Button></CardContent></Card></DashboardLayout>
}
