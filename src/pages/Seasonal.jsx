import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Flower2, Leaf, Snowflake, Sprout, Sun, TrendingUp } from 'lucide-react'
import GardenSVG from '../components/GardenSVG'
import GardenSwitcher from '../components/GardenSwitcher'
import { EmptyState, ErrorState, GlassCard, Page, PageHeader, Skeleton } from '../components/ui'
import { useApp } from '../context/AppContext'
import { useGardenRoute } from '../hooks/useGardenRoute'
import { api } from '../lib/api'
import { SEASONS, fmtLen, growthFactor, inBloom, isEvergreen, seasonCurrent } from '../lib/garden'
import { Link } from 'react-router-dom'

const META = {
  Spring: { icon: Sprout, color: '#f9a8d4', bg: 'from-pink-400/25 via-leaf/10 to-transparent', text: 'Fresh growth and blossom. Bulbs pop up and trees leaf out.' },
  Summer: { icon: Sun, color: '#facc15', bg: 'from-sun/25 via-leaf/10 to-transparent', text: 'Peak flowers and full canopies. Long evenings in the garden.' },
  Autumn: { icon: Leaf, color: '#f97316', bg: 'from-orange-500/25 via-amber-400/10 to-transparent', text: 'Fiery leaves, grass plumes and berries before the rest.' },
  Winter: { icon: Snowflake, color: '#bae6fd', bg: 'from-sky-300/25 via-slate-300/10 to-transparent', text: 'Bare branches reveal structure. Evergreens take centre stage.' },
}

const rand = (i, k) => {
  const s = Math.sin(i * 91.7 + k * 13.3) * 10000
  return s - Math.floor(s)
}

function Particles({ season }) {
  const n = season === 'Summer' ? 10 : 22
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {Array.from({ length: n }).map((_, i) => {
        const left = rand(i, 1) * 100
        const dur = 6 + rand(i, 2) * 6
        const delay = rand(i, 3) * -dur
        const size = 5 + rand(i, 4) * 8
        if (season === 'Summer')
          return (
            <motion.span key={`${season}${i}`} className="absolute rounded-full bg-sun" style={{ left: `${left}%`, top: `${rand(i, 5) * 100}%`, width: size / 2, height: size / 2, boxShadow: '0 0 12px 4px rgba(250,204,21,.6)' }} animate={{ opacity: [0, 0.9, 0], y: [0, -30] }} transition={{ duration: dur / 2, repeat: Infinity, delay }} />
          )
        const style =
          season === 'Winter'
            ? { width: size * 0.7, height: size * 0.7, borderRadius: '50%', background: '#fff', opacity: 0.85 }
            : season === 'Autumn'
              ? { width: size, height: size * 0.7, borderRadius: '0 70% 0 70%', background: ['#f97316', '#dc2626', '#facc15'][i % 3] }
              : { width: size, height: size * 0.7, borderRadius: '70% 0 70% 0', background: ['#f9a8d4', '#fbcfe8', '#ffffff'][i % 3] }
        return (
          <motion.span
            key={`${season}${i}`}
            className="absolute -top-4"
            style={{ left: `${left}%`, ...style }}
            animate={{ x: [0, (rand(i, 6) - 0.5) * 80], rotate: [0, 360 * (rand(i, 7) > 0.5 ? 1 : -1)], top: ['-5%', '105%'] }}
            transition={{ duration: dur, repeat: Infinity, delay, ease: 'linear' }}
          />
        )
      })}
    </div>
  )
}

export default function Seasonal() {
  const { id, gardens, empty, error: listError } = useGardenRoute('/seasons')
  const { plantsById, materialsById, catalog, unit } = useApp()
  const [season, setSeason] = useState(seasonCurrent())
  const [year, setYear] = useState(3)
  const [garden, setGarden] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!id) return
    setGarden(null)
    api.getGarden(id).then(setGarden).catch((e) => setError(e.message))
  }, [id])

  const plants = useMemo(() => {
    if (!garden || catalog.loading) return []
    const seen = new Map()
    for (const it of garden.items) if (it.item_type === 'plant' && plantsById[it.plant_id]) seen.set(it.plant_id, plantsById[it.plant_id])
    return [...seen.values()]
  }, [garden, plantsById, catalog.loading])

  if (listError || error) return <ErrorState message={listError || error} />
  if (empty) return <EmptyState icon={Sprout} title="No gardens yet" message="Design a garden first, then watch it change through the seasons." action={<Link className="btn-primary" to="/gardens">Go to My Gardens</Link>} />

  const meta = META[season]
  const blooming = plants.filter((p) => inBloom(p, season))
  const evergreen = plants.filter(isEvergreen)

  return (
    <Page>
      <PageHeader eyebrow="Seasonal Preview" title="Your garden, all year round" subtitle="Switch seasons and slide through the years to see how your planting fills out." actions={<GardenSwitcher gardens={gardens} id={id} base="/seasons" />} />

      <div className="mb-4 grid grid-cols-4 gap-2">
        {SEASONS.map((s) => {
          const M = META[s]
          const active = s === season
          return (
            <button key={s} onClick={() => setSeason(s)} aria-pressed={active} className={`relative flex min-h-[64px] flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl border p-2 text-sm font-semibold transition-all ${active ? 'border-leaf/50 text-ink shadow-glow' : 'glass border-transparent text-muted hover:text-ink'}`}>
              {active && <motion.span layoutId="season-active" className="absolute inset-0 bg-gradient-to-br from-leaf/25 to-sun/15" />}
              <M.icon size={20} className="relative" style={{ color: active ? M.color : undefined }} />
              <span className="relative">{s}</span>
            </button>
          )
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <GlassCard className="relative overflow-hidden p-3 sm:p-4">
          <AnimatePresence mode="wait">
            <motion.div key={season} className={`absolute inset-0 bg-gradient-to-b ${meta.bg}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.8 }} />
          </AnimatePresence>
          <div className="relative overflow-hidden rounded-2xl">
            {!garden || catalog.loading ? (
              <Skeleton className="aspect-[4/3] w-full" />
            ) : (
              <GardenSVG garden={garden} items={garden.items} plantsById={plantsById} materialsById={materialsById} season={season} year={year} animate showGrid={false} className="block max-h-[62vh] w-full" />
            )}
            <Particles season={season} />
          </div>
          <div className="relative mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <TrendingUp size={18} className="text-leaf" /> Growth
            </div>
            <input type="range" min="1" max="5" step="1" value={year} onChange={(e) => setYear(Number(e.target.value))} className="h-2 flex-1 cursor-pointer" aria-label="Years after planting" />
            <div className="flex justify-between gap-1 sm:gap-3">
              {[1, 2, 3, 4, 5].map((y) => (
                <button key={y} onClick={() => setYear(y)} className={`min-h-[36px] rounded-lg px-2.5 text-xs font-bold transition ${y === year ? 'bg-brand text-forest-900' : 'text-muted hover:text-ink'}`}>
                  Year {y}
                </button>
              ))}
            </div>
          </div>
        </GlassCard>

        <div className="space-y-4">
          <GlassCard className="p-5">
            <AnimatePresence mode="wait">
              <motion.div key={season} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                <p className="flex items-center gap-2 font-display text-2xl font-bold">
                  <meta.icon style={{ color: meta.color }} /> {season}
                </p>
                <p className="mt-1 text-sm text-muted">{meta.text}</p>
              </motion.div>
            </AnimatePresence>
            <div className="mt-4 grid grid-cols-2 gap-2 text-center">
              <div className="rounded-xl bg-line/5 p-3"><div className="font-display text-2xl font-bold text-pink-400">{blooming.length}</div><div className="text-xs text-muted">in bloom</div></div>
              <div className="rounded-xl bg-line/5 p-3"><div className="font-display text-2xl font-bold text-leaf">{evergreen.length}</div><div className="text-xs text-muted">evergreen</div></div>
            </div>
          </GlassCard>

          <GlassCard className="p-5">
            <p className="label flex items-center gap-1.5"><Flower2 size={13} /> In bloom</p>
            {blooming.length ? (
              <ul className="space-y-1.5">
                {blooming.map((p) => (
                  <li key={p.id} className="flex items-center gap-2.5 text-sm"><span className="h-3 w-3 rounded-full" style={{ background: p.color }} />{p.name}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">Nothing flowering in {season.toLowerCase()} yet. Try adding {season === 'Winter' ? 'hellebores or camellias' : season === 'Autumn' ? 'miscanthus or echinacea' : 'tulips or cherry trees'}.</p>
            )}
          </GlassCard>

          <GlassCard className="p-5">
            <p className="label flex items-center gap-1.5"><TrendingUp size={13} /> Year {year} sizes</p>
            {plants.length ? (
              <ul className="max-h-60 space-y-2 overflow-y-auto pr-1">
                {plants.map((p) => {
                  const f = growthFactor(p, year)
                  return (
                    <li key={p.id} className="text-sm">
                      <div className="flex justify-between gap-2"><span className="truncate">{p.name}</span><span className="shrink-0 text-muted">{fmtLen((p.mature_height_cm / 100) * f, unit)} tall</span></div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line/10">
                        <motion.div className="h-full rounded-full bg-brand" initial={false} animate={{ width: `${f * 100}%` }} transition={{ duration: 0.6 }} />
                      </div>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted">No plants in this garden yet. <Link to={`/designer/${id}`} className="font-semibold text-leaf">Add some in the designer</Link>.</p>
            )}
          </GlassCard>
        </div>
      </div>
    </Page>
  )
}
