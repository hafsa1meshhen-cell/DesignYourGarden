import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'

const AppContext = createContext(null)

const readPref = (k, fallback) => {
  try {
    return localStorage.getItem(k) || fallback
  } catch {
    return fallback
  }
}
const writePref = (k, v) => {
  try {
    localStorage.setItem(k, v)
  } catch {
    /* preferences are optional */
  }
}

export function AppProvider({ children }) {
  const [theme, setTheme] = useState(() => readPref('gc-theme', 'dark'))
  const [unit, setUnitState] = useState(() => readPref('gc-unit', 'metric'))
  const [toasts, setToasts] = useState([])
  const [catalog, setCatalog] = useState({ plants: [], materials: [], loading: true, error: null })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#071d12' : '#f1f6ee')
    writePref('gc-theme', theme)
  }, [theme])

  const setUnit = useCallback((u) => {
    setUnitState(u)
    writePref('gc-unit', u)
  }, [])

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), [])
  const toast = useCallback(
    (type, title, message, opts = {}) => {
      const id = Math.random().toString(36).slice(2)
      setToasts((t) => [...t.slice(-3), { id, type, title, message, action: opts.action }])
      setTimeout(() => dismiss(id), opts.duration ?? (type === 'error' ? 6000 : 3800))
    },
    [dismiss],
  )

  const loadCatalog = useCallback(async () => {
    setCatalog((c) => ({ ...c, loading: true, error: null }))
    try {
      const data = await api.getCatalog()
      setCatalog({ ...data, loading: false, error: null })
    } catch (e) {
      setCatalog({ plants: [], materials: [], loading: false, error: e.message })
    }
  }, [])

  useEffect(() => {
    loadCatalog()
  }, [loadCatalog])

  const value = useMemo(() => {
    const plantsById = Object.fromEntries(catalog.plants.map((p) => [p.id, p]))
    const materialsById = Object.fromEntries(catalog.materials.map((m) => [m.id, m]))
    return {
      theme,
      toggleTheme: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')),
      unit,
      setUnit,
      toasts,
      toast,
      dismiss,
      catalog,
      plantsById,
      materialsById,
      reloadCatalog: loadCatalog,
    }
  }, [theme, unit, setUnit, toasts, toast, dismiss, catalog, loadCatalog])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export const useApp = () => useContext(AppContext)

const ACTIVE_KEY = 'gc-active-garden'
export const getActiveGardenId = () => readPref(ACTIVE_KEY, '')
export const setActiveGardenId = (id) => writePref(ACTIVE_KEY, id)
