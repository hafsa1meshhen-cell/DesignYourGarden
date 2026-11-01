import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import confetti from 'canvas-confetti'
import { CheckCircle2, Circle, ClipboardList, Droplets, FileDown, ImageDown, Loader2, PartyPopper, PenTool, ShoppingBasket, Sprout, Wallet } from 'lucide-react'
import GardenSVG from '../components/GardenSVG'
import GardenSwitcher from '../components/GardenSwitcher'
import { EmptyState, ErrorState, GlassCard, Page, PageHeader, ProgressRing, Segmented, Skeleton, StatusPill } from '../components/ui'
import { useApp } from '../context/AppContext'
import { useGardenRoute } from '../hooks/useGardenRoute'
import { api } from '../lib/api'
import { fmtLen, money, money2 } from '../lib/garden'
import { STATUSES } from '../data/content'

const fmtQty = (r) => (r.unit === 'plant' ? `${r.qty}` : `${r.qty} ${r.unit}`)

export function petalConfetti() {
  const petal = confetti.shapeFromPath({ path: 'M0 0 C 6 -8, 16 -8, 20 0 C 16 8, 6 8, 0 0 Z' })
  const colors = ['#f9a8d4', '#fbcfe8', '#facc15', '#4ade80', '#ffffff', '#ec4899']
  const base = { shapes: [petal], colors, scalar: 2.2, ticks: 260, gravity: 0.6, drift: 0.4 }
  confetti({ ...base, particleCount: 120, spread: 100, origin: { y: 0.6 } })
  setTimeout(() => confetti({ ...base, particleCount: 70, angle: 60, spread: 70, origin: { x: 0, y: 0.7 } }), 250)
  setTimeout(() => confetti({ ...base, particleCount: 70, angle: 120, spread: 70, origin: { x: 1, y: 0.7 } }), 400)
}

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="glass-strong rounded-xl px-3 py-2 text-sm shadow-soft">
      <p className="font-semibold">{d.name}</p>
      <p className="text-muted">{money(d.value)}</p>
    </div>
  )
}

function ShoppingTable({ title, rows, total, icon: Icon }) {
  if (!rows.length) return null
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-bold"><Icon size={17} className="text-leaf" /> {title}</h3>
        <span className="text-sm font-semibold">{money2(total)}</span>
      </div>
      <div className="overflow-hidden rounded-2xl border border-line/10">
        <table className="w-full text-sm">
          <thead className="bg-line/5 text-left text-[11px] uppercase tracking-wider text-muted">
            <tr>
              <th className="px-3 py-2 font-semibold">Item</th>
              <th className="px-3 py-2 text-right font-semibold">Qty</th>
              <th className="hidden px-3 py-2 text-right font-semibold sm:table-cell">Unit price</th>
              <th className="px-3 py-2 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-t border-line/10">
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    {r.color && <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: r.color }} />}
                    <span className="font-medium">{r.name}</span>
                  </div>
                  <div className="text-[11px] text-muted">{r.category}<span className="sm:hidden"> · {money2(r.unitPrice)} / {r.unit}</span></div>
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">{fmtQty(r)}</td>
                <td className="hidden whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-muted sm:table-cell">{money2(r.unitPrice)} / {r.unit}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold tabular-nums">{money2(r.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function BuildPlan() {
  const { id, gardens, empty, error: listError } = useGardenRoute('/plan')
  const { plantsById, materialsById, catalog, toast, unit, theme } = useApp()
  const [plan, setPlan] = useState(null)
  const [error, setError] = useState(null)
  const [exporting, setExporting] = useState(null)
  const sheetRef = useRef(null)
  const designRef = useRef(null)

  const load = useCallback(() => {
    if (!id) return
    setError(null)
    api.getPlan(id).then(setPlan).catch((e) => setError(e.message))
  }, [id])
  useEffect(() => {
    setPlan(null)
    load()
  }, [load])

  const toggleTask = async (t) => {
    const completed = !t.completed
    setPlan((p) => ({ ...p, tasks: p.tasks.map((x) => (x.id === t.id ? { ...x, completed } : x)) }))
    try {
      await api.setTaskDone(id, t.id, completed)
    } catch (e) {
      setPlan((p) => ({ ...p, tasks: p.tasks.map((x) => (x.id === t.id ? { ...x, completed: !completed } : x)) }))
      toast('error', 'Couldn’t save that tick', e.message)
    }
  }

  const toggleCare = async (t) => {
    const completed = !t.completed
    setPlan((p) => ({ ...p, care_tasks: p.care_tasks.map((x) => (x.id === t.id ? { ...x, completed } : x)) }))
    try {
      await api.setCareTaskDone(id, t.id, completed)
    } catch (e) {
      setPlan((p) => ({ ...p, care_tasks: p.care_tasks.map((x) => (x.id === t.id ? { ...x, completed: !completed } : x)) }))
      toast('error', 'Couldn’t save that tick', e.message)
    }
  }

  const setStatus = async (status) => {
    const prev = plan.garden.status
    if (status === prev) return
    setPlan((p) => ({ ...p, garden: { ...p.garden, status } }))
    try {
      await api.updateGarden(id, { status })
      if (status === 'Built') {
        petalConfetti()
        toast('success', 'Congratulations, it’s built! 🌸', `${plan.garden.name} is now growing for real.`)
      } else toast('success', 'Status updated', `Marked as “${status}”.`)
    } catch (e) {
      setPlan((p) => ({ ...p, garden: { ...p.garden, status: prev } }))
      toast('error', 'Couldn’t update status', e.message)
    }
  }

  const capture = async (node) => {
    const { toPng } = await import('html-to-image')
    return toPng(node, { pixelRatio: 2, backgroundColor: '#ffffff', skipFonts: true, cacheBust: true })
  }

  const exportImage = async () => {
    setExporting('png')
    try {
      const url = await capture(sheetRef.current)
      const a = document.createElement('a')
      a.href = url
      a.download = `${plan.garden.name.replace(/[^\w-]+/g, '-')}-plan.png`
      a.click()
      toast('success', 'Image downloaded', 'Your design and shopping list are saved as a PNG.')
    } catch (e) {
      toast('error', 'Export failed', e.message || 'Could not create the image.')
    } finally {
      setExporting(null)
    }
  }

  const exportPdf = async () => {
    setExporting('pdf')
    try {
      const [{ jsPDF }, img] = await Promise.all([import('jspdf'), capture(designRef.current)])
      const g = plan.garden
      const L = plan.list
      const doc = new jsPDF({ unit: 'mm', format: 'a4' })
      const W = 210
      doc.setFillColor(7, 29, 18)
      doc.rect(0, 0, W, 26, 'F')
      doc.setTextColor(74, 222, 128)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(18)
      doc.text('GardenCraft', 14, 16)
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(11)
      doc.text('Build Plan', W - 14, 16, { align: 'right' })
      doc.setTextColor(20, 40, 28)
      doc.setFontSize(16)
      doc.text(g.name, 14, 38)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.text(`${fmtLen(g.width, unit)} x ${fmtLen(g.length, unit)} · ${g.sun_exposure} · ${g.soil_type} soil · ${g.style} · Status: ${g.status}`, 14, 44)
      const props = doc.getImageProperties(img)
      const iw = W - 28
      const ih = Math.min(120, (props.height / props.width) * iw)
      const iw2 = (props.width / props.height) * ih
      doc.addImage(img, 'PNG', (W - iw2) / 2, 50, iw2, ih)
      let y = 50 + ih + 10
      const line = (cells, bold = false) => {
        if (y > 280) {
          doc.addPage()
          y = 20
        }
        doc.setFont('helvetica', bold ? 'bold' : 'normal')
        doc.text(cells[0], 14, y)
        doc.text(cells[1], 130, y, { align: 'right' })
        doc.text(cells[2], 160, y, { align: 'right' })
        doc.text(cells[3], W - 14, y, { align: 'right' })
        y += 6
      }
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('Shopping list', 14, y)
      y += 7
      doc.setFontSize(9.5)
      line(['Item', 'Qty', 'Unit price', 'Total'], true)
      const gbp = (n) => `GBP ${n.toFixed(2)}`
      for (const r of [...L.plants, ...L.materials]) line([`${r.name} (${r.category})`, r.unit === 'plant' ? String(r.qty) : `${r.qty} ${r.unit === 'm²' ? 'm2' : r.unit}`, gbp(r.unitPrice), gbp(r.total)])
      y += 2
      line(['Estimated total', '', '', gbp(L.total)], true)
      line(['Budget', '', '', gbp(g.budget)], false)
      y += 4
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      if (y > 260) {
        doc.addPage()
        y = 20
      }
      doc.text('Build checklist', 14, y)
      y += 7
      doc.setFontSize(9.5)
      for (const t of plan.tasks) {
        if (y > 285) {
          doc.addPage()
          y = 20
        }
        doc.setFont('helvetica', 'normal')
        doc.rect(14, y - 3.2, 3.5, 3.5)
        if (t.completed) doc.text('x', 14.8, y - 0.2)
        doc.text(t.title, 20, y)
        y += 6
      }
      doc.save(`${g.name.replace(/[^\w-]+/g, '-')}-plan.pdf`)
      toast('success', 'PDF downloaded', 'Take it with you to the garden centre.')
    } catch (e) {
      toast('error', 'Export failed', e.message || 'Could not create the PDF.')
    } finally {
      setExporting(null)
    }
  }

  if (listError || error) return <ErrorState message={listError || error} onRetry={load} />
  if (empty) return <EmptyState icon={Sprout} title="No gardens yet" message="Design a garden and your shopping list and build plan appear here." action={<Link className="btn-primary" to="/gardens">Go to My Gardens</Link>} />
  if (!plan || catalog.loading)
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-72" />
        <div className="grid gap-3 sm:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-3xl" />)}</div>
        <Skeleton className="h-96 rounded-3xl" />
      </div>
    )

  const { garden, list, tasks, care_tasks: care = [] } = plan
  const done = tasks.filter((t) => t.completed).length
  const left = garden.budget - list.total
  const over = left < 0
  const usedPct = garden.budget > 0 ? Math.min(100, (list.total / garden.budget) * 100) : 0
  const tick = theme === 'dark' ? '#96b6a2' : '#4e6858'
  const isEmpty = garden.items.length === 0

  return (
    <Page>
      <PageHeader
        eyebrow="Build Plan"
        title={garden.name}
        subtitle="Everything you need to buy and do to turn this design into a real garden."
        actions={
          <>
            <GardenSwitcher gardens={gardens} id={id} base="/plan" />
            <button className="btn-ghost" onClick={exportImage} disabled={!!exporting || isEmpty}>{exporting === 'png' ? <Loader2 size={16} className="animate-spin" /> : <ImageDown size={16} />} Image</button>
            <button className="btn-ghost" onClick={exportPdf} disabled={!!exporting || isEmpty}>{exporting === 'pdf' ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />} PDF</button>
          </>
        }
      />

      <GlassCard className="mb-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <StatusPill status={garden.status} />
          <span className="text-sm text-muted">{garden.status === 'Built' ? 'Built for real. Enjoy every season!' : 'Update the status as your project moves along.'}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented name="status" size="sm" value={garden.status} onChange={setStatus} options={STATUSES.filter((s) => s !== 'Built')} />
          <button onClick={() => (garden.status === 'Built' ? petalConfetti() : setStatus('Built'))} className="btn-primary !min-h-[40px] !py-2">
            <PartyPopper size={16} /> {garden.status === 'Built' ? 'Celebrate again' : 'Mark as Built'}
          </button>
        </div>
      </GlassCard>

      {isEmpty ? (
        <EmptyState icon={ShoppingBasket} title="Your shopping list is empty" message="Add plants, paths and other features in the designer and the list and costs will build themselves." action={<Link className="btn-primary" to={`/designer/${id}`}><PenTool size={16} /> Open designer</Link>} />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: 'Estimated total', value: money(list.total), icon: Wallet },
              { label: `${list.plantCount} plants`, value: money(list.plantsTotal), icon: Sprout },
              { label: 'Materials', value: money(list.materialsTotal), icon: ShoppingBasket },
              { label: over ? 'Over budget' : 'Budget left', value: money(Math.abs(left)), icon: Wallet, warn: over },
            ].map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                <GlassCard className="p-4">
                  <s.icon size={18} className={s.warn ? 'text-red-400' : 'text-leaf'} />
                  <div className={`mt-2 font-display text-2xl font-bold tabular-nums ${s.warn ? 'text-red-400' : ''}`}>{s.value}</div>
                  <div className="text-xs text-muted">{s.label}</div>
                </GlassCard>
              </motion.div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <GlassCard className="space-y-6 p-4 sm:p-5">
              <ShoppingTable title="Plants" rows={list.plants} total={list.plantsTotal} icon={Sprout} />
              <ShoppingTable title="Materials & structures" rows={list.materials} total={list.materialsTotal} icon={ShoppingBasket} />
              <div className="flex items-center justify-between rounded-2xl bg-leaf/10 px-4 py-3">
                <span className="font-bold">Estimated total</span>
                <span className="font-display text-xl font-bold text-leaf tabular-nums">{money2(list.total)}</span>
              </div>
            </GlassCard>

            <div className="space-y-4">
              <GlassCard className="p-5">
                <h3 className="font-bold">Budget</h3>
                <div className="mt-3 flex items-baseline justify-between text-sm">
                  <span className="text-muted">{money(list.total)} of {money(garden.budget)}</span>
                  <span className={`font-semibold ${over ? 'text-red-400' : 'text-leaf'}`}>{garden.budget > 0 ? `${Math.round((list.total / garden.budget) * 100)}% used` : 'No budget set'}</span>
                </div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-line/10" role="meter" aria-valuenow={Math.round(usedPct)} aria-valuemin={0} aria-valuemax={100} aria-label="Budget used">
                  <motion.div className={`h-full rounded-full ${over ? 'bg-red-500' : 'bg-brand'}`} initial={{ width: 0 }} animate={{ width: `${usedPct}%` }} transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }} />
                </div>
                <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wider text-muted">Cost by category</p>
                <div style={{ height: Math.max(160, list.byCategory.length * 34) }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={list.byCategory} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }} barCategoryGap={6}>
                      <CartesianGrid horizontal={false} stroke="rgb(var(--line) / 0.08)" />
                      <XAxis type="number" tick={{ fill: tick, fontSize: 11 }} tickFormatter={(v) => `£${v}`} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" width={100} tick={{ fill: tick, fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgb(var(--line) / 0.06)' }} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]} isAnimationActive animationDuration={900}>
                        {list.byCategory.map((d) => <Cell key={d.name} fill="#22c55e" />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>

              <GlassCard className="p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="flex items-center gap-2 font-bold"><ClipboardList size={17} className="text-leaf" /> Build checklist</h3>
                    <p className="text-xs text-muted">{done} of {tasks.length} steps done</p>
                  </div>
                  <ProgressRing key={`${id}-${tasks.length}`} value={tasks.length ? (done / tasks.length) * 100 : 0} size={64} stroke={7} />
                </div>
                <ol className="space-y-1.5">
                  {tasks.map((t, i) => (
                    <li key={t.id}>
                      <button onClick={() => toggleTask(t)} aria-pressed={t.completed} className={`flex w-full min-h-[48px] items-start gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${t.completed ? 'bg-leaf/10' : 'hover:bg-line/5'}`}>
                        <motion.span key={String(t.completed)} initial={{ scale: 0.6 }} animate={{ scale: 1 }} className="mt-0.5 shrink-0">
                          {t.completed ? <CheckCircle2 size={20} className="text-leaf" /> : <Circle size={20} className="text-muted" />}
                        </motion.span>
                        <span className={t.completed ? 'text-muted line-through' : ''}><span className="mr-1 font-semibold text-muted">{i + 1}.</span> {t.title}</span>
                      </button>
                    </li>
                  ))}
                </ol>
              </GlassCard>

              {care.length > 0 && (
                <GlassCard className="p-5">
                  <h3 className="mb-3 flex items-center gap-2 font-bold"><Droplets size={17} className="text-sky-400" /> Care calendar</h3>
                  <ul className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
                    {care.map((t) => (
                      <li key={t.id}>
                        <button onClick={() => toggleCare(t)} aria-pressed={!!t.completed} className={`flex w-full min-h-[44px] items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition ${t.completed ? 'bg-leaf/10' : 'hover:bg-line/5'}`}>
                          {t.completed ? <CheckCircle2 size={18} className="shrink-0 text-leaf" /> : <Circle size={18} className="shrink-0 text-muted" />}
                          <span className={`flex-1 ${t.completed ? 'text-muted line-through' : ''}`}><span className="capitalize">{t.task_type}</span> {t.plant_name}</span>
                          <span className="text-xs text-muted">{t.month}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </GlassCard>
              )}
            </div>
          </div>
        </>
      )}

      {/* Off-screen printable sheet used for image/PDF export */}
      <div aria-hidden="true" style={{ position: 'fixed', left: -10000, top: 0, width: 900, pointerEvents: 'none' }}>
        <div ref={sheetRef} style={{ width: 900, padding: 40, background: '#ffffff', color: '#14281c', fontFamily: 'Inter, Arial, sans-serif' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '3px solid #22c55e', paddingBottom: 12 }}>
            <div style={{ fontSize: 30, fontWeight: 800, color: '#16a34a' }}>GardenCraft</div>
            <div style={{ fontSize: 14, color: '#4e6858' }}>Build Plan</div>
          </div>
          <h2 style={{ fontSize: 26, fontWeight: 700, margin: '20px 0 4px' }}>{garden.name}</h2>
          <p style={{ color: '#4e6858', margin: 0 }}>{fmtLen(garden.width, unit)} × {fmtLen(garden.length, unit)} · {garden.sun_exposure} · {garden.soil_type} soil · {garden.style} · {garden.status}</p>
          <div ref={designRef} style={{ background: '#0b2a1b', borderRadius: 16, padding: 16, margin: '20px 0' }}>
            <GardenSVG garden={garden} items={garden.items} plantsById={plantsById} materialsById={materialsById} className="block w-full" />
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f0fdf4', textAlign: 'left' }}>
                <th style={{ padding: 8 }}>Item</th><th style={{ padding: 8, textAlign: 'right' }}>Qty</th><th style={{ padding: 8, textAlign: 'right' }}>Unit price</th><th style={{ padding: 8, textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {[...list.plants, ...list.materials].map((r) => (
                <tr key={r.key} style={{ borderTop: '1px solid #e5e7eb' }}>
                  <td style={{ padding: 8 }}>{r.name} <span style={{ color: '#6b7280' }}>· {r.category}</span></td>
                  <td style={{ padding: 8, textAlign: 'right' }}>{fmtQty(r)}</td>
                  <td style={{ padding: 8, textAlign: 'right' }}>{money2(r.unitPrice)}</td>
                  <td style={{ padding: 8, textAlign: 'right', fontWeight: 600 }}>{money2(r.total)}</td>
                </tr>
              ))}
              <tr style={{ borderTop: '2px solid #22c55e' }}>
                <td style={{ padding: 8, fontWeight: 700 }} colSpan={3}>Estimated total (budget {money(garden.budget)})</td>
                <td style={{ padding: 8, textAlign: 'right', fontWeight: 800, color: '#16a34a' }}>{money2(list.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </Page>
  )
}
