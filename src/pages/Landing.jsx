import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, CalendarRange, CheckCircle2, ClipboardList, Droplets, Flower2, Leaf, Ruler, Shovel, Sparkles, Sprout, Trees, Wallet } from 'lucide-react'
import Logo from '../components/Logo'
import GardenSVG from '../components/GardenSVG'
import { Counter, GlassCard } from '../components/ui'
import { DbBanner, Footer, ThemeToggle, UserMenu } from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'
import { api } from '../lib/api'
import { SEASONS, buildShoppingList, fmtLen, money } from '../lib/garden'
import { SHOWCASE_GARDEN, SHOWCASE_KEY } from '../data/showcase'

const FEATURES = [
  { icon: Ruler, title: 'Drawn to scale', text: 'A precise top-down grid. Every bed, path and tree in true metres or feet.' },
  { icon: Flower2, title: 'Right plant, right place', text: 'Smart warnings when a plant hates your sun or soil, or is planted too close.' },
  { icon: CalendarRange, title: 'See every season', text: 'Flip between spring and winter, and watch your garden grow from year 1 to 5.' },
  { icon: ClipboardList, title: 'A real build plan', text: 'Shopping list, costs, budget chart and a step-by-step checklist.' },
  { icon: Droplets, title: 'Sun, soil & water', text: 'Plants matched to your conditions so they thrive, not just survive.' },
  { icon: Shovel, title: 'From screen to soil', text: 'Export your plan as a PDF or image and take it to the garden centre.' },
]

const STEPS = [
  { icon: Sprout, title: 'Design', text: 'Enter your plot size, sun and soil. Drag in lawns, paths, beds and plants.' },
  { icon: Leaf, title: 'Choose', text: 'Browse 40+ plants filtered by type, sun, water and care level.' },
  { icon: Trees, title: 'Build', text: 'Follow your shopping list and checklist, then celebrate your real garden.' },
]

function useStats() {
  const [stats, setStats] = useState(null)
  useEffect(() => {
    api.getStats().then(setStats).catch(() => setStats({ gardens: 0, plants: 0, built: 0 }))
  }, [])
  return stats
}

const SHOWCASE_BUDGET = 4500

function HeroVisual() {
  const { plantsById, materialsById, catalog, unit, theme } = useApp()
  const light = theme === 'light'
  const [season, setSeason] = useState('Summer')
  useEffect(() => {
    const t = setInterval(() => setSeason((s) => SEASONS[(SEASONS.indexOf(s) + 1) % 4]), 4200)
    return () => clearInterval(t)
  }, [])
  const ready = !catalog.loading && !catalog.error
  const cost = useMemo(() => (ready ? buildShoppingList(SHOWCASE_GARDEN.items, plantsById, materialsById).total : 0), [ready, plantsById, materialsById])
  const g = SHOWCASE_GARDEN
  const plantCount = g.items.filter((i) => i.item_type === 'plant').length
  return (
    <div className="relative mx-auto w-full max-w-xl">
      <div className="absolute -inset-10 -z-10 rounded-full bg-leaf/20 blur-3xl" />
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}>
        <GlassCard className="overflow-hidden p-0">
          <div className="flex items-center justify-between gap-3 border-b border-line/10 px-4 py-3 sm:px-5">
            <div className="min-w-0">
              <p className="truncate font-display text-[15px] font-bold">{g.name}</p>
              <p className="truncate text-xs text-muted">
                {fmtLen(g.width, unit)} × {fmtLen(g.length, unit)} · Full sun · Loam · Cottage
              </p>
            </div>
            <div className="flex shrink-0 rounded-full border border-line/15 bg-line/5 p-0.5 text-[11px] font-semibold" aria-label="Season shown">
              {SEASONS.map((s) => (
                <button key={s} onClick={() => setSeason(s)} className={`relative rounded-full px-2 py-1 transition-colors sm:px-2.5 ${s === season ? 'text-forest-900' : 'text-muted hover:text-ink'}`} aria-pressed={s === season}>
                  {s === season && <motion.span layoutId="hero-season" className="absolute inset-0 rounded-full bg-brand" transition={{ type: 'spring', damping: 26, stiffness: 300 }} />}
                  <span className="relative">{s.slice(0, 3)}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="px-2 pt-3 sm:px-4" style={{ backgroundColor: light ? '#eef2e8' : '#0c2418', backgroundImage: `linear-gradient(${light ? 'rgba(20,83,45,.06)' : 'rgba(255,255,255,.035)'} 1px, transparent 1px), linear-gradient(90deg, ${light ? 'rgba(20,83,45,.06)' : 'rgba(255,255,255,.035)'} 1px, transparent 1px)`, backgroundSize: '22px 22px' }}>
            {ready ? (
              <GardenSVG garden={g} items={g.items} plantsById={plantsById} materialsById={materialsById} season={season} showGrid={false} annotate callouts={SHOWCASE_KEY} unit={unit} annotationColor={light ? '#2d4a37' : '#d9efe0'} className="block aspect-[11/10] w-full" />
            ) : (
              <div className="skeleton aspect-[11/10] w-full rounded-none" />
            )}
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-b border-line/10 px-4 py-3 text-xs sm:px-5">
            {SHOWCASE_KEY.map((k) => (
              <div key={k.n} className="flex min-w-0 items-center gap-2">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white text-[10px] font-bold text-forest-800 ring-1 ring-forest-700">{k.n}</span>
                <span className="truncate font-medium text-muted">{k.label}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 divide-x divide-line/10">
            <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-leaf/15 text-leaf"><CheckCircle2 size={17} /></span>
              <span className="min-w-0 leading-tight">
                <span className="block text-[10.5px] font-semibold uppercase tracking-wider text-muted">Plant check</span>
                <span className="block truncate text-sm font-semibold">{ready ? `${plantCount} plants · all happy` : '—'}</span>
              </span>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sun/15 text-amber-500"><Wallet size={17} /></span>
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block text-[10.5px] font-semibold uppercase tracking-wider text-muted">Estimated cost</span>
                <span className="block truncate text-sm font-semibold">{ready ? money(cost) : '—'} <span className="font-normal text-muted">of {money(SHOWCASE_BUDGET)}</span></span>
                <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-line/10">
                  <motion.span className="block h-full rounded-full bg-brand" initial={{ width: 0 }} animate={{ width: ready ? `${Math.min(100, (cost / SHOWCASE_BUDGET) * 100)}%` : 0 }} transition={{ duration: 1.4, delay: 0.6, ease: [0.22, 1, 0.36, 1] }} />
                </span>
              </span>
            </div>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  )
}

export default function Landing() {
  const stats = useStats()
  const navigate = useNavigate()
  const { user } = useAuth()
  const start = () => navigate(user ? '/gardens' : '/signup')

  return (
    <div className="min-h-dvh overflow-x-hidden">
      <header className="sticky top-0 z-40 px-3 pt-3">
        <nav className="glass mx-auto flex h-16 max-w-6xl items-center justify-between rounded-2xl px-3 sm:px-5" aria-label="Main">
          <Logo />
          <div className="hidden items-center gap-7 text-sm font-semibold text-muted md:flex">
            <a href="#features" className="hover:text-ink">Features</a>
            <a href="#how" className="hover:text-ink">How it works</a>
            <Link to="/plants" className="hover:text-ink">Plants</Link>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {user ? (
              <>
                <Link to="/gardens" className="btn-ghost hidden sm:inline-flex">My Gardens</Link>
                <UserMenu />
              </>
            ) : (
              <>
                <Link to="/login" className="btn-ghost">Log in</Link>
                <button onClick={start} className="btn-primary hidden sm:inline-flex">Start Designing</button>
              </>
            )}
          </div>
        </nav>
      </header>

      <div className="mx-auto max-w-6xl px-4 pt-4"><DbBanner /></div>
      <section className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-10 sm:pt-16 lg:grid-cols-[1.05fr_1fr] lg:pt-20">
        <div>
          <motion.span initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="chip mb-6 border-leaf/30 bg-leaf/10 text-leaf">
            <Sparkles size={14} /> New: see your garden in all four seasons
          </motion.span>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.05 }} className="text-[2.75rem] font-extrabold leading-[1.02] sm:text-6xl lg:text-7xl">
            Design it here.
            <br />
            <span className="text-gradient">Grow it for real.</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.15 }} className="mt-6 max-w-xl text-lg text-muted">
            <strong className="font-display text-ink">GardenCraft</strong> lets you plan your dream garden on screen, choose plants that will actually thrive, and walk away with a clear plan to build it in real life.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.25 }} className="mt-8 flex flex-wrap gap-3">
            <button onClick={start} className="btn-primary px-6 py-3.5 text-base">
              Start Designing <ArrowRight size={18} />
            </button>
            <Link to="/plants" className="btn-ghost px-6 py-3.5 text-base">
              Explore plants
            </Link>
          </motion.div>
          <p className="mt-5 flex items-center gap-2 text-sm text-muted">
            <CheckCircle2 size={16} className="text-leaf" /> Free to use · Works on your phone in the garden
          </p>
        </div>
        <HeroVisual />
      </section>

      <section className="mx-auto max-w-6xl px-4" aria-label="GardenCraft in numbers">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { key: 'gardens', label: 'Gardens designed', icon: Sprout },
            { key: 'plants', label: 'Plants placed', icon: Flower2 },
            { key: 'built', label: 'Gardens built in real life', icon: Trees },
          ].map(({ key, label, icon: Icon }, i) => (
            <motion.div key={key} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
              <GlassCard hover className="flex items-center gap-4 p-6">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-leaf/15 text-leaf">
                  <Icon size={26} />
                </div>
                <div>
                  <div className="font-display text-4xl font-extrabold text-gradient">{stats ? <Counter value={stats[key]} duration={2.2} /> : '—'}</div>
                  <div className="text-sm font-medium text-muted">{label}</div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl scroll-mt-24 px-4 pt-24">
        <div className="mb-10 max-w-2xl">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-leaf">Everything you need</p>
          <h2 className="text-4xl font-bold sm:text-5xl">A garden studio in your pocket</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text }, i) => (
            <motion.div key={title} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ delay: (i % 3) * 0.08 }}>
              <GlassCard hover className="group h-full p-6">
                <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-leaf/25 to-sun/20 text-leaf transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
                  <Icon size={22} />
                </div>
                <h3 className="text-lg font-bold">{title}</h3>
                <p className="mt-1.5 text-muted">{text}</p>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </section>

      <section id="how" className="mx-auto max-w-6xl scroll-mt-24 px-4 pt-24">
        <div className="mb-10 text-center">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-leaf">How it works</p>
          <h2 className="text-4xl font-bold sm:text-5xl">Three steps to your dream garden</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <motion.div key={title} initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.12 }}>
              <GlassCard className="relative h-full overflow-hidden p-7">
                <span className="absolute -right-2 -top-6 font-display text-[7rem] font-black text-leaf/10">{i + 1}</span>
                <Icon size={28} className="text-leaf" />
                <h3 className="mt-4 text-2xl font-bold">{title}</h3>
                <p className="mt-2 text-muted">{text}</p>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-24">
        <div className="relative overflow-hidden rounded-[2rem] border border-leaf/30 bg-gradient-to-br from-forest-600 via-forest-700 to-forest-800 p-8 text-center text-white sm:p-14">
          <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-leaf/30 blur-3xl" />
          <div className="absolute -bottom-24 -right-10 h-64 w-64 rounded-full bg-sun/20 blur-3xl" />
          <h2 className="relative text-4xl font-bold sm:text-5xl">Your garden is waiting.</h2>
          <p className="relative mx-auto mt-3 max-w-lg text-white/75">Sketch it tonight, shop for it this weekend, and enjoy it for years.</p>
          <button onClick={start} className="btn-primary relative mt-8 px-7 py-3.5 text-base">
            Start Designing <ArrowRight size={18} />
          </button>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4">
        <Footer />
      </div>
    </div>
  )
}
