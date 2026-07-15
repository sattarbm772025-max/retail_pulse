import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, tokenStore } from '../api/client'
import type { AuthTokens, Profile } from '../types'

type AuthContextValue = {
  profile: Profile | null
  loading: boolean
  signIn: (tokens: AuthTokens) => Promise<void>
  signOut: () => Promise<void>
}
const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const loadProfile = useCallback(async () => {
    if (!tokenStore.getAccess()) { setLoading(false); return }
    try { setProfile((await api.get<Profile>('/auth/me')).data) }
    catch { tokenStore.clear(); setProfile(null) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void loadProfile() }, [loadProfile])
  const signIn = async (tokens: AuthTokens) => { tokenStore.set(tokens.access_token, tokens.refresh_token); setLoading(true); await loadProfile() }
  const signOut = async () => {
    const refresh = tokenStore.getRefresh()
    try { if (refresh) await api.post('/auth/logout', { refresh_token: refresh }) } finally { tokenStore.clear(); setProfile(null) }
  }
  return <AuthContext.Provider value={{ profile, loading, signIn, signOut }}>{children}</AuthContext.Provider>
}
export function useAuth() { const context = useContext(AuthContext); if (!context) throw new Error('useAuth must be used inside AuthProvider'); return context }
