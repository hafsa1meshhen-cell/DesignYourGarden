import { useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail, UserRound } from 'lucide-react'
import Logo from '../components/Logo'
import GardenSVG from '../components/GardenSVG'
import { GlassCard, Segmented } from '../components/ui'
import { ThemeToggle } from '../components/Layout'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { CLIMATE_ZONES } from '../data/content'
import { SHOWCASE_GARDEN } from '../data/showcase'

function Shell({ title, subtitle, children, footer }) {
  const { plantsById, materialsById, catalog } = useApp()
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 pt-5">
        <Logo />
        <ThemeToggle />
      </header>
      <main className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-8 lg:grid-cols-2 lg:py-14">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <GlassCard className="mx-auto w-full max-w-md p-6 sm:p-8">
            <h1 className="text-3xl font-bold">{title}</h1>
            <p className="mt-1 text-muted">{subtitle}</p>
            <div className="mt-6">{children}</div>
          </GlassCard>
          <p className="mt-5 text-center text-sm text-muted">{footer}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, delay: 0.1 }} className="relative hidden lg:block">
          <div className="absolute -inset-8 -z-10 rounded-full bg-leaf/20 blur-3xl" />
          <GlassCard className="p-4">
            <div className="overflow-hidden rounded-2xl bg-forest-800">
              {catalog.loading || catalog.error ? <div className="skeleton aspect-[5/4]" /> : <GardenSVG garden={SHOWCASE_GARDEN} items={SHOWCASE_GARDEN.items} plantsById={plantsById} materialsById={materialsById} season="Spring" className="block aspect-[5/4] w-full" />}
            </div>
            <p className="px-2 pb-1 pt-4 font-display text-2xl font-bold">
              Design it here. <span className="text-gradient">Grow it for real.</span>
            </p>
          </GlassCard>
        </motion.div>
      </main>
    </div>
  )
}

function Field({ icon: Icon, label, id, children }) {
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <div className="relative">
        <Icon size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
        {children}
      </div>
    </div>
  )
}

function PasswordInput({ id, value, onChange, autoComplete }) {
  const [show, setShow] = useState(false)
  return (
    <>
      <input id={id} type={show ? 'text' : 'password'} className="input pl-10 pr-11" value={value} onChange={onChange} autoComplete={autoComplete} required />
      <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-muted hover:text-ink" aria-label={show ? 'Hide password' : 'Show password'}>
        {show ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </>
  )
}

function ErrorBox({ error }) {
  if (!error) return null
  return (
    <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-500 dark:text-red-300">
      {error}
    </motion.p>
  )
}

const safeNext = (n) => (n && n.startsWith('/') && !n.startsWith('//') ? n : '/gardens')

export function Login() {
  const { user, login } = useAuth()
  const { toast } = useApp()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const next = safeNext(params.get('next'))
  if (user && !busy) return <Navigate to={next} replace />

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await login(email, password)
      toast('success', 'Welcome back!', 'Your gardens missed you.')
      navigate(next, { replace: true })
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <Shell title="Welcome back" subtitle="Log in to keep growing your gardens." footer={<>New to GardenCraft? <Link to={`/signup${params.get('next') ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-semibold text-leaf hover:underline">Create a free account</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        <Field icon={Mail} label="Email" id="email">
          <input id="email" type="email" className="input pl-10" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </Field>
        <Field icon={Lock} label="Password" id="password">
          <PasswordInput id="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </Field>
        <ErrorBox error={error} />
        <button className="btn-primary w-full py-3 text-base" disabled={busy}>
          {busy ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />} {busy ? 'Logging in…' : 'Log in'}
        </button>
      </form>
    </Shell>
  )
}

export function Signup() {
  const { user, signup } = useAuth()
  const { toast } = useApp()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [form, setForm] = useState({ full_name: '', email: '', password: '', unit_preference: 'metric', climate_zone: CLIMATE_ZONES[0] })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }))
  const next = safeNext(params.get('next'))
  if (user && !busy) return <Navigate to={next} replace />

  const submit = async (e) => {
    e.preventDefault()
    if (form.password.length < 8) return setError('Your password needs at least 8 characters.')
    setBusy(true)
    setError('')
    try {
      await signup(form)
      toast('success', `Welcome, ${form.full_name.split(' ')[0]}! 🌱`, 'Let’s plant your first idea.')
      navigate(next, { replace: true })
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <Shell title="Create your account" subtitle="Free forever. Your designs are saved securely." footer={<>Already have an account? <Link to="/login" className="font-semibold text-leaf hover:underline">Log in</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        <Field icon={UserRound} label="Your name" id="full_name">
          <input id="full_name" className="input pl-10" value={form.full_name} onChange={set('full_name')} autoComplete="name" required maxLength={80} />
        </Field>
        <Field icon={Mail} label="Email" id="email">
          <input id="email" type="email" className="input pl-10" value={form.email} onChange={set('email')} autoComplete="email" required />
        </Field>
        <Field icon={Lock} label="Password (8+ characters)" id="password">
          <PasswordInput id="password" value={form.password} onChange={set('password')} autoComplete="new-password" />
        </Field>
        <div>
          <span className="label">Units</span>
          <Segmented name="signup-unit" value={form.unit_preference} onChange={set('unit_preference')} options={[{ value: 'metric', label: 'Metric (m)' }, { value: 'imperial', label: 'Imperial (ft)' }]} />
        </div>
        <div>
          <label htmlFor="climate" className="label">Climate zone</label>
          <select id="climate" className="input" value={form.climate_zone} onChange={set('climate_zone')}>
            {CLIMATE_ZONES.map((z) => <option key={z} value={z} className="bg-surface">{z}</option>)}
          </select>
        </div>
        <ErrorBox error={error} />
        <button className="btn-primary w-full py-3 text-base" disabled={busy}>
          {busy ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />} {busy ? 'Creating your account…' : 'Create account'}
        </button>
      </form>
    </Shell>
  )
}
