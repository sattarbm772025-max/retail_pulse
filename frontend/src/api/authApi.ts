import { api } from './axios'
import type { AuthTokens, Profile } from '../types'

export type RegisterCompanyPayload = {
  company_name: string; industry: string; company_email: string; company_address: string; company_phone: string
  owner_name: string; owner_email: string; password: string; confirm_password: string
}

export const authApi = {
  login: (email: string, password: string) => api.post<AuthTokens>('/auth/login', { email, password }),
  register: (payload: RegisterCompanyPayload) => api.post('/auth/register', payload),
  profile: () => api.get<Profile>('/auth/me'),
  logout: (refresh_token: string) => api.post('/auth/logout', { refresh_token }),
}
