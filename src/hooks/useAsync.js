import { useCallback, useEffect, useRef, useState } from 'react'

// Runs an async loader and tracks loading/error state. `deps` re-run it.
export function useAsync(fn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null })
  const alive = useRef(true)
  const run = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const data = await fn()
      if (alive.current) setState({ data, loading: false, error: null })
      return data
    } catch (e) {
      if (alive.current) setState({ data: null, loading: false, error: e.message || 'Something went wrong.' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  useEffect(() => {
    alive.current = true
    run()
    return () => {
      alive.current = false
    }
  }, [run])
  const setData = useCallback((updater) => setState((s) => ({ ...s, data: typeof updater === 'function' ? updater(s.data) : updater })), [])
  return { ...state, reload: run, setData }
}
