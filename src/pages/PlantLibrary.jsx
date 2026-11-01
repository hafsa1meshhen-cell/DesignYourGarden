import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Calendar, Droplets, Flower2, Gauge, Leaf, Plus, Ruler, Search, SearchX, Sun, Trees } from 'lucide-react'
import { EmptyState, ErrorState, GlassCard, Modal, Page, PageHeader, Segmented, Skeleton } from '../components/ui'
import { useApp, getActiveGardenId, setActiveGardenId } from '../context/AppContext'
import { useAsync } from '../hooks/useAsync'
import { api } from '../lib/api'
import { PLANT_TYPES, SUN_OPTIONS } from '../data/content'
import { fmtLen, money } from '../lib/garden'
import { TYPE_ACCENT } from '../lib/styles'

const WATER = ['low', 'medium', 'high']
const CARE = ['Easy', 'Medium', 'Expert']

function Dots({ n, max = 3, color }) {
  return (
    <span className="inline-flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} className="h-1.5 w-3 rounded-full" style={{ background: i < n ? color : 'rgb(var(--line) / .15)' }} />
      ))}
    </span>
  )
}

function PlantCard({ p, onAdd, unit }) {
  const accent = TYPE_ACCENT[p.type]
  return (
    <GlassCard hover className="group flex h-full flex-col overflow-hidden">
      <div className="relative h-32 overflow-hidden" style={{ background: `radial-gradient(120% 120% at 30% 20%, ${p.color}55, transparent 60%), linear-gradient(135deg, rgb(var(--surface)), rgb(var(--bg)))` }}>
        <motion.div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" whileHover={{ scale: 1.1, rotate: 8 }}>
          <div className="grid h-20 w-20 place-items-center rounded-full shadow-lg transition-transform duration-500 group-hover:scale-110" style={{ background: `radial-gradient(circle at 35% 30%, #ffffffaa, ${p.color} 45%, ${p.color})` }}>
            {p.type === 'Trees' ? <Trees className="text-black/35" size={30} /> : <Flower2 className="text-black/35" size={30} />}
          </div>
        </motion.div>
        <span className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white" style={{ background: accent }}>
          {p.type}
        </span>
        <span className="absolute right-3 top-3 rounded-full bg-black/40 px-2.5 py-1 text-xs font-bold text-white backdrop-blur">{money(p.price_estimate)}</span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-lg font-bold leading-tight">{p.name}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-muted">{p.description}</p>
        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-[13px]">
          <div className="flex items-center gap-1.5"><Ruler size={14} className="text-leaf" /><dt className="sr-only">Mature size</dt><dd>{fmtLen(p.mature_height_cm / 100, unit)} × {fmtLen(p.mature_spread_cm / 100, unit)}</dd></div>
          <div className="flex items-center gap-1.5"><Sun size={14} className="text-sun" /><dt className="sr-only">Sun</dt><dd className="capitalize">{p.sun_needs}</dd></div>
          <div className="flex items-center gap-1.5"><Droplets size={14} className="text-sky-400" /><dt className="sr-only">Water</dt><dd className="flex items-center gap-1.5 capitalize">{p.water_needs} <Dots n={WATER.indexOf(p.water_needs) + 1} color="#38bdf8" /></dd></div>
          <div className="flex items-center gap-1.5"><Gauge size={14} className="text-violet-400" /><dt className="sr-only">Care level</dt><dd>{p.care_level} care</dd></div>
          <div className="col-span-2 flex items-center gap-1.5"><Calendar size={14} className="text-pink-400" /><dt className="sr-only">Bloom season</dt><dd>{p.bloom_season === 'None' ? 'Grown for foliage' : `Blooms ${p.bloom_season.toLowerCase()}`}</dd></div>
        </dl>
        <button className="btn-primary mt-4 w-full" onClick={() => onAdd(p)}>
          <Plus size={17} /> Add to garden
        </button>
      </div>
    </GlassCard>
  )
}

export default function PlantLibrary() {
  const { unit, toast } = useApp()
  const navigate = useNavigate()
  const [type, setType] = useState('All')
  const [sun, setSun] = useState('')
  const [water, setWater] = useState('')
  const [care, setCare] = useState('')
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [picking, setPicking] = useState(null)
  const [gardens, setGardens] = useState(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 250)
    return () => clearTimeout(t)
  }, [q])

  const { data: plants, loading, error, reload } = useAsync(() => api.getPlants({ type, sun, water, care, q: debouncedQ }), [type, sun, water, care, debouncedQ])

  const reset = () => {
    setType('All')
    setSun('')
    setWater('')
    setCare('')
    setQ('')
  }
  const filtered = type !== 'All' || sun || water || care || q

  const add = async (p) => {
    try {
      const list = gardens || (await api.listGardens())
      setGardens(list)
      if (!list.length) {
        toast('info', 'Create a garden first', 'You need a garden before you can plant in it.')
        return navigate('/gardens')
      }
      if (list.length === 1) return go(list[0].id, p)
      setPicking(p)
    } catch (e) {
      toast('error', 'Couldn’t load your gardens', e.message)
    }
  }
  const go = (gardenId, p) => {
    setActiveGardenId(gardenId)
    setPicking(null)
    navigate(`/designer/${gardenId}?add=${p.id}`)
  }
  const activeId = getActiveGardenId()
  const ordered = useMemo(() => (gardens ? [...gardens].sort((a, b) => (b.id === activeId) - (a.id === activeId)) : []), [gardens, activeId])

  const sel = 'input !min-h-[40px] w-auto py-2 pr-8 text-sm capitalize'
  return (
    <Page>
      <PageHeader eyebrow="Plant Library" title="Find your perfect plants" subtitle="40 hand-picked plants with mature size, sun, water and care needs, so every choice is the right one." />

      <GlassCard className="mb-6 space-y-3 p-3 sm:p-4">
        <div className="-mx-1 overflow-x-auto px-1 no-scrollbar">
          <Segmented name="ptype" value={type} onChange={setType} options={['All', ...PLANT_TYPES]} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative min-w-[180px] flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input className="input !min-h-[40px] py-2 pl-9 text-sm" placeholder="Search by name…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search plants" />
          </label>
          <select className={sel} value={sun} onChange={(e) => setSun(e.target.value)} aria-label="Sun needs">
            <option value="" className="bg-surface">Any sun</option>
            {SUN_OPTIONS.map((s) => <option key={s} value={s} className="bg-surface">{s}</option>)}
          </select>
          <select className={sel} value={water} onChange={(e) => setWater(e.target.value)} aria-label="Water needs">
            <option value="" className="bg-surface">Any water</option>
            {WATER.map((s) => <option key={s} value={s} className="bg-surface">{s} water</option>)}
          </select>
          <select className={sel} value={care} onChange={(e) => setCare(e.target.value)} aria-label="Care level">
            <option value="" className="bg-surface">Any care</option>
            {CARE.map((s) => <option key={s} value={s} className="bg-surface">{s}</option>)}
          </select>
          {filtered && <button className="btn-ghost !min-h-[40px] !py-2" onClick={reset}>Clear filters</button>}
        </div>
      </GlassCard>

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading && !plants ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="glass overflow-hidden rounded-3xl">
              <Skeleton className="h-32 rounded-none" />
              <div className="space-y-2 p-4"><Skeleton className="h-5 w-2/3" /><Skeleton className="h-4 w-full" /><Skeleton className="h-10 w-full" /></div>
            </div>
          ))}
        </div>
      ) : plants.length === 0 ? (
        <EmptyState icon={SearchX} title="No plants match those filters" message="Try a different sun or water setting, or clear the filters to see everything." action={<button className="btn-primary" onClick={reset}>Clear filters</button>} />
      ) : (
        <>
          <p className="mb-3 text-sm text-muted"><Leaf size={14} className="mr-1 inline text-leaf" />{plants.length} {plants.length === 1 ? 'plant' : 'plants'}</p>
          <motion.div layout className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 transition-opacity ${loading ? 'opacity-60' : ''}`}>
            <AnimatePresence mode="popLayout">
              {plants.map((p) => (
                <motion.div key={p.id} layout initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.94 }} transition={{ duration: 0.25 }}>
                  <PlantCard p={p} onAdd={add} unit={unit} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </>
      )}

      <Modal open={!!picking} onClose={() => setPicking(null)} title={`Add ${picking?.name ?? ''} to…`}>
        <div className="space-y-2">
          {ordered.map((g) => (
            <button key={g.id} onClick={() => go(g.id, picking)} className="flex w-full min-h-[52px] items-center justify-between rounded-2xl border border-line/15 bg-line/5 px-4 py-3 text-left transition hover:border-leaf/40 hover:bg-leaf/10">
              <span className="font-semibold">{g.name}</span>
              <span className="text-xs text-muted">{g.id === activeId ? 'Last opened' : `${g.items.length} items`}</span>
            </button>
          ))}
        </div>
      </Modal>
    </Page>
  )
}
