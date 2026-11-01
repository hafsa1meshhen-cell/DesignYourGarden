import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CalendarRange, ClipboardList, DatabaseZap, LayoutGrid, Leaf, LogOut, Moon, PenTool, Sun, UserRound } from 'lucide-react'
import Logo from './Logo'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { tipOfTheDay } from '../data/content'

export const NAV = [
  { to: '/gardens', label: 'My Gardens', short: 'Gardens', icon: LayoutGrid },
  { to: '/designer', label: 'Designer', short: 'Design', icon: PenTool },
  { to: '/plants', label: 'Plant Library', short: 'Plants', icon: Leaf },
  { to: '/seasons', label: 'Seasonal Preview', short: 'Seasons', icon: CalendarRange },
  { to: '/plan', label: 'Build Plan', short: 'Plan', icon: ClipboardList },
  { to: '/profile', label: 'Profile', short: 'Profile', icon: UserRound },
]

export function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useApp()
  const dark = theme === 'dark'
  return (
    <button onClick={toggleTheme} className={`icon-btn ${className}`} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} title={dark ? 'Light mode' : 'Dark mode'}>
      <motion.span key={theme} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} transition={{ duration: 0.35 }}>
        {dark ? <Sun size={18} /> : <Moon size={18} />}
      </motion.span>
    </button>
  )
}

export function UserMenu() {
  const { user, logout } = useAuth()
  const { toast } = useApp()
  const navigate = useNavigate()
  if (!user) return null
  const initials = user.full_name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')
  const out = async () => {
    navigate('/', { replace: true })
    await logout()
    toast('success', 'Logged out', 'See you in the garden soon.')
  }
  return (
    <div className="flex items-center gap-2">
      <NavLink to="/profile" className="flex min-h-[44px] items-center gap-2 rounded-xl pr-1 hover:bg-line/5" title="Your profile">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand font-display text-sm font-bold text-forest-900">{initials}</span>
        <span className="hidden max-w-[10rem] truncate text-sm font-semibold sm:block">{user.full_name}</span>
      </NavLink>
      <button className="icon-btn" onClick={out} aria-label="Log out" title="Log out">
        <LogOut size={18} />
      </button>
    </div>
  )
}

export function DbBanner() {
  const { catalog, reloadCatalog } = useApp()
  if (!catalog.error) return null
  return (
    <div role="alert" className="mx-auto mb-4 flex max-w-7xl flex-col gap-3 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm sm:flex-row sm:items-center">
      <DatabaseZap size={20} className="shrink-0 text-red-400" />
      <p className="flex-1"><strong>The garden database isn’t available.</strong> {catalog.error}</p>
      <button className="btn-ghost !min-h-[38px] !py-1.5" onClick={reloadCatalog}>Try again</button>
    </div>
  )
}

function Sidebar() {
  return (
    <aside className="glass fixed inset-y-3 left-3 z-30 hidden w-64 flex-col rounded-3xl p-4 lg:flex">
      <div className="px-2 pb-6 pt-2">
        <Logo to="/" />
      </div>
      <nav className="flex flex-1 flex-col gap-1" aria-label="Main">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `group relative flex min-h-[44px] items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-semibold transition-colors ${isActive ? 'text-ink' : 'text-muted hover:bg-line/5 hover:text-ink'}`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && <motion.span layoutId="side-active" className="absolute inset-0 rounded-2xl border border-leaf/30 bg-leaf/15 shadow-glow" transition={{ type: 'spring', damping: 28, stiffness: 320 }} />}
                <Icon size={19} className={`relative transition-colors ${isActive ? 'text-leaf' : ''}`} />
                <span className="relative">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="rounded-2xl border border-leaf/20 bg-gradient-to-br from-leaf/15 to-sun/10 p-4">
        <p className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-leaf">
          <Leaf size={13} /> Tip of the day
        </p>
        <p className="text-[13px] leading-relaxed text-ink/85">{tipOfTheDay()}</p>
      </div>
    </aside>
  )
}

function BottomNav() {
  return (
    <nav className="glass-strong pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line/10 lg:hidden" aria-label="Main">
      <div className="mx-auto grid max-w-xl grid-cols-6 px-1 pt-1.5">
        {NAV.map(({ to, short, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `relative flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-xl text-[10.5px] font-semibold ${isActive ? 'text-leaf' : 'text-muted'}`}>
            {({ isActive }) => (
              <>
                {isActive && <motion.span layoutId="bottom-active" className="absolute inset-x-1.5 inset-y-0.5 rounded-xl bg-leaf/15" transition={{ type: 'spring', damping: 28, stiffness: 320 }} />}
                <Icon size={21} className="relative" />
                <span className="relative">{short}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

function Topbar() {
  return (
    <header className="sticky top-0 z-30 px-3 pt-3 lg:pl-[17.5rem]">
      <div className="glass flex h-14 items-center justify-between gap-3 rounded-2xl px-3 sm:px-4">
        <div className="lg:hidden">
          <Logo to="/" size="sm" />
        </div>
        <p className="hidden truncate text-sm text-muted lg:block">
          <WelcomeLine />
        </p>
        <div className="flex items-center gap-2">
          <UserMenu />
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}

function WelcomeLine() {
  const { user } = useAuth()
  return (
    <>
      <span className="font-semibold text-ink">Welcome back{user ? `, ${user.full_name.split(' ')[0]}` : ''}.</span> Let’s grow something beautiful in GardenCraft.
    </>
  )
}

export function Footer() {
  return (
    <footer className="mt-16 border-t border-line/10 py-8 text-center text-sm text-muted">
      <p>
        © {new Date().getFullYear()} <span className="font-display font-bold text-gradient">GardenCraft</span>. Design it here. Grow it for real.
      </p>
    </footer>
  )
}

export default function Layout() {
  const { pathname } = useLocation()
  const fullBleed = pathname.startsWith('/designer')
  return (
    <div className="min-h-dvh">
      <Sidebar />
      <Topbar />
      <main className={`px-3 pt-4 lg:pl-[17.5rem] lg:pr-4 ${fullBleed ? 'pb-[76px] lg:pb-4' : 'pb-28 lg:pb-6'}`}>
        <div className={fullBleed ? '' : 'mx-auto max-w-7xl sm:px-2'}>
          <DbBanner />
          <Outlet />
          {!fullBleed && <Footer />}
        </div>
      </main>
      <BottomNav />
    </div>
  )
}
