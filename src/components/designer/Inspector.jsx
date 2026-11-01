import { AlertTriangle, Copy, Droplets, Minus, Plus, RotateCcw, RotateCw, Ruler, Sun, Trash2 } from 'lucide-react'
import { fmtArea, fmtLen, fromDisplayLen, materialQuantity, money, round2, toDisplayLen } from '../../lib/garden'

function NumField({ label, value, onCommit, unit, min = 0.05 }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <div className="relative">
        <input
          key={value}
          type="number"
          step="0.1"
          min={min}
          inputMode="decimal"
          defaultValue={toDisplayLen(value, unit)}
          onBlur={(e) => {
            const v = fromDisplayLen(e.target.value, unit)
            if (v >= min && Math.abs(v - value) > 0.001) onCommit(round2(v))
          }}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          className="input !min-h-[40px] py-2 pr-9 text-sm"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">{unit === 'imperial' ? 'ft' : 'm'}</span>
      </div>
    </label>
  )
}

export default function Inspector({ garden, item, def, warnings, allWarnings, onChange, onDelete, onDuplicate, onSelect, items, plantsById, materialsById, unit, total }) {
  if (!item || !def) {
    const entries = Object.entries(allWarnings)
    const plants = items.filter((i) => i.item_type === 'plant').length
    return (
      <div className="space-y-4 p-4">
        <div>
          <p className="label">Garden</p>
          <h3 className="text-lg font-bold">{garden.name}</h3>
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl bg-line/5 p-2.5"><Ruler size={14} className="mb-1 text-leaf" />{fmtLen(garden.width, unit)} × {fmtLen(garden.length, unit)}<div className="text-[11px] text-muted">{fmtArea(garden.width * garden.length, unit)}</div></div>
            <div className="rounded-xl bg-line/5 p-2.5"><Sun size={14} className="mb-1 text-sun" /><span className="capitalize">{garden.sun_exposure}</span><div className="text-[11px] capitalize text-muted">{garden.soil_type} soil</div></div>
            <div className="rounded-xl bg-line/5 p-2.5"><span className="font-display text-xl font-bold">{items.length}</span><div className="text-[11px] text-muted">items · {plants} plants</div></div>
            <div className="rounded-xl bg-line/5 p-2.5"><span className="font-display text-xl font-bold">{money(total)}</span><div className="text-[11px] text-muted">of {money(garden.budget)} budget</div></div>
          </div>
        </div>
        <div>
          <p className="label flex items-center gap-1.5">
            <AlertTriangle size={13} className={entries.length ? 'text-amber-400' : ''} /> Plant health check
          </p>
          {entries.length === 0 ? (
            <p className="rounded-xl border border-leaf/20 bg-leaf/10 p-3 text-sm text-leaf">All plants are happy with the sun, soil and spacing. 🌿</p>
          ) : (
            <ul className="space-y-1.5">
              {entries.slice(0, 8).map(([id, msgs]) => (
                <li key={id}>
                  <button onClick={() => onSelect(id)} className="w-full rounded-xl border border-amber-400/25 bg-amber-400/10 p-2.5 text-left text-[13px] hover:bg-amber-400/15">
                    {msgs[0]}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="text-xs text-muted">Tip: select an item to resize, rotate or delete it. Scroll or pinch to zoom, drag the background to pan.</p>
      </div>
    )
  }

  const isPlant = item.item_type === 'plant'
  const qty = isPlant ? item.quantity || 1 : materialQuantity(item, def)
  const price = isPlant ? def.price_estimate * qty : def.price_per_unit * qty
  return (
    <div className="space-y-4 p-4">
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 h-10 w-10 shrink-0 ${isPlant ? 'rounded-full' : 'rounded-xl'}`} style={{ background: isPlant ? `radial-gradient(circle at 35% 35%, #ffffff66, ${def.color} 50%)` : '#8a6a4f' }} />
        <div className="min-w-0">
          <h3 className="truncate text-lg font-bold">{def.name}</h3>
          <p className="text-xs text-muted">{isPlant ? `${def.type} · ${def.care_level} care` : `${def.category} · ${money(def.price_per_unit)} / ${def.unit}`}</p>
        </div>
      </div>

      {warnings?.length > 0 && (
        <div className="space-y-1.5">
          {warnings.map((w, i) => (
            <p key={i} className="flex gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 p-2.5 text-[13px] text-amber-700 dark:text-amber-200">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" /> {w}
            </p>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {isPlant ? (
          <NumField label="Spread" value={item.width} unit={unit} min={0.1} onCommit={(v) => onChange({ width: v, height: v })} />
        ) : (
          <>
            <NumField label="Width" value={item.width} unit={unit} onCommit={(v) => onChange({ width: v })} />
            <NumField label="Length" value={item.height} unit={unit} onCommit={(v) => onChange({ height: v })} />
          </>
        )}
        <NumField label="X" value={item.x} unit={unit} min={0} onCommit={(v) => onChange({ x: Math.min(v, garden.width) })} />
        <NumField label="Y" value={item.y} unit={unit} min={0} onCommit={(v) => onChange({ y: Math.min(v, garden.length) })} />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <span className="label">Rotation</span>
          <span className="text-xs font-semibold">{item.rotation || 0}°</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="icon-btn !h-10 !w-10" onClick={() => onChange({ rotation: ((item.rotation || 0) + 345) % 360 })} aria-label="Rotate left 15°"><RotateCcw size={16} /></button>
          <input type="range" min="0" max="359" value={item.rotation || 0} onChange={(e) => onChange({ rotation: Number(e.target.value) }, { live: true })} onPointerUp={() => onChange({}, { settle: true })} className="flex-1" aria-label="Rotation" />
          <button className="icon-btn !h-10 !w-10" onClick={() => onChange({ rotation: ((item.rotation || 0) + 15) % 360 })} aria-label="Rotate right 15°"><RotateCw size={16} /></button>
        </div>
      </div>

      {(isPlant || def.unit === 'piece') && (
        <div>
          <span className="label">Quantity</span>
          <div className="flex items-center gap-2">
            <button className="icon-btn !h-10 !w-10" onClick={() => onChange({ quantity: Math.max(1, (item.quantity || 1) - 1) })} aria-label="Decrease quantity"><Minus size={16} /></button>
            <span className="w-10 text-center font-display text-lg font-bold">{item.quantity || 1}</span>
            <button className="icon-btn !h-10 !w-10" onClick={() => onChange({ quantity: (item.quantity || 1) + 1 })} aria-label="Increase quantity"><Plus size={16} /></button>
          </div>
        </div>
      )}

      <div className="rounded-xl bg-line/5 p-3 text-sm">
        <div className="flex justify-between"><span className="text-muted">Quantity</span><span className="font-semibold">{qty} {isPlant ? (qty === 1 ? 'plant' : 'plants') : def.unit}</span></div>
        <div className="mt-1 flex justify-between"><span className="text-muted">Estimated cost</span><span className="font-semibold text-leaf">{money(price)}</span></div>
        {isPlant && (
          <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
            <span className="chip !min-h-0 !py-0.5 capitalize"><Sun size={11} /> {def.sun_needs}</span>
            <span className="chip !min-h-0 !py-0.5 capitalize"><Droplets size={11} /> {def.water_needs}</span>
            <span className="chip !min-h-0 !py-0.5">↕ {fmtLen(def.mature_height_cm / 100, unit)}</span>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button className="btn-ghost flex-1 !min-h-[40px] !py-2" onClick={onDuplicate}><Copy size={16} /> Duplicate</button>
        <button className="btn flex-1 !min-h-[40px] border border-red-400/30 bg-red-500/10 !py-2 text-red-400 hover:bg-red-500/20" onClick={onDelete}><Trash2 size={16} /> Delete</button>
      </div>
    </div>
  )
}
