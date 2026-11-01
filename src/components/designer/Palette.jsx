import { useMemo, useState } from 'react'
import { Armchair, Droplets, Fence, Flower2, Grid3x3, Lamp, Search, Shovel, Sprout, TreePine } from 'lucide-react'
import { Segmented } from '../ui'
import { MATERIAL_CATEGORIES, PLANT_TYPES } from '../../data/content'
import { fmtLen, money } from '../../lib/garden'
import { materialStyle } from '../../lib/styles'

const CAT_ICON = { Lawn: Sprout, Beds: Shovel, Paths: Grid3x3, Patio: Grid3x3, Fencing: Fence, 'Water Features': Droplets, Seating: Armchair, Lighting: Lamp }

function Draggable({ payload, onAdd, children, label }) {
  return (
    <button
      type="button"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('application/x-gardencraft', JSON.stringify(payload))
        e.dataTransfer.effectAllowed = 'copy'
      }}
      onClick={() => onAdd(payload)}
      title={`Drag onto the canvas, or tap to add ${label}`}
      className="group flex w-full min-h-[48px] cursor-grab items-center gap-3 rounded-xl border border-transparent px-2.5 py-2 text-left transition-all hover:border-leaf/30 hover:bg-leaf/10 active:cursor-grabbing"
    >
      {children}
    </button>
  )
}

export default function Palette({ plants, materials, onAdd, unit }) {
  const [tab, setTab] = useState('plants')
  const [q, setQ] = useState('')
  const term = q.trim().toLowerCase()

  const plantGroups = useMemo(
    () => PLANT_TYPES.map((t) => ({ t, list: plants.filter((p) => p.type === t && (!term || p.name.toLowerCase().includes(term))) })).filter((g) => g.list.length),
    [plants, term],
  )
  const matGroups = useMemo(
    () => MATERIAL_CATEGORIES.map((c) => ({ c, list: materials.filter((m) => m.category === c && (!term || m.name.toLowerCase().includes(term))) })).filter((g) => g.list.length),
    [materials, term],
  )

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="space-y-2.5 p-3">
        <Segmented name="palette" value={tab} onChange={setTab} options={[{ value: 'plants', label: 'Plants' }, { value: 'materials', label: 'Structures' }]} />
        <label className="relative block">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input className="input !min-h-[40px] py-2 pl-9 text-sm" placeholder={tab === 'plants' ? 'Search plants…' : 'Search paths, patio…'} value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search palette" />
        </label>
        <p className="text-[11px] text-muted">Drag onto the canvas or tap to add.</p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {tab === 'plants' &&
          plantGroups.map(({ t, list }) => (
            <div key={t} className="mb-2">
              <p className="sticky top-0 z-10 bg-surface/80 px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted backdrop-blur">{t}</p>
              {list.map((p) => (
                <Draggable key={p.id} payload={{ kind: 'plant', id: p.id }} onAdd={onAdd} label={p.name}>
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full shadow-inner" style={{ background: `radial-gradient(circle at 35% 35%, #ffffff66, ${p.color} 45%)` }}>
                    {t === 'Trees' ? <TreePine size={14} className="text-black/40" /> : <Flower2 size={14} className="text-black/40" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{p.name}</span>
                    <span className="block text-[11px] text-muted">⌀ {fmtLen(p.mature_spread_cm / 100, unit)} · {p.sun_needs} · {money(p.price_estimate)}</span>
                  </span>
                </Draggable>
              ))}
            </div>
          ))}
        {tab === 'materials' &&
          matGroups.map(({ c, list }) => {
            const Icon = CAT_ICON[c]
            return (
              <div key={c} className="mb-2">
                <p className="sticky top-0 z-10 flex items-center gap-1.5 bg-surface/80 px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted backdrop-blur">
                  <Icon size={12} /> {c}
                </p>
                {list.map((m) => {
                  const st = materialStyle(m)
                  return (
                    <Draggable key={m.id} payload={{ kind: 'material', id: m.id }} onAdd={onAdd} label={m.name}>
                      <span className={`h-8 w-8 shrink-0 border border-black/20 ${st.round ? 'rounded-full' : 'rounded-lg'}`} style={{ background: st.fill }} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{m.name}</span>
                        <span className="block text-[11px] text-muted">{money(m.price_per_unit)} / {m.unit}</span>
                      </span>
                    </Draggable>
                  )
                })}
              </div>
            )
          })}
        {((tab === 'plants' && !plantGroups.length) || (tab === 'materials' && !matGroups.length)) && <p className="px-3 py-8 text-center text-sm text-muted">Nothing matches “{q}”. Try another name.</p>}
      </div>
    </div>
  )
}
