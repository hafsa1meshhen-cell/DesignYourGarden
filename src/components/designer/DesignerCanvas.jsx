import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
import { Group, Label, Layer, Line, Path, Rect, Shape, Stage, Tag, Text, Transformer } from 'react-konva'
import CanvasItem, { PX } from './CanvasItem'
import { gardenOutline } from '../GardenSVG'
import { fmtLen, round2, sortByZ } from '../../lib/garden'

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const MIN_SCALE = 0.15
const MAX_SCALE = 6

const DesignerCanvas = forwardRef(function DesignerCanvas(
  { garden, items, plantsById, materialsById, selectedId, onSelect, onChange, onDropNew, warnings, unit, showLabels, newIds, onViewChange, dark },
  ref,
) {
  const wrapRef = useRef(null)
  const stageRef = useRef(null)
  const trRef = useRef(null)
  const labelsRef = useRef(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 })
  const [draggingId, setDraggingId] = useState(null)
  const fitted = useRef(false)
  const pinch = useRef(null)

  const W = garden.width * PX
  const L = garden.length * PX

  const fit = useCallback(() => {
    if (!size.w) return
    const pad = 48
    const scale = clamp(Math.min((size.w - pad * 2) / W, (size.h - pad * 2) / L), MIN_SCALE, MAX_SCALE)
    setView({ scale, x: (size.w - W * scale) / 2, y: (size.h - L * scale) / 2 })
  }, [size, W, L])

  useLayoutEffect(() => {
    const el = wrapRef.current
    const ro = new ResizeObserver(([e]) => setSize({ w: Math.floor(e.contentRect.width), h: Math.floor(e.contentRect.height) }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (size.w && !fitted.current) {
      fitted.current = true
      fit()
    }
  }, [size, fit])

  useEffect(() => {
    fitted.current = false
    if (size.w) {
      fitted.current = true
      fit()
    }
    // refit when switching garden
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [garden.id, garden.width, garden.length])

  useEffect(() => onViewChange?.(view), [view, onViewChange])

  // attach transformer to the selected node
  useEffect(() => {
    const tr = trRef.current
    if (!tr) return
    const node = selectedId && !draggingId ? stageRef.current.findOne(`#${selectedId}`) : null
    tr.nodes(node ? [node] : [])
    tr.getLayer()?.batchDraw()
  }, [selectedId, items, draggingId])

  const zoomAt = useCallback((factor, center) => {
    setView((v) => {
      const scale = clamp(v.scale * factor, MIN_SCALE, MAX_SCALE)
      const c = center || { x: size.w / 2, y: size.h / 2 }
      const mx = (c.x - v.x) / v.scale
      const my = (c.y - v.y) / v.scale
      return { scale, x: c.x - mx * scale, y: c.y - my * scale }
    })
  }, [size])

  // garden coordinates (metres) of the centre of the current view
  const viewCenter = useCallback(() => {
    const v = view
    return { x: round2(clamp((size.w / 2 - v.x) / v.scale / PX, 0, garden.width)), y: round2(clamp((size.h / 2 - v.y) / v.scale / PX, 0, garden.length)) }
  }, [view, size, garden.width, garden.length])

  useImperativeHandle(ref, () => ({
    zoomIn: () => zoomAt(1.25),
    zoomOut: () => zoomAt(0.8),
    fit,
    viewCenter,
    thumbnail: () => {
      const stage = stageRef.current
      if (!stage) return null
      const tr = trRef.current
      const labels = labelsRef.current
      tr?.visible(false)
      labels?.visible(false)
      const pad = 8
      const gw = W * view.scale
      const ratio = Math.min(2, 420 / gw)
      const url = stage.toDataURL({ x: view.x - pad, y: view.y - pad, width: gw + pad * 2, height: L * view.scale + pad * 2, pixelRatio: ratio, mimeType: 'image/webp', quality: 0.82 })
      tr?.visible(true)
      labels?.visible(true)
      return url
    },
  }), [zoomAt, fit, viewCenter, W, L, view])

  const onWheel = (e) => {
    e.evt.preventDefault()
    const p = stageRef.current.getPointerPosition()
    zoomAt(e.evt.deltaY > 0 ? 1 / 1.1 : 1.1, p)
  }

  // Two-finger pinch zoom, handled natively so it works regardless of what is under the fingers.
  useEffect(() => {
    const el = wrapRef.current
    const pts = (t, rect) => [0, 1].map((i) => ({ x: t[i].clientX - rect.left, y: t[i].clientY - rect.top }))
    const onMove = (e) => {
      if (e.touches.length !== 2) return
      e.preventDefault()
      const stage = stageRef.current
      if (stage) {
        if (stage.isDragging()) stage.stopDrag()
        stage.find('.item').forEach((n) => n.isDragging() && n.stopDrag())
      }
      const [p1, p2] = pts(e.touches, el.getBoundingClientRect())
      const center = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }
      const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y)
      const prev = pinch.current
      pinch.current = { dist, center }
      if (!prev) return
      const factor = dist / prev.dist
      setView((v) => {
        const scale = clamp(v.scale * factor, MIN_SCALE, MAX_SCALE)
        const mx = (prev.center.x - v.x) / v.scale
        const my = (prev.center.y - v.y) / v.scale
        return { scale, x: center.x - mx * scale, y: center.y - my * scale }
      })
    }
    const onEnd = (e) => {
      if (e.touches.length < 2) pinch.current = null
    }
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd)
    el.addEventListener('touchcancel', onEnd)
    return () => {
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', onEnd)
    }
  }, [])

  const onStageDown = (e) => {
    if (e.target === e.target.getStage() || e.target.name() === 'ground') onSelect(null)
  }

  const onStageDragEnd = (e) => {
    if (e.target === stageRef.current) setView((v) => ({ ...v, x: e.target.x(), y: e.target.y() }))
  }

  const handleDragEnd = useCallback((id) => (e) => {
    e.cancelBubble = true
    setDraggingId(null)
    const n = e.target
    onChange(id, { x: round2(clamp(n.x() / PX, 0, garden.width)), y: round2(clamp(n.y() / PX, 0, garden.length)) })
  }, [onChange, garden.width, garden.length])

  const handleTransformEnd = useCallback((item) => (e) => {
    const n = e.target
    const sx = n.scaleX()
    const sy = n.scaleY()
    n.scale({ x: 1, y: 1 })
    let width = Math.max(0.1, item.width * sx)
    let height = Math.max(0.05, item.height * sy)
    if (item.item_type === 'plant') width = height = Math.max(width, height)
    onChange(item.id, {
      x: round2(n.x() / PX),
      y: round2(n.y() / PX),
      width: round2(width),
      height: round2(height),
      rotation: Math.round(((n.rotation() % 360) + 360) % 360),
    })
  }, [onChange])

  const onDragOver = (e) => {
    if (e.dataTransfer.types.includes('application/x-gardencraft')) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
    }
  }
  const onDrop = (e) => {
    const raw = e.dataTransfer.getData('application/x-gardencraft')
    if (!raw) return
    e.preventDefault()
    const stage = stageRef.current
    stage.setPointersPositions(e)
    const p = stage.getPointerPosition()
    const x = round2(clamp((p.x - view.x) / view.scale / PX, 0, garden.width))
    const y = round2(clamp((p.y - view.y) / view.scale / PX, 0, garden.length))
    onDropNew(JSON.parse(raw), x, y)
  }

  const s = view.scale
  const fs = 12 / s
  const sorted = sortByZ(items)
  const selected = items.find((i) => i.id === selectedId)
  const labelItems = showLabels ? items : selected ? [selected] : []
  const isPlant = selected?.item_type === 'plant'
  const step = [0.5, 1, 2, 5, 10, 20].find((st) => st * PX * s >= 46) || 50
  const rulerText = (m) => (m === 0 ? '0' : fmtLen(m, unit))
  const gridColor = dark ? 'rgba(134,239,172,' : 'rgba(22,101,52,'

  return (
    <div
      ref={wrapRef}
      className="relative h-full w-full touch-none select-none overflow-hidden"
      onDragOver={onDragOver}
      onDrop={onDrop}
      style={{ touchAction: 'none' }}
    >
      {size.w > 0 && (
        <Stage
          ref={stageRef}
          width={size.w}
          height={size.h}
          x={view.x}
          y={view.y}
          scaleX={s}
          scaleY={s}
          draggable
          onWheel={onWheel}
          onMouseDown={onStageDown}
          onTouchStart={onStageDown}
          onDragEnd={onStageDragEnd}
        >
          <Layer>
            <Path name="ground" data={gardenOutlinePx(garden)} fill={dark ? '#173d27' : '#dcebd3'} shadowColor="#000" shadowBlur={30} shadowOpacity={0.35} />
            <Shape
              listening={false}
              sceneFunc={(ctx) => {
                const c = ctx._context
                c.save()
                c.clip(new Path2D(gardenOutlinePx(garden)))
                for (let x = 0; x <= garden.width; x += 0.5) {
                  c.strokeStyle = gridColor + (x % 1 === 0 ? '0.22)' : '0.08)')
                  c.lineWidth = 1 / s
                  c.beginPath()
                  c.moveTo(x * PX, 0)
                  c.lineTo(x * PX, L)
                  c.stroke()
                }
                for (let y = 0; y <= garden.length; y += 0.5) {
                  c.strokeStyle = gridColor + (y % 1 === 0 ? '0.22)' : '0.08)')
                  c.lineWidth = 1 / s
                  c.beginPath()
                  c.moveTo(0, y * PX)
                  c.lineTo(W, y * PX)
                  c.stroke()
                }
                c.restore()
              }}
            />
            <Path data={gardenOutlinePx(garden)} stroke="#4ade80" strokeWidth={2.5 / s} listening={false} shadowColor="#4ade80" shadowBlur={12} shadowOpacity={0.6} />
            {/* rulers */}
            <Group listening={false}>
              {Array.from({ length: Math.floor(garden.width / step) + 1 }).map((_, i) => (
                <Text key={`rx${i}`} x={i * step * PX - 20 / s} y={-18 / s} width={40 / s} align="center" text={rulerText(i * step)} fontSize={fs * 0.9} fill={dark ? '#86efac' : '#166534'} opacity={0.8} />
              ))}
              {Array.from({ length: Math.floor(garden.length / step) + 1 }).map((_, i) =>
                i === 0 ? null : <Text key={`ry${i}`} x={-44 / s} y={i * step * PX - 6 / s} width={38 / s} align="right" text={rulerText(i * step)} fontSize={fs * 0.9} fill={dark ? '#86efac' : '#166534'} opacity={0.8} />,
              )}
              <Line points={[0, L + 14 / s, W, L + 14 / s]} stroke={dark ? '#facc15' : '#a16207'} strokeWidth={1.5 / s} />
              <Rect x={W / 2 - 34 / s} y={L + 5 / s} width={68 / s} height={18 / s} cornerRadius={5 / s} fill={dark ? '#071d12' : '#ffffff'} />
              <Text x={W / 2 - 34 / s} y={L + 8 / s} width={68 / s} align="center" text={fmtLen(garden.width, unit)} fontSize={fs} fontStyle="bold" fill={dark ? '#facc15' : '#a16207'} />
              <Line points={[W + 14 / s, 0, W + 14 / s, L]} stroke={dark ? '#facc15' : '#a16207'} strokeWidth={1.5 / s} />
              <Rect x={W + 2 / s} y={L / 2 - 9 / s} width={60 / s} height={18 / s} cornerRadius={5 / s} fill={dark ? '#071d12' : '#ffffff'} />
              <Text x={W + 2 / s} y={L / 2 - 6 / s} width={60 / s} align="center" text={fmtLen(garden.length, unit)} fontSize={fs} fontStyle="bold" fill={dark ? '#facc15' : '#a16207'} />
            </Group>
          </Layer>
          <Layer>
            {sorted.map((it) => {
              const def = it.item_type === 'plant' ? plantsById[it.plant_id] : materialsById[it.material_id]
              if (!def) return null
              return (
                <CanvasItem
                  key={it.id}
                  item={it}
                  def={def}
                  isNew={newIds.has(it.id)}
                  warn={!!warnings[it.id]}
                  onSelect={() => onSelect(it.id)}
                  onDragStart={(e) => {
                    e.cancelBubble = true
                    onSelect(it.id)
                    setDraggingId(it.id)
                  }}
                  onDragEnd={handleDragEnd(it.id)}
                  onTransformEnd={handleTransformEnd(it)}
                />
              )
            })}
            <Transformer
              ref={trRef}
              rotateEnabled
              rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
              rotationSnapTolerance={6}
              keepRatio={isPlant}
              enabledAnchors={isPlant ? ['top-left', 'top-right', 'bottom-left', 'bottom-right'] : ['top-left', 'top-center', 'top-right', 'middle-right', 'middle-left', 'bottom-left', 'bottom-center', 'bottom-right']}
              anchorSize={14}
              anchorCornerRadius={7}
              anchorStroke="#22c55e"
              anchorFill="#ffffff"
              borderStroke="#4ade80"
              borderDash={[5, 4]}
              rotateAnchorOffset={28}
              ignoreStroke
              flipEnabled={false}
              boundBoxFunc={(oldBox, box) => (Math.abs(box.width) < 6 || Math.abs(box.height) < 3 ? oldBox : box)}
            />
          </Layer>
          <Layer ref={labelsRef} listening={false}>
            {labelItems.map((it) => {
              if (it.id === draggingId) return null
              const def = it.item_type === 'plant' ? plantsById[it.plant_id] : materialsById[it.material_id]
              if (!def) return null
              const ext = (Math.max(it.width, it.height) / 2) * PX
              const text = it.item_type === 'plant' ? `${def.name} · ⌀ ${fmtLen(it.width, unit)}` : `${def.name} · ${fmtLen(it.width, unit)} × ${fmtLen(it.height, unit)}`
              return (
                <Label key={it.id} x={it.x * PX} y={it.y * PX + ext + 8 / s} opacity={0.95}>
                  <Tag fill={dark ? 'rgba(4,20,12,0.85)' : 'rgba(255,255,255,0.92)'} cornerRadius={6 / s} pointerDirection="up" pointerWidth={8 / s} pointerHeight={5 / s} stroke="rgba(74,222,128,0.5)" strokeWidth={1 / s} />
                  <Text text={text} fontSize={fs} padding={4 / s} fill={dark ? '#dcfce7' : '#14532d'} fontFamily="Inter, sans-serif" />
                </Label>
              )
            })}
          </Layer>
        </Stage>
      )}
    </div>
  )
})

function gardenOutlinePx(garden) {
  return gardenOutline({ ...garden, width: garden.width * PX, length: garden.length * PX })
}

export default DesignerCanvas
