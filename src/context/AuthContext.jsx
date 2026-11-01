import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { api, setUnauthorizedHandler } from '../lib/api'
import { useApp } from './AppContext'
import { Skeleton } from '../components/ui'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const { unit, setUnit, toast } = useApp()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const syncedUnit = useRef(null)

  const adopt = useCallback(
    (u) => {
      setUser(u)
      if (u?.unit_preference) {
        syncedUnit.current = u.unit_preference
        setUnit(u.unit_preference)
      }
    },
    [setUnit],
  )

  useEffect(() => {
    api
      .me()
      .then(adopt)
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [adopt])

  // A 401 from any API call means the session ended: drop the user so guarded routes redirect.
  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null))
    return () => setUnauthorizedHandler(null)
  }, [])

  // Save the unit preference to the account whenever it's changed in the UI.
  useEffect(() => {
    if (!user || syncedUnit.current === unit) return
    syncedUnit.current = unit
    api.updateProfile({ unit_preference: unit }).catch((e) => toast('error', 'Couldn’t save your unit preference', e.message))
  }, [unit, user, toast])

  const value = useMemo(
    () => ({
      user,
      loading,
      async login(email, password) {
        adopt(await api.login(email, password))
      },
      async signup(data) {
        adopt(await api.signup(data))
      },
      async logout() {
        try {
          await api.logout()
        } finally {
          setUser(null)
        }
      },
    }),
    [user, loading, adopt],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)

export function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading)
    return (
      <div className="mx-auto max-w-5xl space-y-4 p-6 pt-24">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full rounded-3xl" />
      </div>
    )
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />
  return children
}
