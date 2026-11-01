// Static marketing illustration for the landing page hero (not user data).
// Plant/material ids match the seeded catalog.
let n = 0
const P = (ref, x, y, size, z = 4) => ({ id: `show-${++n}`, item_type: 'plant', plant_id: ref, material_id: null, x, y, width: size, height: size, rotation: 0, z_index: z, quantity: 1 })
const M = (ref, x, y, width, height, z, rotation = 0) => ({ id: `show-${++n}`, item_type: 'material', plant_id: null, material_id: ref, x, y, width, height, rotation, z_index: z, quantity: 1 })

const hedge = Array.from({ length: 10 }, (_, i) => P(8, 0.55 + i * 0.99, 0.5, 1.05))

const items = [
  // ground
  M(23, 5.1, 3.6, 5.4, 4.4, 0), // lawn
  M(21, 1.15, 4.35, 1.9, 5.7, 1), // left border
  M(22, 8.95, 3.75, 1.9, 4.5, 1), // right border
  M(5, 5.5, 6.95, 6.2, 2.1, 2), // sandstone patio
  M(2, 3.55, 3.7, 0.6, 4.1, 3), // stepping stones
  M(11, 6.6, 2.7, 2.1, 1.45, 3), // pond
  // hedge along the back
  ...hedge,
  // feature trees
  P(4, 1.8, 2.3, 2.8, 5), // flowering cherry
  P(1, 9.0, 1.7, 1.9, 5), // japanese maple
  P(3, 2.9, 6.85, 1.2, 5), // olive on the patio
  // left border
  P(17, 0.7, 3.2, 0.45),
  P(17, 1.5, 3.45, 0.45),
  P(13, 0.65, 3.95, 0.6),
  P(13, 1.4, 4.2, 0.6),
  P(13, 0.75, 4.75, 0.6),
  P(14, 1.45, 5.15, 0.95),
  P(19, 0.65, 5.75, 0.5),
  P(19, 1.5, 6.1, 0.5),
  P(15, 0.6, 6.55, 0.45),
  // right border
  P(7, 9.05, 3.2, 1.25),
  P(37, 8.55, 4.25, 0.75),
  P(35, 9.3, 4.6, 0.95),
  P(25, 8.6, 5.3, 0.55),
  // pond margins
  P(38, 7.85, 2.05, 0.6),
  P(39, 5.45, 3.15, 0.45),
  // patio edge
  P(36, 4.4, 5.85, 0.4),
  P(36, 4.95, 5.85, 0.4),
  P(36, 7.6, 5.85, 0.4),
  P(36, 8.15, 5.85, 0.4),
  // furniture & light
  M(15, 5.1, 7.05, 1.3, 1.3, 6),
  M(14, 7.9, 7.45, 1.6, 0.55, 6),
  M(17, 3.05, 2.4, 0.22, 0.22, 7),
  M(17, 3.05, 4.9, 0.22, 0.22, 7),
]

export const SHOWCASE_GARDEN = {
  id: 'showcase',
  name: 'Back Garden Retreat',
  width: 10,
  length: 8,
  shape: 'rectangle',
  sun_exposure: 'full sun',
  soil_type: 'loam',
  items,
}

// Numbered callouts shown on the hero plan, with their key.
const find = (plantId) => items.find((i) => i.plant_id === plantId).id
export const SHOWCASE_KEY = [
  { n: 1, plantId: 4, label: 'Flowering Cherry' },
  { n: 2, plantId: 1, label: 'Japanese Maple' },
  { n: 3, plantId: 13, label: 'Lavender' },
  { n: 4, plantId: 7, label: 'Hydrangea' },
].map((k) => ({ ...k, id: find(k.plantId) }))
