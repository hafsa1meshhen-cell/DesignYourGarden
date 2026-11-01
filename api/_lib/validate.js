import { HttpError } from './http.js'

const SUN = ['full sun', 'part shade', 'full shade']
const SOIL = ['loam', 'clay', 'sandy', 'chalk', 'peat', 'silt']
const STYLE = ['Modern', 'Cottage', 'Japanese Zen', 'Mediterranean', 'Vegetable Garden', 'Blank']
const STATUS = ['Idea', 'Planning', 'Ready to Build', 'Built']
const SHAPE = ['rectangle', 'L-shape', 'custom']

const num = (v, name, min, max) => {
  const n = Number(v)
  if (v === null || v === '' || !Number.isFinite(n) || n < min || n > max) throw new HttpError(400, `${name} must be a number between ${min} and ${max}.`)
  return n
}
const oneOf = (v, list, name) => {
  if (!list.includes(v)) throw new HttpError(400, `${name} must be one of: ${list.join(', ')}.`)
  return v
}
const text = (v, name, max = 80) => {
  const s = String(v ?? '').trim()
  if (!s) throw new HttpError(400, `${name} can’t be empty.`)
  return s.slice(0, max)
}

export function gardenInput(body, partial = false) {
  const out = {}
  const has = (k) => body[k] !== undefined
  if (!partial || has('name')) out.name = text(partial ? body.name : body.name || 'My New Garden', 'Name', 60)
  if (!partial || has('width')) out.width = num(body.width, 'Width', 1, 200)
  if (!partial || has('length')) out.length = num(body.length, 'Length', 1, 200)
  if (!partial || has('shape')) out.shape = oneOf(body.shape || 'rectangle', SHAPE, 'Shape')
  if (!partial || has('sun_exposure')) out.sun_exposure = oneOf(body.sun_exposure, SUN, 'Sun exposure')
  if (!partial || has('soil_type')) out.soil_type = oneOf(body.soil_type, SOIL, 'Soil type')
  if (!partial || has('style')) out.style = oneOf(body.style || 'Blank', STYLE, 'Style')
  if (!partial || has('budget')) out.budget = num(body.budget ?? 0, 'Budget', 0, 10_000_000)
  if (partial && has('status')) out.status = oneOf(body.status, STATUS, 'Status')
  return out
}

export function itemsInput(items) {
  if (!Array.isArray(items)) throw new HttpError(400, 'Items must be a list.')
  if (items.length > 2000) throw new HttpError(400, 'That’s more than 2000 items. Try splitting the garden.')
  const seen = new Set()
  return items.map((it) => {
    const id = String(it?.id || '').slice(0, 64)
    if (!id || seen.has(id)) throw new HttpError(400, 'Every item needs a unique id.')
    seen.add(id)
    const item_type = oneOf(it.item_type, ['plant', 'material'], 'Item type')
    return {
      id,
      item_type,
      plant_id: item_type === 'plant' ? num(it.plant_id, 'Plant', 1, 1e9) : null,
      material_id: item_type === 'material' ? num(it.material_id, 'Material', 1, 1e9) : null,
      x: num(it.x, 'x', -1000, 1000),
      y: num(it.y, 'y', -1000, 1000),
      width: num(it.width, 'Width', 0.01, 1000),
      height: num(it.height, 'Height', 0.01, 1000),
      rotation: num(it.rotation ?? 0, 'Rotation', -360, 720),
      z_index: Math.round(num(it.z_index ?? 0, 'Layer', -100, 100)),
      quantity: Math.round(num(it.quantity ?? 1, 'Quantity', 1, 10000)),
    }
  })
}

export function signupInput(b) {
  const email = String(b.email || '').trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new HttpError(400, 'Please enter a valid email address.')
  const password = String(b.password || '')
  if (password.length < 8) throw new HttpError(400, 'Your password needs at least 8 characters.')
  if (password.length > 200) throw new HttpError(400, 'That password is too long.')
  return {
    email,
    password,
    full_name: text(b.full_name, 'Your name', 80),
    unit_preference: oneOf(b.unit_preference || 'metric', ['metric', 'imperial'], 'Unit preference'),
    climate_zone: b.climate_zone ? String(b.climate_zone).slice(0, 80) : null,
  }
}
