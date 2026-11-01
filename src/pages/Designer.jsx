import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { CalendarRange, Check, ClipboardList, CloudOff, Loader2, Maximize, Plus, Redo2, Ruler, SlidersHorizontal, Sprout, Trash2, Undo2, X, ZoomIn, ZoomOut } from 'lucide-react'
import DesignerCanvas from '../components/designer/DesignerCanvas'
import Palette from '../components/designer/Palette'
import Inspector from '../components/designer/Inspector'
import GardenSwitcher from '../components/GardenSwitcher'
import { EmptyState, ErrorState, Skeleton } from '../components/ui'
import NewGardenModal from '../components/NewGardenModal'
import { useApp } from '../context/AppContext'
import { useGardenRoute } from '../hooks/useGardenRoute'
import { api } from '../lib/api'
import { buildShoppingList, computeWarnings, makeItem, plantFootprint, round2, uid } from '../lib/garden'

const SAVE_DELAY = 700
const THUMB_DELAY = 1500

function findFreeSpot(items, size, W, L, plantsOnly = true) {
  const others = items.filter((i) => !plantsOnly || i.item_type === 'plant')
  const r = size / 2
  for (let ring = 0; ring < 12; ring++) {
    for (let k = 0; k < Math.max(1, ring * 6); k++) {
      const a = (k / Math.max(1, ring * 6)) * Math.PI * 2
      const x = round2(Math.min(W - r, Math.max(r, W / 2 + Math.cos(a) * ring * size * 0.9)))
      const y = round2(Math.min(L - r, Math.max(r, L / 2 + Math.sin(a) * ring * size * 0.9)))
      if (others.every((o) => Math.hypot(o.x - x, o.y - y) > (Math.min(o.width, o.height) / 2 + r) * 0.9)) return { x, y }
    }
  }
  return { x: round2(W / 2), y: round2(L / 2) }
}

function SaveBadge({ state }) {
  const map = {
    saved: { icon: Check, text: 'Saved', cls: 'text-leaf' },
    saving: { icon: Loader2, text: 'Saving…', cls: 'text-muted', spin: true },
    error: { icon: CloudOff, text: 'Not saved', cls: 'text-red-400' },
  }
  const s = map[state]
  return (
    <AnimatePresence mode="wait">
      <motion.span key={state} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className={`inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold ${s.cls}`} role="status" aria-live="polite">
        <s.icon size={14} className={s.spin ? 'animate-spin' : ''} /> <span className="hidden sm:inline">{s.text}</span><span className="sr-only sm:hidden">{s.text}</span>
      </motion.span>
    </AnimatePresence>
  )
}

export default function Designer() {
  const { id, gardens, empty, error: listError } = useGardenRoute('/designer')
  const { catalog, plantsById, materialsById, unit, toast, theme } = useApp()
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const handledAdd = useRef(null)
  const navigate = useNavigate()
  const [garden, setGarden] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [hist, setHist] = useState({ past: [], present: [], future: [] })
  const [selectedId, setSelectedId] = useState(null)
  const [saveState, setSaveState] = useState('saved')
  const [showLabels, setShowLabels] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [sheet, setSheet] = useState(null) // mobile: 'palette' | 'inspector'
  const [newOpen, setNewOpen] = useState(false)
  const [newIds, setNewIds] = useState(() => new Set())
  const canvasRef = useRef(null)
  const loadedFor = useRef(null)
  const lastSaved = useRef('')
  const saveTimer = useRef(null)
  const thumbTimer = useRef(null)
  const pending = useRef(null)
  const liveBase = useRef(null)
  const items = hist.present
  const itemsRef = useRef(items)
  itemsRef.current = items

  // ---------- load ----------
  useEffect(() => {
    if (!id) return
    let alive = true
    setGarden(null)
    setLoadError(null)
    setSelectedId(null)
    api
      .getGarden(id)
      .then((g) => {
        if (!alive) return
        setGarden(g)
        setHist({ past: [], present: g.items, future: [] })
        lastSaved.current = JSON.stringify(g.items)
        loadedFor.current = g.id
        setSaveState('saved')
      })
      .catch((e) => alive && setLoadError(e.message))
    return () => {
      alive = false
    }
  }, [id])

  // ---------- autosave (debounced, optimistic) ----------
  const flush = useCallback(async () => {
    clearTimeout(saveTimer.current)
    const job = pending.current
    if (!job) return
    pending.current = null
    try {
      const res = await api.saveItems(job.id, job.items)
      lastSaved.current = JSON.stringify(job.items)
      if (job.id === loadedFor.current) {
        setSaveState('saved')
        if (res?.status) setGarden((g) => (g && g.id === job.id ? { ...g, status: res.status } : g))
        clearTimeout(thumbTimer.current)
        thumbTimer.current = setTimeout(() => {
          const url = canvasRef.current?.thumbnail()
          if (url && job.id === loadedFor.current) api.saveThumbnail(job.id, url).catch(() => {})
        }, THUMB_DELAY)
      }
    } catch (e) {
      if (job.id === loadedFor.current) setSaveState('error')
      toast('error', 'Couldn’t save your design', e.message, { action: { label: 'Retry', onClick: () => { pending.current = job; flush() } } })
    }
  }, [toast])

  useEffect(() => {
    if (!garden || loadedFor.current !== garden.id) return
    const json = JSON.stringify(items)
    if (json === lastSaved.current) return
    setSaveState('saving')
    pending.current = { id: garden.id, items }
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(flush, SAVE_DELAY)
  }, [items, garden, flush])

  // flush when leaving the page or switching garden
  useEffect(() => () => flush(), [id, flush])
  useEffect(() => {
    const onHide = () => flush()
    window.addEventListener('pagehide', onHide)
    return () => window.removeEventListener('pagehide', onHide)
  }, [flush])

  // ---------- history ----------
  const commit = useCallback((fn) => {
    setHist((h) => {
      const next = fn(h.present)
      if (next === h.present) return h
      const base = liveBase.current || h.present
      liveBase.current = null
      return { past: [...h.past.slice(-80), base], present: next, future: [] }
    })
  }, [])
  const undo = useCallback(() => setHist((h) => (h.past.length ? { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] } : h)), [])
  const redo = useCallback(() => setHist((h) => (h.future.length ? { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) } : h)), [])

  const warnings = useMemo(() => (garden && !catalog.loading ? computeWarnings(items, garden, plantsById) : {}), [items, garden, plantsById, catalog.loading])
  const warningsRef = useRef(warnings)

  // toast when an item newly picks up a warning
  const watchItem = useRef(null)
  useEffect(() => {
    const wid = watchItem.current
    if (wid && warnings[wid] && !warningsRef.current[wid]) toast('warning', 'Heads up', warnings[wid][0])
    watchItem.current = null
    warningsRef.current = warnings
  }, [warnings, toast])

  const updateItem = useCallback((itemId, patch, opts = {}) => {
    if (opts.settle) {
      if (liveBase.current) {
        const base = liveBase.current
        liveBase.current = null
        setHist((h) => ({ past: [...h.past, base], present: h.present, future: [] }))
      }
      return
    }
    if (opts.live) {
      setHist((h) => {
        if (!liveBase.current) liveBase.current = h.present
        return { ...h, present: h.present.map((i) => (i.id === itemId ? { ...i, ...patch } : i)) }
      })
      return
    }
    watchItem.current = itemId
    commit((list) => list.map((i) => (i.id === itemId ? { ...i, ...patch } : i)))
  }, [commit])

  const addItem = useCallback(({ kind, id: refId }, at) => {
    if (!garden) return
    const plant = kind === 'plant' ? plantsById[refId] : null
    const material = kind === 'material' ? materialsById[refId] : null
    if (!plant && !material) return
    let pos = at
    if (!pos) pos = plant ? findFreeSpot(itemsRef.current, plantFootprint(plant), garden.width, garden.length) : canvasRef.current?.viewCenter() || { x: garden.width / 2, y: garden.length / 2 }
    const item = makeItem({ plant, material, ...pos })
    if (plant) {
      const s = Math.min(item.width, garden.width, garden.length)
      item.width = item.height = round2(s)
    }
    setNewIds((s) => new Set(s).add(item.id))
    watchItem.current = item.id
    commit((list) => [...list, item])
    setSelectedId(item.id)
    setSheet(null)
    return item
  }, [garden, plantsById, materialsById, commit])

  // "Add to garden" from the Plant Library: /designer/:id?add=<plantId>
  useEffect(() => {
    const add = params.get('add')
    if (!add || !garden || catalog.loading || loadedFor.current !== garden.id || handledAdd.current === location.key) return
    handledAdd.current = location.key
    setParams({}, { replace: true })
    const item = addItem({ kind: 'plant', id: Number(add) || add })
    if (item) toast('success', `${plantsById[item.plant_id].name} planted`, `Added to ${garden.name}. Drag it into place.`)
  }, [params, location.key, garden, catalog.loading, addItem, setParams, toast, plantsById])

  const deleteSelected = useCallback(() => {
    if (!selectedId) return
    commit((list) => list.filter((i) => i.id !== selectedId))
    setSelectedId(null)
    setSheet(null)
  }, [selectedId, commit])

  const duplicateSelected = useCallback(() => {
    const src = itemsRef.current.find((i) => i.id === selectedId)
    if (!src || !garden) return
    const copy = { ...src, id: uid(), x: round2(Math.min(garden.width, src.x + 0.5)), y: round2(Math.min(garden.length, src.y + 0.5)) }
    setNewIds((s) => new Set(s).add(copy.id))
    commit((list) => [...list, copy])
    setSelectedId(copy.id)
  }, [selectedId, garden, commit])

  // ---------- keyboard ----------
  useEffect(() => {
    const onKey = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return
      const mod = e.ctrlKey || e.metaKey
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        e.shiftKey ? redo() : undo()
      } else if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        redo()
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault()
        deleteSelected()
      } else if (e.key === 'Escape') setSelectedId(null)
      else if (selectedId && e.key.toLowerCase() === 'r') {
        const it = itemsRef.current.find((i) => i.id === selectedId)
        if (it) updateItem(selectedId, { rotation: ((it.rotation || 0) + (e.shiftKey ? 345 : 15)) % 360 })
      } else if (selectedId && e.key.startsWith('Arrow')) {
        e.preventDefault()
        const it = itemsRef.current.find((i) => i.id === selectedId)
        const d = e.shiftKey ? 0.5 : 0.1
        const dx = e.key === 'ArrowLeft' ? -d : e.key === 'ArrowRight' ? d : 0
        const dy = e.key === 'ArrowUp' ? -d : e.key === 'ArrowDown' ? d : 0
        if (it) updateItem(selectedId, { x: round2(Math.max(0, Math.min(garden.width, it.x + dx))), y: round2(Math.max(0, Math.min(garden.length, it.y + dy))) })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo, deleteSelected, selectedId, updateItem, garden])

  const onCanvasChange = useCallback((itemId, patch) => updateItem(itemId, patch), [updateItem])
  const onDropNew = useCallback((payload, x, y) => addItem(payload, { x, y }), [addItem])
  const onViewChange = useCallback((v) => setZoom(v.scale), [])
  const total = useMemo(() => (catalog.loading ? 0 : buildShoppingList(items, plantsById, materialsById).total), [items, plantsById, materialsById, catalog.loading])

  // ---------- states ----------
  if (listError || loadError) return <ErrorState message={listError || loadError} onRetry={() => navigate(0)} />
  if (empty)
    return (
      <>
        <EmptyState icon={Sprout} title="No gardens yet. Let’s plant your first idea!" message="Create a garden first, then you can drag in plants, paths and more." action={<button className="btn-primary" onClick={() => setNewOpen(true)}><Plus size={18} /> New Garden</button>} />
        <NewGardenModal open={newOpen} onClose={() => setNewOpen(false)} />
      </>
    )
  if (!garden || catalog.loading)
    return (
      <div className="flex h-[calc(100dvh-160px)] flex-col gap-3 lg:h-[calc(100dvh-100px)]">
        <Skeleton className="h-14 w-full rounded-2xl" />
        <div className="flex min-h-0 flex-1 gap-3">
          <Skeleton className="hidden w-64 rounded-3xl lg:block" />
          <Skeleton className="flex-1 rounded-3xl" />
          <Skeleton className="hidden w-72 rounded-3xl xl:block" />
        </div>
      </div>
    )

  const selected = items.find((i) => i.id === selectedId)
  const selectedDef = selected ? (selected.item_type === 'plant' ? plantsById[selected.plant_id] : materialsById[selected.material_id]) : null
  const warnCount = Object.keys(warnings).length

  const inspector = (
    <Inspector
      garden={garden}
      item={selected}
      def={selectedDef}
      warnings={selected ? warnings[selected.id] : null}
      allWarnings={warnings}
      onChange={(patch, opts) => selected && updateItem(selected.id, patch, opts)}
      onDelete={deleteSelected}
      onDuplicate={duplicateSelected}
      onSelect={(i) => {
        setSelectedId(i)
        setSheet(null)
      }}
      items={items}
      plantsById={plantsById}
      materialsById={materialsById}
      unit={unit}
      total={total}
    />
  )

  const tb = 'icon-btn !h-10 !w-10 shrink-0'
  return (
    <div className="flex h-[calc(100dvh-160px)] flex-col gap-3 lg:h-[calc(100dvh-100px)]">
      {/* toolbar */}
      <div className="glass flex items-center gap-2 rounded-2xl p-2">
        <div className="hidden min-w-0 sm:block">
          <GardenSwitcher gardens={gardens} id={id} base="/designer" />
        </div>
        <div className="min-w-0 flex-1 sm:hidden">
          <p className="truncate font-display font-bold">{garden.name}</p>
        </div>
        <SaveBadge state={saveState} />
        <div className="ml-auto flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button className={tb} onClick={undo} disabled={!hist.past.length} aria-label="Undo" title="Undo (Ctrl+Z)"><Undo2 size={17} /></button>
          <button className={tb} onClick={redo} disabled={!hist.future.length} aria-label="Redo" title="Redo (Ctrl+Y)"><Redo2 size={17} /></button>
          <span className="mx-0.5 hidden h-6 w-px bg-line/15 sm:block" />
          <button className={`${tb} hidden sm:inline-flex`} onClick={() => canvasRef.current?.zoomOut()} aria-label="Zoom out"><ZoomOut size={17} /></button>
          <span className="hidden w-12 text-center text-xs font-semibold tabular-nums text-muted sm:block">{Math.round(zoom * 100)}%</span>
          <button className={`${tb} hidden sm:inline-flex`} onClick={() => canvasRef.current?.zoomIn()} aria-label="Zoom in"><ZoomIn size={17} /></button>
          <button className={tb} onClick={() => canvasRef.current?.fit()} aria-label="Fit garden to screen" title="Fit to screen"><Maximize size={17} /></button>
          <button className={`${tb} ${showLabels ? '!border-leaf/50 !bg-leaf/15 !text-leaf' : ''}`} onClick={() => setShowLabels((s) => !s)} aria-pressed={showLabels} aria-label="Show all measurements" title="Measurements"><Ruler size={17} /></button>
          <button className={tb} onClick={deleteSelected} disabled={!selectedId} aria-label="Delete selected item" title="Delete (Del)"><Trash2 size={17} /></button>
          <span className="mx-0.5 hidden h-6 w-px bg-line/15 md:block" />
          <Link to={`/seasons/${garden.id}`} className={`${tb} hidden md:inline-flex`} aria-label="Seasonal preview" title="Seasonal preview"><CalendarRange size={17} /></Link>
          <Link to={`/plan/${garden.id}`} className="btn-primary hidden !min-h-[40px] !py-2 md:inline-flex"><ClipboardList size={16} /> Build Plan</Link>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 gap-3">
        <aside className="glass hidden w-64 shrink-0 overflow-hidden rounded-3xl lg:block">
          <Palette plants={catalog.plants} materials={catalog.materials} onAdd={(p) => addItem(p)} unit={unit} />
        </aside>

        <div className="glass relative min-w-0 flex-1 overflow-hidden rounded-3xl">
          <DesignerCanvas
            ref={canvasRef}
            garden={garden}
            items={items}
            plantsById={plantsById}
            materialsById={materialsById}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onChange={onCanvasChange}
            onDropNew={onDropNew}
            warnings={warnings}
            unit={unit}
            showLabels={showLabels}
            newIds={newIds}
            onViewChange={onViewChange}
            dark={theme === 'dark'}
          />
          {items.length === 0 && (
            <div className="pointer-events-none absolute inset-x-0 top-6 flex justify-center px-4">
              <div className="glass rounded-2xl px-4 py-3 text-center text-sm">
                <Sprout className="mx-auto mb-1 text-leaf" size={20} />
                <span className="font-semibold">Your canvas is ready.</span> <span className="text-muted">Drag in a lawn, a path or your first plant.</span>
              </div>
            </div>
          )}
          {warnCount > 0 && (
            <button onClick={() => { setSelectedId(null); setSheet('inspector') }} className="glass absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-amber-500 xl:hidden">
              ⚠ {warnCount} plant {warnCount === 1 ? 'warning' : 'warnings'}
            </button>
          )}
          {/* mobile actions */}
          <div className="absolute bottom-3 right-3 flex gap-2 lg:hidden">
            {selected && (
              <button className="glass-strong inline-flex h-12 items-center gap-2 rounded-2xl px-4 text-sm font-semibold shadow-soft xl:hidden" onClick={() => setSheet('inspector')}>
                <SlidersHorizontal size={18} /> Edit
              </button>
            )}
            <button className="btn-primary h-12 rounded-2xl px-4 shadow-soft" onClick={() => setSheet('palette')}>
              <Plus size={18} /> Add
            </button>
          </div>
          {selected && (
            <button className="glass-strong absolute bottom-3 right-3 hidden h-12 items-center gap-2 rounded-2xl px-4 text-sm font-semibold shadow-soft lg:inline-flex xl:hidden" onClick={() => setSheet('inspector')}>
              <SlidersHorizontal size={18} /> Edit item
            </button>
          )}
        </div>

        <aside className="glass hidden w-72 shrink-0 overflow-y-auto rounded-3xl xl:block">{inspector}</aside>
      </div>

      {/* bottom sheets (mobile / tablet) */}
      <AnimatePresence>
        {sheet && (
          <motion.div className="fixed inset-0 z-50 xl:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/40" onClick={() => setSheet(null)} />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 320 }}
              className="glass-strong absolute inset-x-0 bottom-0 flex max-h-[75dvh] flex-col rounded-t-3xl pb-safe"
              role="dialog"
              aria-label={sheet === 'palette' ? 'Add items' : 'Edit item'}
            >
              <div className="flex items-center justify-between px-4 pt-3">
                <span className="mx-auto h-1.5 w-12 rounded-full bg-line/20" />
              </div>
              <div className="flex items-center justify-between px-4 pt-1">
                <h2 className="font-display text-lg font-bold">{sheet === 'palette' ? 'Add to garden' : selected ? 'Edit item' : 'Garden overview'}</h2>
                <button className="icon-btn !h-10 !w-10" onClick={() => setSheet(null)} aria-label="Close"><X size={18} /></button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                {sheet === 'palette' ? (
                  <div className="h-[60dvh]">
                    <Palette plants={catalog.plants} materials={catalog.materials} onAdd={(p) => addItem(p)} unit={unit} />
                  </div>
                ) : (
                  inspector
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
