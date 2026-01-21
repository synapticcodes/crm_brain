import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import { isAdmin, normalizeRole, type UserRole } from '../lib/roles'

interface AuthContextValue {
  session: Session | null
  loading: boolean
  role: UserRole | null
  roleLoading: boolean
  isAdmin: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<UserRole | null>(null)
  const [roleLoading, setRoleLoading] = useState(false)

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session)
        setLoading(false)
      }
    })

    const { data } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (mounted) {
        setSession(currentSession)
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      data.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    let mounted = true

    async function fetchRole() {
      if (!session?.user?.id) {
        if (mounted) {
          setRole(null)
          setRoleLoading(false)
        }
        return
      }

      const metaRole =
        normalizeRole(
          (session.user.user_metadata as { role?: string } | undefined)?.role
        ) ??
        normalizeRole(
          (session.user.app_metadata as { role?: string } | undefined)?.role
        )

      if (metaRole) {
        if (mounted) {
          setRole(metaRole)
          setRoleLoading(false)
        }
        return
      }

      setRoleLoading(true)

      const { data, error } = await supabase
        .schema('brain')
        .from('equipe')
        .select('role')
        .eq('auth_user_id', session.user.id)
        .maybeSingle()

      if (!mounted) return

      if (error) {
        setRole(null)
        setRoleLoading(false)
        return
      }

      setRole(normalizeRole(data?.role))
      setRoleLoading(false)
    }

    fetchRole()

    return () => {
      mounted = false
    }
  }, [session?.user?.id])

  const value = useMemo(
    () => ({
      session,
      loading,
      role,
      roleLoading,
      isAdmin: isAdmin(role),
      signOut: () => supabase.auth.signOut(),
    }),
    [session, loading, role, roleLoading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}
