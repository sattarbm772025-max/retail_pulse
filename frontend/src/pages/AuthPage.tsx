import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Button, Link, Stack, TextField, Typography } from '@mui/material'
import { useForm } from 'react-hook-form'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { api } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import type { AuthTokens } from '../types'
import { AuthLayout } from '../layouts/AuthLayout'

const loginSchema = z.object({ email: z.email('Enter a valid email'), password: z.string().min(8, 'Password must be at least 8 characters') })
const registerSchema = z.object({
  company_name: z.string().min(2), industry: z.string().min(2), company_email: z.email(), company_address: z.string().min(3), company_phone: z.string().min(5),
  owner_name: z.string().min(2), owner_email: z.email(), password: z.string().min(8, 'Password must be at least 8 characters'), confirm_password: z.string(),
}).refine((data) => data.password === data.confirm_password, { path: ['confirm_password'], message: 'Passwords do not match' })
type LoginFields = z.infer<typeof loginSchema>
type RegisterFields = z.infer<typeof registerSchema>

function Field({ label, error, ...props }: { label: string; error?: string } & Omit<React.ComponentProps<typeof TextField>, 'error' | 'helperText'>) {
  return <TextField label={label} error={Boolean(error)} helperText={error} fullWidth {...props} />
}

export function LoginPage() {
  const navigate = useNavigate(); const { signIn } = useAuth(); const [error, setError] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFields>({ resolver: zodResolver(loginSchema) })
  const submit = async (fields: LoginFields) => { try { setError(''); const { data } = await api.post<AuthTokens>('/auth/login', fields); await signIn(data); navigate('/dashboard') } catch (e: any) { setError(e.response?.data?.detail ?? 'Unable to sign in. Please try again.') } }
  return <AuthLayout title="Welcome back" subtitle="Sign in to your RetailPulse workspace"><form onSubmit={handleSubmit(submit)}><Stack spacing={2.5}>{error && <Alert severity="error">{error}</Alert>}<Field label="Email" autoComplete="email" {...register('email')} error={errors.email?.message} /><Field label="Password" type="password" autoComplete="current-password" {...register('password')} error={errors.password?.message} /><Button type="submit" size="large" variant="contained" disabled={isSubmitting}>{isSubmitting ? 'Signing in…' : 'Sign in'}</Button><Typography textAlign="center" variant="body2">New to RetailPulse? <Link component={RouterLink} to="/register">Register your company</Link></Typography></Stack></form></AuthLayout>
}

export function RegisterPage() {
  const navigate = useNavigate(); const [error, setError] = useState(''); const [done, setDone] = useState(false)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterFields>({ resolver: zodResolver(registerSchema) })
  const submit = async (fields: RegisterFields) => { try { setError(''); await api.post('/auth/register', fields); setDone(true); setTimeout(() => navigate('/login'), 1200) } catch (e: any) { setError(e.response?.data?.detail ?? 'Unable to register the company.') } }
  return <AuthLayout title="Create your workspace" subtitle="Set up your company and first administrator"><form onSubmit={handleSubmit(submit)}><Stack spacing={2}>{error && <Alert severity="error">{error}</Alert>}{done && <Alert severity="success">Company created. Redirecting to sign in…</Alert>}<Typography variant="subtitle2">Company details</Typography><Field label="Company name" {...register('company_name')} error={errors.company_name?.message}/><Field label="Industry" {...register('industry')} error={errors.industry?.message}/><Field label="Company email" {...register('company_email')} error={errors.company_email?.message}/><Field label="Address" {...register('company_address')} error={errors.company_address?.message}/><Field label="Phone number" {...register('company_phone')} error={errors.company_phone?.message}/><Typography variant="subtitle2" sx={{ pt: 1 }}>Administrator</Typography><Field label="Your name" {...register('owner_name')} error={errors.owner_name?.message}/><Field label="Your email" {...register('owner_email')} error={errors.owner_email?.message}/><Field label="Password" type="password" {...register('password')} error={errors.password?.message}/><Field label="Confirm password" type="password" {...register('confirm_password')} error={errors.confirm_password?.message}/><Button type="submit" size="large" variant="contained" disabled={isSubmitting || done}>{isSubmitting ? 'Creating workspace…' : 'Create workspace'}</Button><Typography textAlign="center" variant="body2">Already registered? <Link component={RouterLink} to="/login">Sign in</Link></Typography></Stack></form></AuthLayout>
}
