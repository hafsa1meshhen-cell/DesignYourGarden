import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, animate, motion, useInView } from 'framer-motion'
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { useApp } from '../context/AppContext'

export const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
}

export function Page({ children, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function PageHeader({ eyebrow, title, subtitle, actions }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-leaf">{eyebrow}</p>}
        <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-2xl text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function GlassCard({ children, className = '', hover = false, ...rest }) {
  return (
    <div className={`glass rounded-3xl ${hover ? 'card-hover' : ''} ${className}`} {...rest}>
      {children}
    </div>
  )
}

export function Counter({ value, duration = 1.6, format = (n) => Math.round(n).toLocaleString('en-GB') }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    if (!inView) return
    const controls = animate(0, value, { duration, ease: [0.16, 1, 0.3, 1], onUpdate: setDisplay })
    return () => controls.stop()
  }, [value, inView, duration])
  return <span ref={ref}>{format(display)}</span>
}

export function ProgressRing({ value = 0, size = 96, stroke = 9, label, sublabel }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const v = Math.max(0, Math.min(100, value))
  const over = value > 100
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <defs>
            <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#22c55e" />
              <stop offset="1" stopColor="#facc15" />
            </linearGradient>
          </defs>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--line) / .1)" strokeWidth={stroke} />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={over ? '#ef4444' : 'url(#ring-grad)'}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: c - (v / 100) * c }}
            transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <span className={`font-display text-xl font-bold ${over ? 'text-red-400' : ''}`}>
            <Counter value={Math.round(value)} />%
          </span>
        </div>
      </div>
      {label && <div className="text-sm font-semibold">{label}</div>}
      {sublabel && <div className="-mt-1.5 text-xs text-muted">{sublabel}</div>}
    </div>
  )
}

export function Skeleton({ className = '' }) {
  return <div className={`skeleton ${className}`} />
}

export function CardSkeleton({ count = 3 }) {
  return Array.from({ length: count }).map((_, i) => (
    <div key={i} className="glass rounded-3xl p-4">
      <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
      <Skeleton className="mt-4 h-5 w-2/3" />
      <Skeleton className="mt-2 h-4 w-1/3" />
    </div>
  ))
}

export function EmptyState({ icon: Icon, title, message, action }) {
  return (
    <motion.div {...fadeUp} className="glass flex flex-col items-center rounded-3xl px-6 py-14 text-center">
      <motion.div
        animate={{ y: [0, -6, 0], rotate: [0, -4, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-leaf/15 text-leaf shadow-glow"
      >
        <Icon size={30} />
      </motion.div>
      <h3 className="text-xl font-bold">{title}</h3>
      {message && <p className="mt-1.5 max-w-sm text-muted">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  )
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="glass flex flex-col items-center rounded-3xl px-6 py-12 text-center">
      <div className="mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-red-500/15 text-red-400">
        <AlertTriangle size={26} />
      </div>
      <h3 className="text-lg font-bold">Oops, a weed got in the works</h3>
      <p className="mt-1 max-w-md text-muted">{message}</p>
      {onRetry && (
        <button className="btn-ghost mt-4" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  )
}

const STATUS_STYLE = {
  Idea: 'bg-sky-400/15 text-sky-600 dark:text-sky-300 border-sky-400/30',
  Planning: 'bg-amber-400/15 text-amber-700 dark:text-amber-300 border-amber-400/30',
  'Ready to Build': 'bg-violet-400/15 text-violet-700 dark:text-violet-300 border-violet-400/30',
  Built: 'bg-leaf/15 text-leaf border-leaf/40',
}
export function StatusPill({ status }) {
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${STATUS_STYLE[status]}`}>{status}</span>
}

export function Modal({ open, onClose, title, children, wide = false }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            className={`glass-strong relative max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl p-5 shadow-soft sm:rounded-3xl sm:p-7 ${wide ? 'sm:max-w-2xl' : 'sm:max-w-md'}`}
          >
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 className="text-2xl font-bold">{title}</h2>
              <button className="icon-btn" onClick={onClose} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

const TOAST_ICON = { success: CheckCircle2, error: XCircle, info: Info, warning: AlertTriangle }
const TOAST_COLOR = { success: 'text-leaf', error: 'text-red-400', info: 'text-sky-400', warning: 'text-amber-400' }

export function Toaster() {
  const { toasts, dismiss } = useApp()
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-3 sm:bottom-6 sm:left-auto sm:right-6 sm:top-auto sm:items-end">
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const Icon = TOAST_ICON[t.type] || Info
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
              role="status"
              className="glass-strong pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl p-3.5 shadow-soft"
            >
              <Icon size={20} className={`mt-0.5 shrink-0 ${TOAST_COLOR[t.type]}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{t.title}</p>
                {t.message && <p className="mt-0.5 text-[13px] text-muted">{t.message}</p>}
                {t.action && (
                  <button
                    className="mt-1.5 text-[13px] font-semibold text-leaf hover:underline"
                    onClick={() => {
                      t.action.onClick()
                      dismiss(t.id)
                    }}
                  >
                    {t.action.label}
                  </button>
                )}
              </div>
              <button className="-m-1 rounded-lg p-1 text-muted hover:text-ink" onClick={() => dismiss(t.id)} aria-label="Dismiss">
                <X size={16} />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

export function Segmented({ options, value, onChange, size = 'md', name }) {
  return (
    <div className="inline-flex max-w-full overflow-x-auto rounded-xl border border-line/15 bg-line/5 p-1 no-scrollbar">
      {options.map((o) => {
        const v = typeof o === 'string' ? o : o.value
        const l = typeof o === 'string' ? o : o.label
        const active = v === value
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            aria-pressed={active}
            className={`relative shrink-0 rounded-lg px-3 ${size === 'sm' ? 'py-1 text-xs' : 'py-1.5 text-sm'} min-h-[36px] font-semibold transition-colors ${active ? 'text-forest-900' : 'text-muted hover:text-ink'}`}
          >
            {active && <motion.span layoutId={`seg-${name}`} className="absolute inset-0 rounded-lg bg-brand" transition={{ type: 'spring', damping: 25, stiffness: 300 }} />}
            <span className="relative">{l}</span>
          </button>
        )
      })}
    </div>
  )
}
