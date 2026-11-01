// Static editorial content (tips, templates). Not user data, so it stays in the frontend.

export const DAILY_TIPS = [
  'Water deeply and less often: roots grow down to chase moisture, making plants tougher in a drought.',
  'Group plants with the same water needs together so nothing gets drowned or left thirsty.',
  'A 5 cm layer of mulch keeps weeds down and moisture in. Keep it clear of stems.',
  'Plant in odd numbers (3, 5, 7) for a natural look that the eye loves.',
  'Before you buy, check the mature spread on the label and space for the plant it will become.',
  'Water early in the morning so leaves dry quickly and fungus has less chance to spread.',
  'Leave seed heads standing over winter. They feed birds and look magical in frost.',
  'Test your soil pH with a cheap kit. It decides whether camellias or lavender will thrive.',
  'Repeat a few key plants through the garden to tie the whole design together.',
  'Collect rainwater in a water butt. Plants prefer it to tap water and it is free.',
  'Deadhead flowers regularly to keep them blooming for weeks longer.',
  'Plant tall at the back, mid-height in the middle and low at the front of borders.',
  'Add a small water source: even a shallow dish brings birds, frogs and beneficial insects.',
  'Use evergreen plants for about a third of a border so it never looks bare in winter.',
  'Compost kitchen scraps and garden waste. It is the best soil improver money can’t buy.',
  'Paths should be at least 1 m wide if two people will walk side by side.',
  'Watch where the sun falls at 9 am, 1 pm and 5 pm before deciding where the patio goes.',
  'Grow herbs close to the kitchen door: you will use them far more.',
  'Sharpen your secateurs: clean cuts heal faster and keep disease out.',
  'Lift and divide crowded perennials in spring or autumn for free new plants.',
  'Mow a little higher in summer: longer grass shades its own roots and stays greener.',
  'Plant spring bulbs in autumn at three times their own depth.',
  'Add lighting to a focal tree so you can enjoy the garden after dark.',
  'Leave a wild corner with long grass and a log pile for hedgehogs and beetles.',
  'Feed containers weekly in summer: their roots can’t forage for nutrients.',
  'Prune most shrubs straight after they flower so you don’t cut off next year’s buds.',
  'Hoe weeds on a dry, sunny day and leave them on the surface to shrivel.',
  'Use a hose pipe laid on the ground to try out curved bed shapes before you dig.',
  'Choose a mix of flowers that bloom from spring to autumn to keep pollinators fed.',
  'Raised beds warm up faster in spring, letting you start sowing earlier.',
]

export const tipOfTheDay = (date = new Date()) => {
  const start = new Date(date.getFullYear(), 0, 0)
  const day = Math.floor((date - start) / 864e5)
  return DAILY_TIPS[day % DAILY_TIPS.length]
}

export const MONTHLY_TIPS = [
  { month: 'January', plants: ['Hellebore', 'Bare-root roses', 'Fruit trees'], tip: 'Plan the year ahead, order seeds and plant bare-root trees while they are dormant.' },
  { month: 'February', plants: ['Snowdrops', 'Shallots', 'Sweet peas (indoors)'], tip: 'Prune late-flowering shrubs and sow sweet peas on a sunny windowsill.' },
  { month: 'March', plants: ['Potatoes', 'Carrots', 'Summer bulbs'], tip: 'Soil is warming up. Feed borders and start sowing hardy veg outdoors.' },
  { month: 'April', plants: ['Lettuce', 'Herbs', 'Hardy annuals'], tip: 'Sow little and often. Protect seedlings from late frosts with fleece.' },
  { month: 'May', plants: ['Tomatoes', 'Courgettes', 'Bedding plants'], tip: 'After the last frost, plant out tender veg and summer bedding.' },
  { month: 'June', plants: ['Runner beans', 'Basil', 'Dahlias'], tip: 'Water in the evenings, tie in climbers and keep deadheading roses.' },
  { month: 'July', plants: ['Lettuce', 'Autumn bulbs', 'Strawberry runners'], tip: 'Harvest often to keep crops coming and top up ponds in hot spells.' },
  { month: 'August', plants: ['Spring cabbage', 'Lavender cuttings', 'Autumn crocus'], tip: 'Take cuttings of tender perennials and collect seeds from your best plants.' },
  { month: 'September', plants: ['Spring bulbs', 'Perennials', 'Garlic'], tip: 'The best month to plant perennials: warm soil, autumn rain, strong roots.' },
  { month: 'October', plants: ['Tulip bulbs', 'Trees & shrubs', 'Wallflowers'], tip: 'Plant tulips, trees and shrubs now. Rake leaves into leaf-mould bags.' },
  { month: 'November', plants: ['Bare-root hedging', 'Fruit trees', 'Tulips'], tip: 'Plant bare-root hedges, raise pots onto feet and clean your tools.' },
  { month: 'December', plants: ['Amaryllis (indoors)', 'Holly', 'Winter pansies'], tip: 'Prune apple trees, protect tender plants and enjoy winter structure.' },
]

export const BUILD_TASK_TEMPLATE = [
  'Measure the plot and mark out the design with pegs and string',
  'Clear weeds, rubble and old turf',
  'Improve the soil with compost and level the ground',
  'Install fencing, edging and any lighting cables',
  'Lay paths, patio and water features',
  'Build raised beds and prepare borders',
  'Plant trees and shrubs first, then flowers, herbs and grasses',
  'Lay lawn or meadow turf and water everything in',
  'Mulch borders and add seating and finishing touches',
]

export const SOILS = ['loam', 'clay', 'sandy', 'chalk', 'peat', 'silt']
export const SUN_OPTIONS = ['full sun', 'part shade', 'full shade']
export const STYLES = ['Modern', 'Cottage', 'Japanese Zen', 'Mediterranean', 'Vegetable Garden', 'Blank']
export const STATUSES = ['Idea', 'Planning', 'Ready to Build', 'Built']
export const PLANT_TYPES = ['Trees', 'Shrubs', 'Flowers', 'Herbs', 'Vegetables', 'Grasses']
export const MATERIAL_CATEGORIES = ['Lawn', 'Beds', 'Paths', 'Patio', 'Fencing', 'Water Features', 'Seating', 'Lighting']
export const CLIMATE_ZONES = [
  'Cool temperate (UK, N. Europe)',
  'Warm temperate (S. Europe, California)',
  'Mediterranean',
  'Continental (cold winters)',
  'Subtropical',
  'Arid / desert',
]

export const STYLE_META = {
  Modern: { emoji: '◼︎', blurb: 'Clean lines, porcelain, grasses' },
  Cottage: { emoji: '✿', blurb: 'Roses, lavender, overflowing beds' },
  'Japanese Zen': { emoji: '◎', blurb: 'Maples, gravel and water' },
  Mediterranean: { emoji: '☀︎', blurb: 'Olives, herbs and warm stone' },
  'Vegetable Garden': { emoji: '❦', blurb: 'Raised beds and harvests' },
  Blank: { emoji: '＋', blurb: 'Start from an empty plot' },
}

// Starter layouts per style, positioned as fractions of the plot.
export const STYLE_STARTERS = {
  Modern: [
    { m: 'Porcelain Tiles', fx: 0.75, fy: 0.75, w: 0.4, h: 0.35 },
    { m: 'Artificial Grass', fx: 0.35, fy: 0.4, w: 0.5, h: 0.5 },
    { p: 'Blue Fescue', fx: 0.85, fy: 0.25 },
    { p: 'Fountain Grass', fx: 0.75, fy: 0.15 },
  ],
  Cottage: [
    { m: 'Flower Bed', fx: 0.12, fy: 0.5, w: 0.2, h: 0.85 },
    { m: 'Turf Lawn', fx: 0.6, fy: 0.45, w: 0.65, h: 0.6 },
    { p: "Rose 'Gertrude Jekyll'", fx: 0.12, fy: 0.25 },
    { p: 'Lavender', fx: 0.12, fy: 0.55 },
    { p: 'Foxglove', fx: 0.12, fy: 0.75 },
  ],
  'Japanese Zen': [
    { m: 'Gravel Path', fx: 0.5, fy: 0.5, w: 0.8, h: 0.25 },
    { m: 'Wildlife Pond', fx: 0.75, fy: 0.25, w: 0.3, h: 0.25 },
    { p: 'Japanese Maple', fx: 0.25, fy: 0.25 },
    { p: 'Japanese Forest Grass', fx: 0.3, fy: 0.8 },
  ],
  Mediterranean: [
    { m: 'Sandstone Paving', fx: 0.65, fy: 0.7, w: 0.6, h: 0.45 },
    { p: 'Olive Tree', fx: 0.25, fy: 0.3 },
    { p: 'Lavender', fx: 0.2, fy: 0.75 },
    { p: 'Rosemary', fx: 0.35, fy: 0.8 },
  ],
  'Vegetable Garden': [
    { m: 'Raised Bed (Oak)', fx: 0.3, fy: 0.3, w: 0.4, h: 0.25 },
    { m: 'Raised Bed (Oak)', fx: 0.3, fy: 0.7, w: 0.4, h: 0.25 },
    { m: 'Bark Chip Path', fx: 0.7, fy: 0.5, w: 0.12, h: 0.9 },
    { p: "Tomato 'Gardener's Delight'", fx: 0.2, fy: 0.3 },
    { p: 'Lettuce', fx: 0.4, fy: 0.7 },
  ],
  Blank: [],
}
