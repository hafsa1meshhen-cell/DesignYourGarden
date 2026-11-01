import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { getActiveGardenId, setActiveGardenId } from '../context/AppContext'

// Resolves the garden for /designer, /seasons and /plan. Without an id it
// redirects to the last opened garden (or the most recent one).
export function useGardenRoute(base) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [gardens, setGardens] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let alive = true
    api
      .listGardens()
      .then((gs) => {
        if (!alive) return
        setGardens(gs)
        if (!id && gs.length) {
          const g = gs.find((x) => x.id === getActiveGardenId()) || gs[0]
          navigate(`${base}/${g.id}`, { replace: true })
        }
      })
      .catch((e) => alive && setError(e.message))
    return () => {
      alive = false
    }
  }, [id, base, navigate])

  useEffect(() => {
    if (id) setActiveGardenId(id)
  }, [id])

  return { id, gardens, empty: gardens && gardens.length === 0, error }
}
