import { memo, useEffect, useRef } from 'react'
import Konva from 'konva'
import { Circle, Group, Rect, Shape } from 'react-konva'
import { materialStyle, plantLook } from '../../lib/styles'

export const PX = 50 // pixels per metre at zoom 1

function hash(n) {
  const s = Math.sin(n * 12.9898) * 43758.5453
  return s - Math.floor(s)
}

function drawPattern(ctx, w, h, style, seed) {
  const c = ctx._context
  c.save()
  c.beginPath()
  c.rect(-w / 2, -h / 2, w, h)
  c.clip()
  c.strokeStyle = style.stroke
  c.fillStyle = style.stroke
  switch (style.pattern) {
    case 'stripes':
      c.fillStyle = 'rgba(255,255,255,0.07)'
      for (let x = 0; x < w; x += PX) c.fillRect(-w / 2 + x, -h / 2, PX / 2, h)
      break
    case 'paving':
      c.globalAlpha = 0.55
      c.lineWidth = 1
      for (let x = 0.6 * PX; x < w; x += 0.6 * PX) { c.beginPath(); c.moveTo(-w / 2 + x, -h / 2); c.lineTo(-w / 2 + x, h / 2); c.stroke() }
      for (let y = 0.6 * PX; y < h; y += 0.6 * PX) { c.beginPath(); c.moveTo(-w / 2, -h / 2 + y); c.lineTo(w / 2, -h / 2 + y); c.stroke() }
      break
    case 'boards': {
      c.globalAlpha = 0.6
      c.lineWidth = 1
      const along = w >= h
      const len = along ? h : w
      for (let k = 0.15 * PX; k < len; k += 0.15 * PX) {
        c.beginPath()
        if (along) { c.moveTo(-w / 2, -h / 2 + k); c.lineTo(w / 2, -h / 2 + k) } else { c.moveTo(-w / 2 + k, -h / 2); c.lineTo(-w / 2 + k, h / 2) }
        c.stroke()
      }
      break
    }
    case 'gravel':
    case 'soil': {
      c.globalAlpha = 0.45
      const n = Math.min(400, Math.round((w * h) / 90))
      for (let k = 0; k < n; k++) {
        c.beginPath()
        c.arc(-w / 2 + hash(k + seed) * w, -h / 2 + hash(k * 7.1 + seed) * h, 1.6, 0, Math.PI * 2)
        c.fill()
      }
      break
    }
    case 'stones': {
      const along = h >= w
      const len = Math.max(w, h)
      const size = Math.min(w, h) * 0.7
      c.fillStyle = '#9ca3af'
      for (let k = size / 2 + 5; k < len; k += size + 10) {
        c.beginPath()
        c.ellipse(along ? 0 : -w / 2 + k, along ? -h / 2 + k : 0, size / 2, size / 2.4, 0, 0, Math.PI * 2)
        c.fill()
        c.stroke()
      }
      break
    }
    case 'posts': {
      const along = w >= h
      const len = Math.max(w, h)
      for (let k = 0; k <= len + 1; k += 1.8 * PX) {
        if (along) c.fillRect(-w / 2 + k - 3, -4, 6, 8)
        else c.fillRect(-4, -h / 2 + k - 3, 8, 6)
      }
      break
    }
    case 'water':
      c.fillStyle = 'rgba(255,255,255,0.35)'
      c.beginPath()
      c.ellipse(-w * 0.15, -h * 0.15, w * 0.2, h * 0.12, 0, 0, Math.PI * 2)
      c.fill()
      break
    default:
  }
  c.restore()
}

function MaterialShape({ item, m }) {
  const s = materialStyle(m)
  const w = item.width * PX
  const h = item.height * PX
  const r = s.round ? Math.min(w, h) / 2 : Math.min(s.radius * PX, w / 2, h / 2)
  const stones = s.pattern === 'stones'
  return (
    <>
      {s.pattern === 'glow' && <Circle radius={Math.max(w, h) * 1.4} fill={s.fill} opacity={0.22} listening={false} />}
      <Rect x={-w / 2} y={-h / 2} width={w} height={h} cornerRadius={r} fill={stones ? 'rgba(76,175,80,0.35)' : s.fill} stroke={s.stroke} strokeWidth={1.5} shadowColor="#000" shadowOpacity={0.25} shadowBlur={6} shadowOffsetY={2} />
      {s.pattern !== 'glow' && <Shape listening={false} sceneFunc={(ctx) => drawPattern(ctx, w, h, s, item.x * 13 + item.y)} />}
    </>
  )
}

function PlantShape({ item, p }) {
  const look = plantLook(p, 'Summer')
  const r = (Math.min(item.width, item.height) / 2) * PX
  const flowering = p.bloom_season && p.bloom_season !== 'None'
  const petals = flowering ? (p.type === 'Trees' || p.type === 'Shrubs' ? 9 : 6) : 0
  const bloom = p.color
  return (
    <>
      <Circle radius={r} x={r * 0.1} y={r * 0.16} fill="#000" opacity={0.25} listening={false} />
      <Circle
        radius={r}
        fillRadialGradientStartPoint={{ x: -r * 0.3, y: -r * 0.3 }}
        fillRadialGradientStartRadius={0}
        fillRadialGradientEndPoint={{ x: 0, y: 0 }}
        fillRadialGradientEndRadius={r}
        fillRadialGradientColorStops={[0, '#ffffff55', 0.25, look.foliage, 1, look.foliage]}
        stroke="rgba(0,0,0,0.25)"
        strokeWidth={1}
      />
      {p.type === 'Grasses' && (
        <Shape
          listening={false}
          sceneFunc={(ctx) => {
            const c = ctx._context
            c.strokeStyle = 'rgba(255,255,255,0.35)'
            c.lineWidth = 1.2
            for (let a = 0; a < 16; a++) {
              const ang = (a / 16) * Math.PI * 2
              c.beginPath()
              c.moveTo(0, 0)
              c.lineTo(Math.cos(ang) * r * 0.9, Math.sin(ang) * r * 0.9)
              c.stroke()
            }
          }}
        />
      )}
      {Array.from({ length: petals }).map((_, k) => {
        const a = (k / petals) * Math.PI * 2
        const d = r * (petals > 6 ? 0.6 : 0.45)
        return <Circle key={k} listening={false} x={Math.cos(a) * d} y={Math.sin(a) * d} radius={r * (petals > 6 ? 0.17 : 0.3)} fill={bloom} opacity={0.95} />
      })}
      {flowering && petals <= 6 && <Circle radius={r * 0.2} fill="#fde047" listening={false} />}
      <Circle radius={Math.max(1.5, r * 0.07)} fill="#14532d" opacity={0.6} listening={false} />
    </>
  )
}

function CanvasItem({ item, def, isNew, warn, onSelect, onDragEnd, onDragStart, onTransformEnd }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!isNew || !ref.current) return
    const node = ref.current
    node.scale({ x: 0.05, y: 0.05 })
    const tween = new Konva.Tween({ node, duration: 0.7, scaleX: 1, scaleY: 1, easing: Konva.Easings.ElasticEaseOut })
    tween.play()
    return () => {
      tween.finish()
      tween.destroy()
    }
  }, [isNew])

  const w = item.width * PX
  const h = item.height * PX
  const isPlant = item.item_type === 'plant'
  return (
    <Group
      ref={ref}
      id={item.id}
      name="item"
      x={item.x * PX}
      y={item.y * PX}
      rotation={item.rotation || 0}
      draggable
      onMouseDown={onSelect}
      onTouchStart={onSelect}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onTransformEnd={onTransformEnd}
      onMouseEnter={(e) => (e.target.getStage().container().style.cursor = 'move')}
      onMouseLeave={(e) => (e.target.getStage().container().style.cursor = 'default')}
    >
      {isPlant ? <PlantShape item={item} p={def} /> : <MaterialShape item={item} m={def} />}
      {warn && (
        isPlant
          ? <Circle radius={Math.min(w, h) / 2 + 4} stroke="#f87171" strokeWidth={2.5} dash={[6, 4]} listening={false} />
          : <Rect x={-w / 2 - 4} y={-h / 2 - 4} width={w + 8} height={h + 8} stroke="#f87171" strokeWidth={2.5} dash={[6, 4]} cornerRadius={6} listening={false} />
      )}
    </Group>
  )
}

export default memo(CanvasItem)
