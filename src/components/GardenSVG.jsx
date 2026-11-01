import { memo, useId } from 'react'
import { fmtLen, growthFactor, sortByZ } from '../lib/garden'
import { materialStyle, plantLook } from '../lib/styles'

export function gardenOutline(garden) {
  const { width: W, length: L } = garden
  if (garden.shape === 'L-shape') return `M0 0 H${W * 0.55} V${L * 0.45} H${W} V${L} H0 Z`
  return `M0 0 H${W} V${L} H0 Z`
}

// ---------- deterministic helpers ----------
const rnd = (n) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return s - Math.floor(s)
}
const hashStr = (str) => {
  let h = 0
  for (const c of String(str)) h = (h * 31 + c.charCodeAt(0)) | 0
  return Math.abs(h % 10000)
}
const f = (n) => +n.toFixed(3)

function mix(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16)
  const ch = (p, s) => (p >> s) & 255
  const m = (s) => Math.round(ch(pa, s) + (ch(pb, s) - ch(pa, s)) * t)
  return `#${((1 << 24) | (m(16) << 16) | (m(8) << 8) | m(0)).toString(16).slice(1)}`
}
const soften = (hex) => mix(hex, '#5f6650', 0.22)
const darker = (hex, t = 0.3) => mix(hex, '#0b1a10', t)
const lighter = (hex, t = 0.3) => mix(hex, '#f4f1e4', t)

// Scalloped, organic outline used for canopies and plant mounds.
function lobed(r, seed, lobes = 9, depth = 0.12) {
  const off = rnd(seed) * Math.PI
  const pts = Array.from({ length: lobes }, (_, i) => {
    const a = off + (i / lobes) * Math.PI * 2
    return [a, r * (1 - depth * (0.5 + 0.5 * rnd(seed + i * 3.1)))]
  })
  let d = ''
  pts.forEach(([a0, r0], i) => {
    const [a1raw, r1] = pts[(i + 1) % lobes]
    const a1 = i === lobes - 1 ? a1raw + Math.PI * 2 : a1raw
    const mid = (a0 + a1) / 2
    const bulge = r * (1 + depth * 0.55)
    if (i === 0) d += `M${f(Math.cos(a0) * r0)} ${f(Math.sin(a0) * r0)}`
    d += ` Q${f(Math.cos(mid) * bulge)} ${f(Math.sin(mid) * bulge)} ${f(Math.cos(a1) * r1)} ${f(Math.sin(a1) * r1)}`
  })
  return d + 'Z'
}

function scatter(n, radius, seed) {
  return Array.from({ length: n }, (_, i) => {
    const a = rnd(seed + i * 7.7) * Math.PI * 2
    const d = Math.sqrt(rnd(seed + i * 3.3)) * radius
    return [f(Math.cos(a) * d), f(Math.sin(a) * d), rnd(seed + i * 1.9)]
  })
}

const T = 'fill 0.9s ease, opacity 0.9s ease, stroke 0.9s ease'
const GROUND = { Spring: '#5a4a36', Summer: '#55452f', Autumn: '#57432d', Winter: '#6f6a60' }

// ---------- plants ----------
function Plant({ item, p, season, year, uid }) {
  const look = plantLook(p, season)
  const R = Math.min(item.width, item.height) / 2
  const k = Math.max(0.12, growthFactor(p, year) * look.size)
  const seed = hashStr(item.id) + p.id
  const fol = soften(look.foliage)
  const bloom = look.bloom ? mix(look.bloom, '#ffffff', 0.08) : null
  const woody = p.type === 'Trees' || p.type === 'Shrubs'
  const isTree = p.type === 'Trees'
  const fill = (c) => ({ fill: c, transition: T })

  let body
  if (look.bare) {
    body = (
      <>
        <path d={lobed(R * 0.95, seed, 10, 0.1)} fill="none" stroke={look.foliage} strokeOpacity={0.45} strokeWidth={R * 0.03} strokeDasharray={`${f(R * 0.08)} ${f(R * 0.08)}`} />
        {Array.from({ length: 7 }).map((_, i) => {
          const a = (i / 7) * Math.PI * 2 + rnd(seed + i)
          const l = R * (0.6 + rnd(seed + i * 2) * 0.3)
          const bx = Math.cos(a) * l * 0.55, by = Math.sin(a) * l * 0.55
          return (
            <g key={i} stroke="#6b5440" strokeLinecap="round">
              <line x1={0} y1={0} x2={f(Math.cos(a) * l)} y2={f(Math.sin(a) * l)} strokeWidth={R * 0.045} />
              <line x1={f(bx)} y1={f(by)} x2={f(bx + Math.cos(a + 0.7) * l * 0.35)} y2={f(by + Math.sin(a + 0.7) * l * 0.35)} strokeWidth={R * 0.025} />
            </g>
          )
        })}
      </>
    )
  } else if (p.type === 'Grasses') {
    body = (
      <>
        <circle r={R * 0.45} style={fill(darker(fol, 0.15))} opacity={0.6} />
        {Array.from({ length: 30 }).map((_, i) => {
          const a = (i / 30) * Math.PI * 2 + rnd(seed + i) * 0.2
          const l = R * (0.7 + rnd(seed + i * 4) * 0.3)
          return <line key={i} x1={0} y1={0} x2={f(Math.cos(a) * l)} y2={f(Math.sin(a) * l)} strokeWidth={R * 0.04} strokeLinecap="round" style={{ stroke: i % 3 ? fol : lighter(fol, 0.35), transition: T }} />
        })}
        {bloom && scatter(10, R * 0.85, seed).map(([x, y], i) => <circle key={i} cx={x} cy={y} r={R * 0.07} style={fill(lighter(bloom, 0.2))} opacity={0.9} />)}
      </>
    )
  } else {
    const lobes = isTree ? 10 : woody ? 12 : 8
    const depth = isTree ? 0.11 : woody ? 0.09 : 0.2
    const outline = lobed(R, seed, lobes, depth)
    body = (
      <>
        <path d={outline} style={fill(fol)} stroke={darker(fol, 0.35)} strokeOpacity={0.6} strokeWidth={R * 0.025} />
        {woody && <path d={lobed(R * 0.5, seed + 9, 7, 0.2)} transform={`translate(${f(R * 0.22)} ${f(R * 0.24)})`} fill="#000" opacity={0.1} />}
        <path d={lobed(R * 0.62, seed + 5, 7, 0.18)} transform={`translate(${f(-R * 0.17)} ${f(-R * 0.19)})`} fill="#fffbe6" opacity={0.13} />
        <path d={lobed(R * 0.3, seed + 7, 6, 0.2)} transform={`translate(${f(-R * 0.3)} ${f(-R * 0.32)})`} fill="#fffbe6" opacity={0.1} />
        {p.type === 'Herbs' && scatter(14, R * 0.75, seed + 2).map(([x, y], i) => <circle key={i} cx={x} cy={y} r={R * 0.06} fill={lighter(fol, 0.45)} opacity={0.55} />)}
        {bloom &&
          scatter(woody ? 22 : 11, R * (woody ? 0.82 : 0.68), seed + 1).map(([x, y, t], i) => (
            <circle key={i} cx={x} cy={y} r={R * (woody ? 0.055 : 0.11) * (0.8 + t * 0.4)} style={fill(t > 0.7 ? lighter(bloom, 0.25) : bloom)} opacity={0.95} />
          ))}
        {isTree && <circle r={Math.max(0.025, R * 0.05)} fill="#3d2f22" opacity={0.55} />}
      </>
    )
  }

  const shadowR = look.bare ? 0 : R
  return (
    <g style={{ opacity: look.opacity, transition: T }}>
      {shadowR > 0 && (
        <g style={{ transform: `scale(${k})`, transition: 'transform 0.9s cubic-bezier(.22,1,.36,1)' }}>
          <path d={lobed(R, seed, 9, 0.1)} transform={`translate(${f(R * (isTree ? 0.2 : 0.12))} ${f(R * (isTree ? 0.24 : 0.14))})`} fill="#0a140c" opacity={isTree ? 0.38 : 0.28} filter={`url(#blur-${uid})`} />
        </g>
      )}
      <g style={{ transform: `scale(${k})`, transition: 'transform 0.9s cubic-bezier(.22,1,.36,1)' }}>{body}</g>
    </g>
  )
}

// ---------- materials ----------
function Flecks({ w, h, seed, colors, density = 7, size = 0.025 }) {
  const n = Math.min(160, Math.round(w * h * density))
  return Array.from({ length: n }).map((_, i) => (
    <circle key={i} cx={f(-w / 2 + rnd(seed + i * 1.3) * w)} cy={f(-h / 2 + rnd(seed + i * 2.7) * h)} r={size * (0.6 + rnd(seed + i) * 0.8)} fill={colors[i % colors.length]} opacity={0.55} />
  ))
}

function Paving({ w, h, fill, joint, seed }) {
  const rowH = 0.6
  const slabs = []
  let y = -h / 2, row = 0
  while (y < h / 2 - 0.01) {
    const hh = Math.min(rowH, h / 2 - y)
    let x = -w / 2, k = 0
    while (x < w / 2 - 0.01) {
      const want = [0.6, 0.9, 0.45, 0.6][Math.floor(rnd(seed + row * 17 + k) * 4)]
      const ww = Math.min(want, w / 2 - x)
      const tone = (rnd(seed + row * 31 + k * 7) - 0.5) * 0.14
      slabs.push(<rect key={`${row}-${k}`} x={f(x)} y={f(y)} width={f(ww)} height={f(hh)} fill={tone > 0 ? mix(fill, '#ffffff', tone) : mix(fill, '#3b2f20', -tone)} stroke={joint} strokeWidth={0.02} />)
      x += ww
      k++
    }
    y += hh
    row++
  }
  return slabs
}

function Material({ item, m, season, uid }) {
  const s = materialStyle(m, season)
  const w = item.width, h = item.height
  const seed = hashStr(item.id)
  const shadow = (rx = 0.05, dx = 0.06) => <rect x={-w / 2 + dx} y={-h / 2 + dx * 1.3} width={w} height={h} rx={rx} fill="#000" opacity={0.3} filter={`url(#blur-${uid})`} />

  switch (m.category) {
    case 'Lawn': {
      const stripes = []
      for (let x = 0, i = 0; x < w; x += 0.8, i++) if (i % 2) stripes.push(<rect key={i} x={f(-w / 2 + x)} y={-h / 2} width={f(Math.min(0.8, w - x))} height={h} fill="#fff" opacity={0.045} />)
      const meadow = m.name === 'Wildflower Meadow'
      return (
        <>
          <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={0.12} style={{ fill: soften(s.fill), transition: T }} />
          {stripes}
          {meadow && <Flecks w={w} h={h} seed={seed} colors={['#f9a8d4', '#fde68a', '#ffffff', '#c4b5fd']} density={10} size={0.035} />}
          <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={0.12} fill="none" stroke={darker(s.fill, 0.35)} strokeOpacity={0.5} strokeWidth={0.04} />
        </>
      )
    }
    case 'Beds': {
      const raised = m.name.startsWith('Raised')
      return (
        <>
          {raised && shadow(0.1)}
          <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={raised ? 0.04 : 0.3} fill="#4a3727" />
          <Flecks w={w} h={h} seed={seed} colors={['#2f2218', '#6b5038', '#7a6047']} density={9} size={0.03} />
          <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={raised ? 0.04 : 0.3} fill="none" stroke={raised ? '#9a7650' : '#2c2016'} strokeWidth={raised ? 0.12 : 0.04} />
        </>
      )
    }
    case 'Paths': {
      if (m.name === 'Stepping Stones') {
        const along = h >= w
        const len = Math.max(w, h), size = Math.min(w, h) * 0.85
        const stones = []
        for (let t = size / 2 + 0.1, i = 0; t < len - size / 3; t += size + 0.22, i++) {
          const cx = along ? (rnd(seed + i) - 0.5) * 0.12 : -w / 2 + t
          const cy = along ? -h / 2 + t : (rnd(seed + i) - 0.5) * 0.12
          const pts = Array.from({ length: 7 }, (_, j) => {
            const a = (j / 7) * Math.PI * 2
            const r = (size / 2) * (0.82 + rnd(seed + i * 9 + j) * 0.18)
            return `${f(cx + Math.cos(a) * r)},${f(cy + Math.sin(a) * r * 0.9)}`
          }).join(' ')
          stones.push(
            <g key={i}>
              <polygon points={pts} transform="translate(0.04 0.05)" fill="#000" opacity={0.3} filter={`url(#blur-${uid})`} />
              <polygon points={pts} fill={mix('#bdb7aa', '#ffffff', rnd(seed + i * 5) * 0.12)} stroke="#8a8476" strokeWidth={0.02} />
            </g>,
          )
        }
        return stones
      }
      const brick = m.name === 'Brick Path'
      const base = { 'Gravel Path': '#cfc19c', 'Bark Chip Path': '#7a5232', 'Brick Path': '#a5533c' }[m.name] || s.fill
      return (
        <>
          <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={0.03} fill={base} />
          {brick ? (
            <Paving w={w} h={h} fill={base} joint="#e2d6c6" seed={seed} />
          ) : (
            <Flecks w={w} h={h} seed={seed} colors={m.name === 'Gravel Path' ? ['#a89776', '#e9dfc4', '#8e7f63'] : ['#5a3a20', '#9c6b41']} density={22} size={0.022} />
          )}
          <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={0.03} fill="none" stroke={darker(base, 0.3)} strokeWidth={0.035} />
        </>
      )
    }
    case 'Patio': {
      if (m.name === 'Composite Decking') {
        const along = w >= h
        const boards = []
        for (let t = 0, i = 0; t < (along ? h : w); t += 0.15, i++)
          boards.push(along
            ? <rect key={i} x={-w / 2} y={f(-h / 2 + t)} width={w} height={0.14} fill={mix('#8a6a4f', '#3b2a1c', rnd(seed + i) * 0.15)} />
            : <rect key={i} y={-h / 2} x={f(-w / 2 + t)} height={h} width={0.14} fill={mix('#8a6a4f', '#3b2a1c', rnd(seed + i) * 0.15)} />)
        return (
          <>
            {shadow(0.02, 0.04)}
            <rect x={-w / 2} y={-h / 2} width={w} height={h} fill="#4a3727" />
            {boards}
          </>
        )
      }
      const base = m.name === 'Porcelain Tiles' ? '#c9ccc8' : '#dcc39a'
      return (
        <>
          <Paving w={w} h={h} fill={base} joint={m.name === 'Porcelain Tiles' ? '#9ea29e' : '#b39871'} seed={seed} />
          <rect x={-w / 2} y={-h / 2} width={w} height={h} fill="none" stroke={darker(base, 0.35)} strokeWidth={0.04} />
        </>
      )
    }
    case 'Fencing': {
      const along = w >= h
      const len = Math.max(w, h)
      const posts = []
      for (let t = 0; t <= len + 0.01; t += 1.8)
        posts.push(<rect key={t} x={f(along ? -w / 2 + t - 0.06 : -0.09)} y={f(along ? -0.09 : -h / 2 + t - 0.06)} width={along ? 0.12 : 0.18} height={along ? 0.18 : 0.12} fill="#2f2419" />)
      return (
        <>
          {shadow(0.02, 0.05)}
          <rect x={-w / 2} y={-h / 2} width={w} height={h} fill={s.fill} stroke={s.stroke} strokeWidth={0.02} />
          {posts}
        </>
      )
    }
    case 'Water Features': {
      const frozen = season === 'Winter' && m.name !== 'Bird Bath'
      const r = Math.min(w, h) / 2
      const coping = Math.min(0.14, r * 0.25)
      const pond = m.name === 'Wildlife Pond'
      return (
        <>
          {shadow(r, 0.06)}
          <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={pond ? Math.min(r, 0.7) : r} fill="#a59d8c" stroke="#7d7566" strokeWidth={0.02} />
          <rect x={-w / 2 + coping} y={-h / 2 + coping} width={w - coping * 2} height={h - coping * 2} rx={pond ? Math.max(0, Math.min(r, 0.7) - coping) : r - coping} fill={frozen ? '#d6ecf5' : `url(#water-${uid})`} style={{ transition: T }} />
          {!frozen && (
            <g fill="none" stroke="#ffffff" strokeOpacity={0.35} strokeWidth={0.02}>
              <ellipse cx={f(w * 0.08)} cy={f(h * 0.06)} rx={f(w * 0.16)} ry={f(h * 0.1)} />
              <ellipse cx={f(w * 0.08)} cy={f(h * 0.06)} rx={f(w * 0.28)} ry={f(h * 0.18)} strokeOpacity={0.18} />
            </g>
          )}
          {pond && !frozen && [[-0.28, -0.18], [-0.14, 0.2], [0.3, -0.1]].map(([px, py], i) => (
            <g key={i} transform={`translate(${f(px * w)} ${f(py * h)})`}>
              <circle r={0.13} fill="#4f7a3a" />
              <path d="M0 0 L0.13 -0.03 L0.13 0.03 Z" fill={`url(#water-${uid})`} />
              {i === 1 && <circle r={0.05} cx={-0.03} cy={-0.03} fill="#fbcfe8" />}
            </g>
          ))}
          {m.name === 'Bubble Fountain' && <circle r={r * 0.18} fill="#ffffff" opacity={0.7} />}
        </>
      )
    }
    case 'Seating': {
      if (m.name === 'Bistro Set') {
        const r = Math.min(w, h) * 0.22
        return (
          <>
            {[[-1, -1], [1, 1]].map(([sx, sy], i) => (
              <rect key={i} x={f(sx * r * 1.55 - r * 0.6)} y={f(sy * r * 1.55 - r * 0.6)} width={f(r * 1.2)} height={f(r * 1.2)} rx={0.06} fill="#2f3a46" stroke="#1a222b" strokeWidth={0.02} />
            ))}
            <circle r={r * 1.2} cx={0.05} cy={0.06} fill="#000" opacity={0.3} filter={`url(#blur-${uid})`} />
            <circle r={r * 1.2} fill="#3b4856" stroke="#1a222b" strokeWidth={0.025} />
            <circle r={r * 0.6} fill="none" stroke="#ffffff" strokeOpacity={0.15} strokeWidth={0.02} />
          </>
        )
      }
      const sofa = m.name === 'Outdoor Sofa Set'
      const base = sofa ? '#9b948a' : '#9a6b3c'
      const along = w >= h
      const slats = []
      for (let t = 0.08, i = 0; t < (along ? h : w) - 0.04; t += 0.12, i++)
        slats.push(along
          ? <line key={i} x1={-w / 2 + 0.04} x2={w / 2 - 0.04} y1={f(-h / 2 + t)} y2={f(-h / 2 + t)} stroke={darker(base, 0.35)} strokeWidth={0.015} />
          : <line key={i} y1={-h / 2 + 0.04} y2={h / 2 - 0.04} x1={f(-w / 2 + t)} x2={f(-w / 2 + t)} stroke={darker(base, 0.35)} strokeWidth={0.015} />)
      return (
        <>
          {shadow(0.06, 0.07)}
          <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={sofa ? 0.12 : 0.04} fill={base} stroke={darker(base, 0.4)} strokeWidth={0.025} />
          {!sofa && slats}
          {sofa && <rect x={-w / 2 + 0.18} y={-h / 2 + 0.18} width={w - 0.36} height={h - 0.36} rx={0.08} fill={lighter(base, 0.25)} />}
        </>
      )
    }
    case 'Lighting':
      return (
        <>
          <circle r={Math.max(w, h) * 2.4} fill={`url(#glow-${uid})`} />
          <circle r={Math.max(w, h) / 2.2} fill="#fef3c7" stroke="#a16207" strokeWidth={0.02} />
        </>
      )
    default:
      return <rect x={-w / 2} y={-h / 2} width={w} height={h} fill={s.fill} />
  }
}

// ---------- plan annotations ----------
function Annotations({ W, L, u, unit, color }) {
  const fs = 0.28 * u
  const tick = 0.12 * u
  const dimY = L + 0.5 * u
  const dimX = -0.5 * u
  const sbY = L + 1.15 * u
  const step = W > 14 ? 5 : 1
  return (
    <g fill={color} stroke={color} fontFamily="Inter, Arial, sans-serif" fontWeight={600}>
      <g strokeWidth={0.02 * u} fill="none" opacity={0.7}>
        <line x1={0} y1={dimY} x2={W} y2={dimY} />
        <line x1={-tick} y1={dimY + tick} x2={tick} y2={dimY - tick} />
        <line x1={W - tick} y1={dimY + tick} x2={W + tick} y2={dimY - tick} />
        <line x1={0} y1={L + 0.15 * u} x2={0} y2={dimY + 0.12 * u} strokeOpacity={0.5} />
        <line x1={W} y1={L + 0.15 * u} x2={W} y2={dimY + 0.12 * u} strokeOpacity={0.5} />
        <line x1={dimX} y1={0} x2={dimX} y2={L} />
        <line x1={dimX - tick} y1={tick} x2={dimX + tick} y2={-tick} />
        <line x1={dimX - tick} y1={L + tick} x2={dimX + tick} y2={L - tick} />
        <line x1={-0.15 * u} y1={0} x2={dimX - 0.12 * u} y2={0} strokeOpacity={0.5} />
        <line x1={-0.15 * u} y1={L} x2={dimX - 0.12 * u} y2={L} strokeOpacity={0.5} />
      </g>
      <text x={W / 2} y={dimY - 0.12 * u} fontSize={fs} textAnchor="middle" stroke="none">{fmtLen(W, unit)}</text>
      <text x={dimX - 0.12 * u} y={L / 2} fontSize={fs} textAnchor="middle" stroke="none" transform={`rotate(-90 ${dimX - 0.12 * u} ${L / 2})`}>{fmtLen(L, unit)}</text>
      {/* scale bar */}
      <g stroke="none">
        {[0, 1].map((i) => <rect key={i} x={i * step} y={sbY} width={step} height={0.12 * u} fill={i % 2 ? 'none' : color} stroke={color} strokeWidth={0.02 * u} />)}
        {[0, 1, 2].map((i) => <text key={i} x={i * step} y={sbY + 0.45 * u} fontSize={fs * 0.8} textAnchor="middle" opacity={0.85}>{i * step}</text>)}
        <text x={2 * step + 0.25 * u} y={sbY + 0.45 * u} fontSize={fs * 0.8} opacity={0.85}>m</text>
        <text x={2 * step + 0.7 * u} y={sbY + 0.12 * u} fontSize={fs * 0.75} opacity={0.6}>SCALE 1:100</text>
      </g>
      {/* north arrow */}
      <g transform={`translate(${W - 0.35 * u} ${sbY + 0.05 * u})`} stroke="none">
        <circle r={0.32 * u} fill="none" stroke={color} strokeWidth={0.02 * u} opacity={0.6} />
        <path d={`M0 ${-0.26 * u} L${0.12 * u} ${0.14 * u} L0 ${0.05 * u} Z`} />
        <path d={`M0 ${-0.26 * u} L${-0.12 * u} ${0.14 * u} L0 ${0.05 * u} Z`} opacity={0.45} />
        <text y={-0.42 * u} fontSize={fs * 0.8} textAnchor="middle">N</text>
      </g>
    </g>
  )
}

function GardenSVG({ garden, items = [], plantsById, materialsById, season = 'Summer', year = 5, showGrid = true, className = '', annotate = false, callouts = [], unit = 'metric', annotationColor = '#d9efe0' }) {
  const uid = useId().replace(/:/g, '')
  const { width: W, length: L } = garden
  const u = Math.max(W, L) / 10
  const pad = annotate ? { l: 1.1 * u, r: 0.35 * u, t: 0.35 * u, b: 1.8 * u } : { l: u * 0.4, r: u * 0.4, t: u * 0.4, b: u * 0.4 }
  const outline = gardenOutline(garden)
  const grid = []
  if (showGrid) {
    for (let x = 1; x < W; x++) grid.push(<line key={`gx${x}`} x1={x} x2={x} y1={0} y2={L} stroke="#fff" strokeOpacity={0.06} strokeWidth={0.015} />)
    for (let y = 1; y < L; y++) grid.push(<line key={`gy${y}`} y1={y} y2={y} x1={0} x2={W} stroke="#fff" strokeOpacity={0.06} strokeWidth={0.015} />)
  }
  const byItem = Object.fromEntries(items.map((i) => [i.id, i]))
  return (
    <svg viewBox={`${f(-pad.l)} ${f(-pad.t)} ${f(W + pad.l + pad.r)} ${f(L + pad.t + pad.b)}`} className={className} preserveAspectRatio="xMidYMid meet" role="img" aria-label={`Top-down plan of ${garden.name}`}>
      <defs>
        <clipPath id={`clip-${uid}`}>
          <path d={outline} />
        </clipPath>
        <filter id={`blur-${uid}`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation={0.06 * u} />
        </filter>
        <linearGradient id={`water-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5fb3cf" />
          <stop offset="1" stopColor="#1f6f8b" />
        </linearGradient>
        <radialGradient id={`glow-${uid}`}>
          <stop offset="0" stopColor="#fde68a" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fde68a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path d={outline} style={{ fill: GROUND[season], transition: T }} />
      <g clipPath={`url(#clip-${uid})`}>
        <path d={outline} fill="none" stroke="#000" strokeOpacity={0.25} strokeWidth={0.3 * u} filter={`url(#blur-${uid})`} />
        {grid}
        {sortByZ(items).map((it) => {
          const def = it.item_type === 'plant' ? plantsById[it.plant_id] : materialsById[it.material_id]
          if (!def) return null
          return (
            <g key={it.id} transform={`translate(${it.x} ${it.y}) rotate(${it.rotation || 0})`}>
              {it.item_type === 'plant' ? <Plant item={it} p={def} season={season} year={year} uid={uid} /> : <Material item={it} m={def} season={season} uid={uid} />}
            </g>
          )
        })}
        {season === 'Winter' && <path d={outline} fill="#eef6ff" opacity={0.14} />}
      </g>
      <path d={outline} fill="none" stroke={annotate ? annotationColor : '#4ade80'} strokeOpacity={annotate ? 0.55 : 0.5} strokeWidth={0.04 * u} />
      {callouts.map(({ id, n }) => {
        const it = byItem[id]
        if (!it) return null
        return (
          <g key={id} transform={`translate(${it.x} ${it.y})`}>
            <circle r={0.2 * u} fill="#ffffff" stroke="#14532d" strokeWidth={0.03 * u} />
            <text y={0.09 * u} fontSize={0.24 * u} fontWeight={700} textAnchor="middle" fill="#14532d" fontFamily="Inter, Arial, sans-serif">{n}</text>
          </g>
        )
      })}
      {annotate && <Annotations W={W} L={L} u={u} unit={unit} color={annotationColor} />}
    </svg>
  )
}

export default memo(GardenSVG)
