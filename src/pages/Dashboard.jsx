import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { CalendarDays, ClipboardList, Copy, Leaf, MoreVertical, PenTool, Pencil, Plus, Sprout, Trash2 } from 'lucide-react'
import { CardSkeleton, EmptyState, ErrorState, GlassCard, Modal, Page, PageHeader, ProgressRing, Skeleton, StatusPill } from '../components/ui'
import GardenSVG from '../components/GardenSVG'
import NewGardenModal from '../components/NewGardenModal'
import { useApp, getActiveGardenId, setActiveGardenId } from '../context/AppContext'
import { useAsync } from '../hooks/useAsync'
import { api } from '../lib/api'
import { fmtArea, fmtLen, gardenProgress, money } from '../lib/garden'
import { MONTHLY_TIPS, STATUSES, tipOfTheDay } from '../data/content'

export function timeAgo(iso) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`
  const d = Math.floor(s / 86400)
  return d === 1 ? 'yesterday' : `${d} days ago`
}

export function GardenPreview({ garden, className = '' }) {
  const { plantsById, materialsById } = useApp()
  if (garden.thumbnail) return <img src={garden.thumbnail} alt={`Preview of ${garden.name}`} className={`h-full w-full object-contain ${className}`} />
  return <GardenSVG garden={garden} items={garden.items} plantsById={plantsById} materialsById={materialsById} className={`h-full w-full ${className}`} />
}

function CardMenu({ garden, onRename, onDuplicate, onDelete, onStatus }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false)
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])
  const item = 'flex w-full min-h-[40px] items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium hover:bg-line/10'
  return (
    <div className="relative" ref={ref}>
      <button className="icon-btn !h-10 !w-10" onClick={() => setOpen((o) => !o)} aria-label={`Options for ${garden.name}`} aria-expanded={open}>
        <MoreVertical size={18} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-strong absolute right-0 top-11 z-20 w-56 rounded-2xl p-1.5 shadow-soft" role="menu">
            <button className={item} onClick={() => { setOpen(false); onRename() }}><Pencil size={16} /> Rename</button>
            <button className={item} onClick={() => { setOpen(false); onDuplicate() }}><Copy size={16} /> Duplicate</button>
            <div className="my-1 border-t border-line/10" />
            <p className="px-3 pb-1 pt-1.5 text-[11px] font-bold uppercase tracking-wider text-muted">Status</p>
            {STATUSES.map((s) => (
              <button key={s} className={`${item} ${garden.status === s ? 'text-leaf' : ''}`} onClick={() => { setOpen(false); onStatus(s) }}>
                <span className={`h-2 w-2 rounded-full ${garden.status === s ? 'bg-leaf' : 'bg-line/30'}`} /> {s}
              </button>
            ))}
            <div className="my-1 border-t border-line/10" />
            <button className={`${item} text-red-400`} onClick={() => { setOpen(false); onDelete() }}><Trash2 size={16} /> Delete</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function SeasonalTip() {
  const t = MONTHLY_TIPS[new Date().getMonth()]
  return (
    <GlassCard className="relative h-full overflow-hidden p-5">
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-sun/20 blur-2xl" />
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-sun"><CalendarDays size={14} /> Plant this month · {t.month}</p>
      <p className="mt-2 text-sm text-ink/85">{t.tip}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {t.plants.map((p) => <span key={p} className="chip !min-h-0 !py-1">{p}</span>)}
      </div>
      <div className="mt-4 border-t border-line/10 pt-3">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-leaf"><Leaf size={13} /> Tip of the day</p>
        <p className="mt-1 text-sm text-muted">{tipOfTheDay()}</p>
      </div>
    </GlassCard>
  )
}

export default function Dashboard() {
  const { toast, unit, plantsById, materialsById, catalog } = useApp()
  const navigate = useNavigate()
  const { data: gardens, loading, error, reload, setData } = useAsync(() => api.listGardens(), [])
  const [newOpen, setNewOpen] = useState(false)
  const [renaming, setRenaming] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [focusId, setFocusId] = useState(getActiveGardenId())

  const focus = gardens?.find((g) => g.id === focusId) || gardens?.[0]
  const progress = useMemo(() => (focus && !catalog.loading ? gardenProgress(focus, focus.items, plantsById, materialsById) : null), [focus, plantsById, materialsById, catalog.loading])

  const patchLocal = (g) => setData((list) => list.map((x) => (x.id === g.id ? { ...x, ...g, items: x.items } : x)))

  const rename = async (e) => {
    e.preventDefault()
    const name = e.target.elements.name.value.trim()
    if (!name) return
    try {
      patchLocal(await api.updateGarden(renaming.id, { name }))
      toast('success', 'Renamed', `Your garden is now “${name}”.`)
      setRenaming(null)
    } catch (err) {
      toast('error', 'Couldn’t rename', err.message)
    }
  }
  const duplicate = async (g) => {
    try {
      const copy = await api.duplicateGarden(g.id)
      setData((list) => [copy, ...list])
      toast('success', 'Duplicated', `Created “${copy.name}”.`)
    } catch (err) {
      toast('error', 'Couldn’t duplicate', err.message)
    }
  }
  const remove = async () => {
    const g = deleting
    setDeleting(null)
    setData((list) => list.filter((x) => x.id !== g.id))
    try {
      await api.deleteGarden(g.id)
      toast('success', 'Garden deleted', `“${g.name}” has been removed.`)
    } catch (err) {
      toast('error', 'Couldn’t delete', err.message)
      reload()
    }
  }
  const setStatus = async (g, status) => {
    try {
      patchLocal(await api.updateGarden(g.id, { status }))
      toast('success', 'Status updated', `${g.name} is now “${status}”.`)
    } catch (err) {
      toast('error', 'Couldn’t update status', err.message)
    }
  }
  const open = (g) => {
    setActiveGardenId(g.id)
    navigate(`/designer/${g.id}`)
  }

  return (
    <Page>
      <PageHeader
        eyebrow="Dashboard"
        title="My Gardens"
        subtitle="Every great garden starts as an idea. Pick up where you left off or start something new."
        actions={<button className="btn-primary" onClick={() => setNewOpen(true)}><Plus size={18} /> New Garden</button>}
      />

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <>
          <div className="mb-8 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
            <GlassCard className="p-5 sm:p-6">
              {loading || !progress ? (
                <div className="space-y-4">
                  <Skeleton className="h-6 w-48" />
                  <div className="flex justify-around"><Skeleton className="h-24 w-24 rounded-full" /><Skeleton className="h-24 w-24 rounded-full" /><Skeleton className="h-24 w-24 rounded-full" /></div>
                </div>
              ) : focus ? (
                <>
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <label htmlFor="focus-garden" className="text-xs font-bold uppercase tracking-wider text-muted">Active project</label>
                      <select id="focus-garden" value={focus.id} onChange={(e) => { setFocusId(e.target.value); setActiveGardenId(e.target.value) }} className="block max-w-full cursor-pointer truncate bg-transparent font-display text-2xl font-bold outline-none">
                        {gardens.map((g) => <option key={g.id} value={g.id} className="bg-surface text-base text-ink">{g.name}</option>)}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <Link to={`/designer/${focus.id}`} className="btn-ghost !min-h-[40px] !py-2"><PenTool size={16} /> Design</Link>
                      <Link to={`/plan/${focus.id}`} className="btn-ghost !min-h-[40px] !py-2"><ClipboardList size={16} /> Plan</Link>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <ProgressRing key={`d${focus.id}`} value={progress.design} label="Design" sublabel="completed" size={92} />
                    <ProgressRing key={`p${focus.id}`} value={progress.plants} label="Plants" sublabel={`${progress.plantCount} chosen`} size={92} />
                    <ProgressRing key={`b${focus.id}`} value={progress.budget} label="Budget" sublabel={`${money(progress.cost)} of ${money(focus.budget)}`} size={92} />
                  </div>
                </>
              ) : (
                <div className="flex h-full flex-col items-center justify-center py-6 text-center">
                  <Sprout className="text-leaf" size={32} />
                  <p className="mt-2 font-semibold">Your progress rings will grow here</p>
                  <p className="text-sm text-muted">Create a garden to start tracking design, plants and budget.</p>
                </div>
              )}
            </GlassCard>
            <SeasonalTip />
          </div>

          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">All gardens {gardens && <span className="text-muted">({gardens.length})</span>}</h2>
          </div>

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"><CardSkeleton count={3} /></div>
          ) : gardens.length === 0 ? (
            <EmptyState icon={Sprout} title="No gardens yet. Let’s plant your first idea!" message="Tell us the size, sun and soil and we’ll set up a canvas drawn to scale." action={<button className="btn-primary" onClick={() => setNewOpen(true)}><Plus size={18} /> New Garden</button>} />
          ) : (
            <motion.div layout className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <AnimatePresence>
                {gardens.map((g, i) => (
                  <motion.div key={g.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0, transition: { delay: i * 0.05 } }} exit={{ opacity: 0, scale: 0.9 }}>
                    <GlassCard hover className={`group overflow-hidden p-3 ${focus?.id === g.id ? 'ring-2 ring-leaf/50' : ''}`}>
                      <button className="block w-full overflow-hidden rounded-2xl bg-forest-800 text-left" onClick={() => open(g)} aria-label={`Open ${g.name} in the designer`}>
                        <div className="aspect-[4/3] p-2 transition-transform duration-500 group-hover:scale-[1.03]">
                          <GardenPreview garden={g} />
                        </div>
                      </button>
                      <div className="flex items-start justify-between gap-2 px-1.5 pb-1 pt-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-lg font-bold">{g.name}</h3>
                          <p className="text-sm text-muted">
                            {fmtLen(g.width, unit)} × {fmtLen(g.length, unit)} · {fmtArea(g.width * g.length, unit)}
                          </p>
                        </div>
                        <CardMenu garden={g} onRename={() => setRenaming(g)} onDuplicate={() => duplicate(g)} onDelete={() => setDeleting(g)} onStatus={(s) => setStatus(g, s)} />
                      </div>
                      <div className="flex items-center justify-between px-1.5 pb-1.5 pt-1">
                        <StatusPill status={g.status} />
                        <span className="text-xs text-muted">{g.items.length} items · {timeAgo(g.updated_at)}</span>
                      </div>
                    </GlassCard>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </>
      )}

      <NewGardenModal open={newOpen} onClose={() => setNewOpen(false)} />

      <Modal open={!!renaming} onClose={() => setRenaming(null)} title="Rename garden">
        {renaming && (
          <form onSubmit={rename} className="space-y-4">
            <input name="name" className="input" defaultValue={renaming.name} autoFocus maxLength={60} aria-label="Garden name" />
            <button className="btn-primary w-full">Save name</button>
          </form>
        )}
      </Modal>

      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Delete garden?">
        {deleting && (
          <div className="space-y-4">
            <p className="text-muted">“{deleting.name}” and everything planted in it will be removed. This can’t be undone.</p>
            <div className="flex gap-2">
              <button className="btn-ghost flex-1" onClick={() => setDeleting(null)}>Keep it</button>
              <button className="btn-danger flex-1" onClick={remove}><Trash2 size={16} /> Delete</button>
            </div>
          </div>
        )}
      </Modal>
    </Page>
  )
}
