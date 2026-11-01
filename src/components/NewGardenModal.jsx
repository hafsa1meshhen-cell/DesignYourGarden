import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Cloud, CloudSun, Loader2, Sun } from 'lucide-react'
import { Modal, Segmented } from './ui'
import { useApp } from '../context/AppContext'
import { api } from '../lib/api'
import { SOILS, STYLES, STYLE_META, STYLE_STARTERS } from '../data/content'
import { fromDisplayLen, makeItem, round2, toDisplayLen } from '../lib/garden'

const SUN = [
  { value: 'full sun', label: 'Full sun', icon: Sun, hint: '6+ hrs' },
  { value: 'part shade', label: 'Part shade', icon: CloudSun, hint: '3–6 hrs' },
  { value: 'full shade', label: 'Full shade', icon: Cloud, hint: '< 3 hrs' },
]

function starterItems(style, w, l, plants, materials) {
  const out = []
  for (const s of STYLE_STARTERS[style] || []) {
    const x = round2(s.fx * w)
    const y = round2(s.fy * l)
    if (s.m) {
      const m = materials.find((x) => x.name === s.m)
      if (m) out.push(makeItem({ material: m, x, y, width: round2(s.w * w), height: round2(s.h * l) }))
    } else {
      const p = plants.find((x) => x.name === s.p)
      if (p) {
        const size = Math.min(p.mature_spread_cm / 100, w / 3, l / 3)
        out.push(makeItem({ plant: p, x, y, width: round2(size), height: round2(size) }))
      }
    }
  }
  return out
}

export default function NewGardenModal({ open, onClose, onCreated }) {
  const { unit, setUnit, toast, catalog } = useApp()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', width: 8, length: 6, shape: 'rectangle', sun_exposure: 'full sun', soil_type: 'loam', style: 'Cottage', budget: 2500 })
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }))
  const switchUnit = (u) => {
    if (u === unit) return
    setForm((f) => ({ ...f, width: toDisplayLen(fromDisplayLen(f.width, unit), u), length: toDisplayLen(fromDisplayLen(f.length, unit), u) }))
    setUnit(u)
  }
  const wM = fromDisplayLen(form.width, unit)
  const lM = fromDisplayLen(form.length, unit)
  const valid = wM >= 1 && lM >= 1 && wM <= 200 && lM <= 200

  const submit = async (e) => {
    e.preventDefault()
    if (!valid) return toast('error', 'Check the garden size', 'Width and length must be between 1 m and 200 m.')
    setBusy(true)
    try {
      const w = round2(wM)
      const l = round2(lM)
      const g = await api.createGarden({ ...form, name: form.name || `${form.style === 'Blank' ? 'New' : form.style} Garden`, width: w, length: l, items: starterItems(form.style, w, l, catalog.plants, catalog.materials) })
      toast('success', 'Garden created', `“${g.name}” is ready to design.`)
      onCreated?.(g)
      onClose()
      navigate(`/designer/${g.id}`)
    } catch (err) {
      toast('error', 'Couldn’t create garden', err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New Garden" wide>
      <form onSubmit={submit} className="space-y-5">
        <div>
          <label className="label" htmlFor="g-name">Garden name</label>
          <input id="g-name" className="input" placeholder="e.g. Back Garden Retreat" value={form.name} onChange={set('name')} maxLength={60} />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="label !mb-0">Size</span>
            <Segmented name="unit" size="sm" value={unit} onChange={switchUnit} options={[{ value: 'metric', label: 'Metres' }, { value: 'imperial', label: 'Feet' }]} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <input aria-label="Width" type="number" inputMode="decimal" step="0.1" min="1" className="input pr-12" value={form.width} onChange={set('width')} />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-muted">{unit === 'metric' ? 'm' : 'ft'} W</span>
            </div>
            <div className="relative">
              <input aria-label="Length" type="number" inputMode="decimal" step="0.1" min="1" className="input pr-12" value={form.length} onChange={set('length')} />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-muted">{unit === 'metric' ? 'm' : 'ft'} L</span>
            </div>
          </div>
          <p className={`mt-1.5 text-xs ${valid ? 'text-muted' : 'text-red-400'}`}>
            {valid ? `${round2(wM * lM)} m² of garden to play with` : 'Size must be between 1 m and 200 m on each side.'}
          </p>
        </div>

        <div>
          <span className="label">Shape</span>
          <Segmented name="shape" value={form.shape} onChange={set('shape')} options={[{ value: 'rectangle', label: 'Rectangle' }, { value: 'L-shape', label: 'L-shape' }, { value: 'custom', label: 'Custom' }]} />
        </div>

        <div>
          <span className="label">Sun exposure</span>
          <div className="grid grid-cols-3 gap-2">
            {SUN.map(({ value, label, icon: Icon, hint }) => (
              <button type="button" key={value} onClick={() => set('sun_exposure')(value)} aria-pressed={form.sun_exposure === value} className={`flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-2xl border p-2 text-sm font-semibold transition-all ${form.sun_exposure === value ? 'border-leaf/60 bg-leaf/15 text-leaf shadow-glow' : 'border-line/15 bg-line/5 hover:bg-line/10'}`}>
                <Icon size={20} />
                {label}
                <span className="text-[11px] font-medium text-muted">{hint}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="label">Soil type</span>
          <div className="flex flex-wrap gap-2">
            {SOILS.map((s) => (
              <button type="button" key={s} onClick={() => set('soil_type')(s)} aria-pressed={form.soil_type === s} className={`chip capitalize ${form.soil_type === s ? 'chip-active' : 'hover:bg-line/10'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="label">Style</span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {STYLES.map((s) => (
              <button type="button" key={s} onClick={() => set('style')(s)} aria-pressed={form.style === s} className={`rounded-2xl border p-3 text-left transition-all ${form.style === s ? 'border-leaf/60 bg-leaf/15 shadow-glow' : 'border-line/15 bg-line/5 hover:bg-line/10'}`}>
                <div className="text-lg leading-none text-leaf">{STYLE_META[s].emoji}</div>
                <div className="mt-1.5 text-sm font-bold">{s}</div>
                <div className="text-[11px] text-muted">{STYLE_META[s].blurb}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label" htmlFor="g-budget">Budget (£)</label>
          <input id="g-budget" type="number" inputMode="numeric" min="0" step="50" className="input" value={form.budget} onChange={set('budget')} />
        </div>

        <button type="submit" className="btn-primary w-full py-3 text-base" disabled={busy || catalog.loading}>
          {busy ? <Loader2 className="animate-spin" size={18} /> : null}
          {busy ? 'Planting the first seed…' : 'Create & start designing'}
        </button>
      </form>
    </Modal>
  )
}
