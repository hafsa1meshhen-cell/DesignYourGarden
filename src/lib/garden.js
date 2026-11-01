// Pure garden maths shared by the UI (and later the API). No browser APIs here.

export const round1 = (n) => Math.round(n * 10) / 10
export const round2 = (n) => Math.round(n * 100) / 100

// ---------- formatting ----------
const M_TO_FT = 3.28084

export function fmtLen(m, unit = 'metric') {
  if (unit === 'imperial') {
    const ft = m * M_TO_FT
    if (ft < 3) return `${Math.round(ft * 12)}″`
    return `${round1(ft)} ft`
  }
  if (m < 1) return `${Math.round(m * 100)} cm`
  return `${round1(m)} m`
}

export function fmtArea(m2, unit = 'metric') {
  if (unit === 'imperial') return `${Math.round(m2 * 10.7639)} ft²`
  return `${round1(m2)} m²`
}

export const toDisplayLen = (m, unit) => (unit === 'imperial' ? round1(m * M_TO_FT) : round2(m))
export const fromDisplayLen = (v, unit) => (unit === 'imperial' ? Number(v) / M_TO_FT : Number(v))

const gbp = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 })
const gbp2 = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const money = (n) => gbp.format(Math.round(n || 0))
export const money2 = (n) => gbp2.format(n || 0)

// ---------- defaults for new items ----------
const MATERIAL_DEFAULT_SIZE = {
  Lawn: [4, 3],
  Beds: [2.4, 1],
  Paths: [1, 4],
  Patio: [3, 3],
  Fencing: [3, 0.12],
  'Water Features': [1.8, 1.4],
  Seating: [1.5, 0.6],
  Lighting: [0.3, 0.3],
}
const MATERIAL_SIZE_OVERRIDE = {
  'Bubble Fountain': [0.8, 0.8],
  'Bird Bath': [0.6, 0.6],
  'Bistro Set': [1.3, 1.3],
  'Outdoor Sofa Set': [2.4, 1.8],
  'Festoon Lights': [4, 0.08],
  'Raised Bed (Oak)': [2.4, 1.2],
}
const CATEGORY_Z = { Lawn: 0, Beds: 1, Paths: 2, Patio: 2, 'Water Features': 3, Plant: 4, Seating: 5, Lighting: 6, Fencing: 6 }

export function defaultMaterialSize(material) {
  return MATERIAL_SIZE_OVERRIDE[material.name] || MATERIAL_DEFAULT_SIZE[material.category] || [1, 1]
}
export const plantFootprint = (plant) => Math.max(0.2, plant.mature_spread_cm / 100)
export const zFor = (kind) => CATEGORY_Z[kind] ?? 4

let seq = 0
export const uid = (p = 'i') => `${p}-${Date.now().toString(36)}-${(seq++).toString(36)}${Math.random().toString(36).slice(2, 7)}`

export function makeItem({ plant, material, x, y, width, height }) {
  if (plant) {
    const s = plantFootprint(plant)
    return { id: uid(), item_type: 'plant', plant_id: plant.id, material_id: null, x, y, width: width ?? s, height: height ?? s, rotation: 0, z_index: zFor('Plant'), quantity: 1 }
  }
  const [w, h] = defaultMaterialSize(material)
  return { id: uid(), item_type: 'material', plant_id: null, material_id: material.id, x, y, width: width ?? w, height: height ?? h, rotation: 0, z_index: zFor(material.category), quantity: 1 }
}

export const sortByZ = (items) => [...items].sort((a, b) => a.z_index - b.z_index)

// ---------- quantities & costs ----------
export function materialQuantity(item, material) {
  if (material.unit === 'm²') return round1(item.width * item.height)
  if (material.unit === 'metre') return round1(Math.max(item.width, item.height))
  return item.quantity || 1
}

export function buildShoppingList(items, plantsById, materialsById) {
  const plants = new Map()
  const materials = new Map()
  for (const it of items) {
    if (it.item_type === 'plant') {
      const p = plantsById[it.plant_id]
      if (!p) continue
      const row = plants.get(p.id) || { key: `p${p.id}`, kind: 'plant', id: p.id, name: p.name, category: p.type, unit: 'plant', qty: 0, unitPrice: p.price_estimate, color: p.color }
      row.qty += it.quantity || 1
      plants.set(p.id, row)
    } else {
      const m = materialsById[it.material_id]
      if (!m) continue
      const row = materials.get(m.id) || { key: `m${m.id}`, kind: 'material', id: m.id, name: m.name, category: m.category, unit: m.unit, qty: 0, unitPrice: m.price_per_unit }
      row.qty = round1(row.qty + materialQuantity(it, m))
      materials.set(m.id, row)
    }
  }
  const finish = (r) => ({ ...r, total: round2(r.qty * r.unitPrice) })
  const plantRows = [...plants.values()].map(finish).sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
  const materialRows = [...materials.values()].map(finish).sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
  const plantsTotal = round2(plantRows.reduce((s, r) => s + r.total, 0))
  const materialsTotal = round2(materialRows.reduce((s, r) => s + r.total, 0))
  const byCategory = {}
  for (const r of [...plantRows, ...materialRows]) byCategory[r.category] = round2((byCategory[r.category] || 0) + r.total)
  return {
    plants: plantRows,
    materials: materialRows,
    plantsTotal,
    materialsTotal,
    total: round2(plantsTotal + materialsTotal),
    plantCount: plantRows.reduce((s, r) => s + r.qty, 0),
    byCategory: Object.entries(byCategory).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
  }
}

// ---------- progress ----------
export function gardenProgress(garden, items, plantsById, materialsById) {
  const cats = new Set()
  let plantCount = 0
  const plantTypes = new Set()
  for (const it of items) {
    if (it.item_type === 'plant') {
      plantCount++
      const p = plantsById[it.plant_id]
      if (p) plantTypes.add(p.type)
    } else {
      const m = materialsById[it.material_id]
      if (m) cats.add(m.category)
    }
  }
  // Design: ground cover, hard landscaping, boundaries/features, planting
  let design = 0
  if (cats.has('Lawn') || cats.has('Beds')) design += 25
  if (cats.has('Paths') || cats.has('Patio')) design += 25
  if (cats.has('Seating') || cats.has('Water Features') || cats.has('Fencing') || cats.has('Lighting')) design += 20
  design += Math.min(30, plantCount * 4)
  if (garden.status === 'Ready to Build' || garden.status === 'Built') design = 100
  const plants = Math.min(100, Math.round((Math.min(plantCount, 8) / 8) * 70 + (Math.min(plantTypes.size, 3) / 3) * 30))
  const cost = buildShoppingList(items, plantsById, materialsById).total
  const budget = garden.budget > 0 ? Math.round((cost / garden.budget) * 100) : 0
  return { design: Math.min(100, design), plants, budget, cost, plantCount }
}

// ---------- suitability warnings ----------
const SUN_RANK = { 'full sun': 2, 'part shade': 1, 'full shade': 0 }

export function plantIssues(plant, garden) {
  const issues = []
  const gap = SUN_RANK[plant.sun_needs] - SUN_RANK[garden.sun_exposure]
  if (gap >= 2) issues.push(`${plant.name} needs ${plant.sun_needs}, but this garden is ${garden.sun_exposure}.`)
  else if (gap <= -2) issues.push(`${plant.name} prefers ${plant.sun_needs} and may scorch in ${garden.sun_exposure}.`)
  const soils = String(plant.soil_types || '').split(',').map((s) => s.trim())
  if (garden.soil_type && !soils.includes(garden.soil_type)) issues.push(`${plant.name} doesn't like ${garden.soil_type} soil (prefers ${soils.join(', ')}).`)
  return issues
}

export function computeWarnings(items, garden, plantsById) {
  const map = {}
  const add = (id, msg) => {
    const list = (map[id] = map[id] || [])
    if (!list.includes(msg)) list.push(msg)
  }
  const plantItems = items.filter((i) => i.item_type === 'plant' && plantsById[i.plant_id])
  for (const it of plantItems) for (const msg of plantIssues(plantsById[it.plant_id], garden)) add(it.id, msg)
  for (let a = 0; a < plantItems.length; a++) {
    for (let b = a + 1; b < plantItems.length; b++) {
      const A = plantItems[a], B = plantItems[b]
      const rA = Math.min(A.width, A.height) / 2, rB = Math.min(B.width, B.height) / 2
      const d = Math.hypot(A.x - B.x, A.y - B.y)
      if (d < (rA + rB) * 0.7) {
        const pa = plantsById[A.plant_id].name, pb = plantsById[B.plant_id].name
        const msg = `${pa} and ${pb} are too close (${round1(d)} m apart). Give them room to grow.`
        add(A.id, msg)
        add(B.id, msg)
      }
    }
  }
  return map
}

// ---------- seasons & growth ----------
export const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter']
export const isEvergreen = (p) => /evergreen|all winter/i.test(p.description || '')
export const inBloom = (p, season) => String(p.bloom_season || '').includes(season)

export function growthFactor(plant, year) {
  const speed = { Trees: [0.3, 0.45, 0.6, 0.78, 1], Shrubs: [0.45, 0.65, 0.82, 0.94, 1], Grasses: [0.6, 0.85, 1, 1, 1] }[plant.type] || [0.75, 1, 1, 1, 1]
  return speed[Math.max(0, Math.min(4, year - 1))]
}

export function seasonCurrent(date = new Date()) {
  const m = date.getMonth()
  return m >= 2 && m <= 4 ? 'Spring' : m >= 5 && m <= 7 ? 'Summer' : m >= 8 && m <= 10 ? 'Autumn' : 'Winter'
}

// ---------- profile ----------
export const LEVELS = [
  { name: 'Seedling', min: 0, blurb: 'Every garden starts with a single seed.' },
  { name: 'Sprout', min: 30, blurb: 'Your first designs are taking root.' },
  { name: 'Bloomer', min: 120, blurb: 'Your gardens are flourishing.' },
  { name: 'Master Gardener', min: 300, blurb: 'Designed, built and admired.' },
]

export function computeProfile(gardens, plantsById, materialsById) {
  const designed = gardens.filter((g) => g.items.length > 0).length
  const built = gardens.filter((g) => g.status === 'Built').length
  const allItems = gardens.flatMap((g) => g.items)
  const plantsPlaced = allItems.filter((i) => i.item_type === 'plant').length
  const plantSpecies = new Set(allItems.filter((i) => i.item_type === 'plant').map((i) => i.plant_id)).size
  const materialCats = new Set(allItems.filter((i) => i.item_type === 'material').map((i) => materialsById[i.material_id]?.category).filter(Boolean))
  const hasWater = materialCats.has('Water Features')
  const typesInOne = Math.max(0, ...gardens.map((g) => new Set(g.items.filter((i) => i.item_type === 'plant').map((i) => plantsById[i.plant_id]?.type)).size))
  const underBudget = gardens.some((g) => g.items.length >= 5 && g.budget > 0 && buildShoppingList(g.items, plantsById, materialsById).total <= g.budget)

  const xp = gardens.length * 10 + designed * 20 + built * 80 + plantsPlaced * 2
  let levelIdx = 0
  LEVELS.forEach((l, i) => { if (xp >= l.min) levelIdx = i })
  const next = LEVELS[levelIdx + 1]
  const cur = LEVELS[levelIdx]

  const ach = (id, name, desc, icon, value, goal) => ({ id, name, desc, icon, progress: Math.min(1, value / goal), value: Math.min(value, goal), goal, unlocked: value >= goal })
  const achievements = [
    ach('first-seed', 'First Seed', 'Create your first garden', 'sprout', gardens.length, 1),
    ach('green-thumb', 'Green Thumb', 'Place 10 plants', 'leaf', plantsPlaced, 10),
    ach('collector', 'Plant Collector', 'Use 8 different plant species', 'flower', plantSpecies, 8),
    ach('landscaper', 'Landscaper', 'Use 5 kinds of structures', 'shovel', materialCats.size, 5),
    ach('biodiversity', 'Biodiversity Hero', 'Mix 4 plant types in one garden', 'trees', typesInOne, 4),
    ach('water-wise', 'Water Wise', 'Add a water feature', 'droplets', hasWater ? 1 : 0, 1),
    ach('budget-boss', 'Budget Boss', 'Design a garden that fits its budget', 'ruler', underBudget ? 1 : 0, 1),
    ach('planner', 'Master Planner', 'Design 3 gardens', 'sun', designed, 3),
    ach('builder', 'Builder', 'Mark a garden as Built', 'hammer', built, 1),
    ach('master', 'Grand Designer', 'Build 3 gardens for real', 'trophy', built, 3),
  ]
  return {
    stats: { gardens: gardens.length, designed, built, plantsPlaced, plantSpecies },
    xp,
    level: cur.name,
    levelIndex: levelIdx,
    levelBlurb: cur.blurb,
    nextLevel: next?.name || null,
    levelProgress: next ? (xp - cur.min) / (next.min - cur.min) : 1,
    xpToNext: next ? next.min - xp : 0,
    achievements,
  }
}
