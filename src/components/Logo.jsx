import { Link } from 'react-router-dom'

export function LogoMark({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="gc-logo-g" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#22c55e" />
          <stop offset="1" stopColor="#facc15" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill="url(#gc-logo-g)" opacity="0.16" />
      <path d="M32 54V30" stroke="url(#gc-logo-g)" strokeWidth="5" strokeLinecap="round" />
      <path d="M32 34c0-11 8-19 20-19 0 12-8 19-20 19z" fill="url(#gc-logo-g)" />
      <path d="M32 40c0-9-7-15-17-15 0 10 7 15 17 15z" fill="#22c55e" />
    </svg>
  )
}

export default function Logo({ to = '/', size = 'md' }) {
  const text = size === 'lg' ? 'text-3xl' : size === 'sm' ? 'text-lg' : 'text-xl'
  return (
    <Link to={to} className="group inline-flex items-center gap-2.5" aria-label="GardenCraft home">
      <span className="transition-transform duration-500 group-hover:rotate-[-8deg] group-hover:scale-110">
        <LogoMark size={size === 'lg' ? 40 : 32} />
      </span>
      <span className={`font-display font-extrabold tracking-tight ${text} text-gradient`}>GardenCraft</span>
    </Link>
  )
}
