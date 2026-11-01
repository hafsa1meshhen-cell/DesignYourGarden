import { motion } from 'framer-motion'
import { Award, Droplets, Flower2, Hammer, Leaf, Lock, Ruler, Shovel, Sprout, Sun, Trees, Trophy } from 'lucide-react'
import { Counter, ErrorState, GlassCard, Page, PageHeader, Segmented, Skeleton } from '../components/ui'
import { useApp } from '../context/AppContext'
import { useAsync } from '../hooks/useAsync'
import { api } from '../lib/api'
import { LEVELS } from '../lib/garden'

const ICONS = { sprout: Sprout, leaf: Leaf, flower: Flower2, shovel: Shovel, trees: Trees, droplets: Droplets, ruler: Ruler, sun: Sun, hammer: Hammer, trophy: Trophy }
const LEVEL_ICON = [Sprout, Leaf, Flower2, Trees]

const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || 'G'

export default function Profile() {
  const { unit, setUnit } = useApp()
  const { data, loading, error, reload } = useAsync(() => api.getProfile(), [])

  if (error) return <ErrorState message={error} onRetry={reload} />
  if (loading)
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 rounded-3xl" />
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">{Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-3xl" />)}</div>
      </div>
    )

  const { user, level, levelIndex, levelBlurb, nextLevel, levelProgress, xpToNext, xp, achievements, stats } = data
  const LevelIcon = LEVEL_ICON[levelIndex]
  const unlocked = achievements.filter((a) => a.unlocked)

  return (
    <Page>
      <PageHeader eyebrow="Profile" title="Your gardening journey" />

      <GlassCard className="relative mb-6 overflow-hidden p-6 sm:p-8">
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-leaf/20 blur-3xl" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center">
          <motion.div initial={{ scale: 0.6, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', damping: 12 }} className="relative mx-auto shrink-0 md:mx-0">
            <div className="grid h-28 w-28 place-items-center rounded-[2rem] bg-brand font-display text-4xl font-black text-forest-900 shadow-glow">{initials(user.full_name)}</div>
            <div className="absolute -bottom-2 -right-2 grid h-11 w-11 place-items-center rounded-2xl border-4 border-bg bg-forest-700 text-leaf">
              <LevelIcon size={20} />
            </div>
          </motion.div>
          <div className="min-w-0 flex-1 text-center md:text-left">
            <h2 className="text-3xl font-bold">{user.full_name}</h2>
            <p className="text-sm text-muted">{user.email}{user.climate_zone ? ` · ${user.climate_zone}` : ''}</p>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-leaf/40 bg-leaf/15 px-3 py-1.5 text-sm font-bold text-leaf">
              <Award size={16} /> {level}
            </div>
            <p className="mt-2 text-sm text-muted">{levelBlurb}</p>
            <div className="mt-4 max-w-md md:max-w-none">
              <div className="mb-1.5 flex justify-between text-xs font-semibold">
                <span>{xp} XP</span>
                <span className="text-muted">{nextLevel ? `${xpToNext} XP to ${nextLevel}` : 'Top level reached!'}</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-line/10">
                <motion.div className="h-full rounded-full bg-brand" initial={{ width: 0 }} animate={{ width: `${levelProgress * 100}%` }} transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }} />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 md:w-80">
            {[
              ['Gardens', stats.gardens],
              ['Built', stats.built],
              ['Plants', stats.plantsPlaced],
            ].map(([l, v]) => (
              <div key={l} className="rounded-2xl bg-line/5 p-3 text-center">
                <div className="font-display text-2xl font-bold text-gradient"><Counter value={v} /></div>
                <div className="text-xs text-muted">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </GlassCard>

      <h2 className="mb-3 text-xl font-bold">Gardener levels</h2>
      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {LEVELS.map((l, i) => {
          const Icon = LEVEL_ICON[i]
          const reached = i <= levelIndex
          return (
            <GlassCard key={l.name} className={`p-4 ${i === levelIndex ? 'ring-2 ring-leaf/60 shadow-glow' : ''} ${reached ? '' : 'opacity-60'}`}>
              <Icon size={22} className={reached ? 'text-leaf' : 'text-muted'} />
              <div className="mt-2 font-bold">{l.name}</div>
              <div className="text-xs text-muted">{l.min} XP</div>
            </GlassCard>
          )
        })}
      </div>

      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-xl font-bold">Achievements & badges</h2>
        <span className="text-sm text-muted">{unlocked.length} / {achievements.length} unlocked</span>
      </div>
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {achievements.map((a, i) => {
          const Icon = ICONS[a.icon] || Award
          return (
            <motion.div key={a.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <GlassCard hover className={`relative h-full p-4 text-center ${a.unlocked ? '' : 'grayscale'}`}>
                <div className={`mx-auto grid h-16 w-16 place-items-center rounded-full ${a.unlocked ? 'bg-gradient-to-br from-leaf to-sun text-forest-900 shadow-glow' : 'bg-line/10 text-muted'}`}>
                  {a.unlocked ? <Icon size={28} /> : <Lock size={22} />}
                </div>
                <div className="mt-3 text-sm font-bold">{a.name}</div>
                <div className="mt-0.5 text-[11px] text-muted">{a.desc}</div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line/10">
                  <motion.div className="h-full rounded-full bg-brand" initial={{ width: 0 }} animate={{ width: `${a.progress * 100}%` }} transition={{ duration: 1, delay: 0.2 + i * 0.04 }} />
                </div>
                <div className="mt-1 text-[11px] font-semibold text-muted">{a.value} / {a.goal}</div>
              </GlassCard>
            </motion.div>
          )
        })}
      </div>

      <GlassCard className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-bold">Measurement units</h3>
          <p className="text-sm text-muted">Used for garden sizes, plant spreads and labels.</p>
        </div>
        <Segmented name="profile-unit" value={unit} onChange={setUnit} options={[{ value: 'metric', label: 'Metric (m)' }, { value: 'imperial', label: 'Imperial (ft)' }]} />
      </GlassCard>
    </Page>
  )
}
