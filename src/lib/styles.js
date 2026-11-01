// Visual styles for materials and plants, shared by the Konva designer and the SVG previews.
import { inBloom, isEvergreen } from './garden'

const MATERIAL_COLORS = {
  'Gravel Path': ['#d6c7a1', '#a89770'],
  'Stepping Stones': ['#9ca3af', '#6b7280'],
  'Bark Chip Path': ['#8b5e34', '#5c3b1e'],
  'Brick Path': ['#b4533a', '#7c2d12'],
  'Sandstone Paving': ['#e2c799', '#b8975f'],
  'Porcelain Tiles': ['#cbd5e1', '#94a3b8'],
  'Composite Decking': ['#8a6a4f', '#5b4331'],
  'Closeboard Fence': ['#7c5a3a', '#4a3320'],
  'Picket Fence': ['#f5f5f4', '#a8a29e'],
  'Willow Screen': ['#a16207', '#713f12'],
  'Wildlife Pond': ['#38bdf8', '#0369a1'],
  'Bubble Fountain': ['#7dd3fc', '#0284c7'],
  'Bird Bath': ['#d6d3d1', '#78716c'],
  'Wooden Bench': ['#a16207', '#713f12'],
  'Bistro Set': ['#334155', '#0f172a'],
  'Outdoor Sofa Set': ['#a8a29e', '#57534e'],
  'Solar Path Light': ['#fde047', '#ca8a04'],
  'Festoon Lights': ['#fde68a', '#ca8a04'],
  'Garden Spotlight': ['#fef08a', '#a16207'],
  'Raised Bed (Oak)': ['#5b3a1e', '#a16207'],
  'Flower Bed': ['#4a2f1b', '#2b1a0e'],
  'Mulched Border': ['#6b4226', '#3f2614'],
  'Turf Lawn': ['#4caf50', '#2e7d32'],
  'Wildflower Meadow': ['#7cb342', '#558b2f'],
  'Artificial Grass': ['#22c55e', '#15803d'],
}

const PATTERN = {
  Lawn: 'stripes',
  Paths: 'gravel',
  Patio: 'paving',
  Fencing: 'posts',
  'Water Features': 'water',
  Seating: 'boards',
  Lighting: 'glow',
  Beds: 'soil',
}

export function materialStyle(m, season = 'Summer') {
  let [fill, stroke] = MATERIAL_COLORS[m.name] || ['#9ca3af', '#4b5563']
  stroke = stroke.slice(0, 7)
  const pattern = m.name === 'Composite Decking' ? 'boards' : m.name === 'Stepping Stones' ? 'stones' : PATTERN[m.category]
  if (m.category === 'Lawn' && m.name !== 'Artificial Grass') {
    fill = { Spring: '#5cbf4a', Summer: fill, Autumn: '#7f9f3a', Winter: '#9fb59a' }[season]
  }
  if (m.category === 'Water Features' && season === 'Winter' && m.name !== 'Bird Bath') fill = '#bae6fd'
  const round = m.category === 'Water Features' || m.category === 'Lighting'
  return { fill, stroke, pattern, round, radius: m.category === 'Beds' || m.category === 'Lawn' ? 0.15 : m.category === 'Seating' ? 0.08 : 0.04 }
}

const FOLIAGE = { Trees: '#2f7d32', Shrubs: '#3b8a3e', Flowers: '#4f9a46', Herbs: '#5fa052', Vegetables: '#4d9a34', Grasses: '#9fb85a' }
const AUTUMN = { Trees: '#d97706', Shrubs: '#c2410c', Grasses: '#d6b56b' }

// How a plant looks in a given season: foliage colour, optional bloom colour, size multiplier.
export function plantLook(p, season = 'Summer') {
  const flowers = p.bloom_season && p.bloom_season !== 'None'
  let foliage = flowers ? FOLIAGE[p.type] : p.color
  let bloom = inBloom(p, season) ? p.color : null
  let size = 1
  let bare = false
  let opacity = 1
  const ever = isEvergreen(p)
  const woody = p.type === 'Trees' || p.type === 'Shrubs'
  if (season === 'Spring' && !ever) foliage = woody ? '#5fbf4f' : '#6ccf5a'
  if (season === 'Autumn' && !ever) {
    if (woody) foliage = p.name === 'Japanese Maple' ? '#dc2626' : AUTUMN[p.type]
    else if (p.type === 'Grasses') foliage = AUTUMN.Grasses
    else foliage = '#9a8a3c'
  }
  if (season === 'Winter' && !ever) {
    if (woody) {
      bare = true
      foliage = '#7c6a55'
      opacity = 0.75
    } else if (p.type === 'Grasses') {
      foliage = '#cdb98a'
    } else {
      foliage = '#8b7355'
      size = 0.45
      opacity = 0.6
    }
  }
  return { foliage, bloom, size, bare, opacity }
}

export const TYPE_ACCENT = {
  Trees: '#22c55e',
  Shrubs: '#10b981',
  Flowers: '#ec4899',
  Herbs: '#84cc16',
  Vegetables: '#f97316',
  Grasses: '#eab308',
}
