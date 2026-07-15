export type Role = 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'ANALYST' | 'VIEWER'

export interface Profile {
  id: number
  name: string
  email: string
  role: Role
  company: { id: number; name: string }
  status: string
  last_login: string | null
}

export interface AuthTokens {
  access_token: string
  refresh_token: string
}
