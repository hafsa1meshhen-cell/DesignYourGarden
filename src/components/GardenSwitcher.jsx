import { useNavigate } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'

export default function GardenSwitcher({ gardens, id, base }) {
  const navigate = useNavigate()
  if (!gardens?.length) return null
  return (
    <label className="relative inline-flex min-w-0 max-w-full items-center">
      <span className="sr-only">Choose garden</span>
      <select
        value={id || ''}
        onChange={(e) => navigate(`${base}/${e.target.value}`)}
        className="input max-w-full appearance-none truncate py-2 pr-9 font-semibold sm:w-64"
      >
        {gardens.map((g) => (
          <option key={g.id} value={g.id} className="bg-surface text-ink">
            {g.name}
          </option>
        ))}
      </select>
      <ChevronDown size={16} className="pointer-events-none absolute right-3 text-muted" />
    </label>
  )
}
