// Seasonal care rules: which care tasks a plant needs and in which month.
const PLANT_MONTH = { Trees: 'November', Shrubs: 'November', Vegetables: 'May' }
const PRUNE_AFTER = { Spring: 'June', Summer: 'September', Autumn: 'November', Winter: 'April' }

export function careTasksFor(plant) {
  const seasons = String(plant.bloom_season || 'None').split(',').map((s) => s.trim())
  const last = seasons[seasons.length - 1]
  return [
    { task_type: 'plant', month: PLANT_MONTH[plant.type] || 'April' },
    { task_type: 'fertilise', month: 'March' },
    { task_type: 'water', month: 'July' },
    { task_type: 'prune', month: PRUNE_AFTER[last] || 'February' },
  ]
}
