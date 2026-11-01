-- GardenCraft schema. Safe to run repeatedly (IF NOT EXISTS everywhere).

CREATE TABLE IF NOT EXISTS users (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  email           TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash   TEXT NOT NULL,
  full_name       TEXT NOT NULL,
  unit_preference TEXT NOT NULL DEFAULT 'metric' CHECK (unit_preference IN ('metric', 'imperial')),
  climate_zone    TEXT,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS plants (
  id               INTEGER PRIMARY KEY,
  name             TEXT NOT NULL UNIQUE,
  type             TEXT NOT NULL CHECK (type IN ('Trees', 'Shrubs', 'Flowers', 'Herbs', 'Vegetables', 'Grasses')),
  sun_needs        TEXT NOT NULL CHECK (sun_needs IN ('full sun', 'part shade', 'full shade')),
  water_needs      TEXT NOT NULL CHECK (water_needs IN ('low', 'medium', 'high')),
  soil_types       TEXT NOT NULL,
  mature_height_cm INTEGER NOT NULL,
  mature_spread_cm INTEGER NOT NULL,
  bloom_season     TEXT NOT NULL DEFAULT 'None',
  care_level       TEXT NOT NULL CHECK (care_level IN ('Easy', 'Medium', 'Expert')),
  price_estimate   REAL NOT NULL,
  description      TEXT,
  color            TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS materials (
  id             INTEGER PRIMARY KEY,
  name           TEXT NOT NULL UNIQUE,
  category       TEXT NOT NULL CHECK (category IN ('Paths', 'Patio', 'Fencing', 'Water Features', 'Seating', 'Lighting', 'Beds', 'Lawn')),
  unit           TEXT NOT NULL CHECK (unit IN ('m²', 'metre', 'piece')),
  price_per_unit REAL NOT NULL,
  description    TEXT
);

CREATE TABLE IF NOT EXISTS gardens (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  width        REAL NOT NULL CHECK (width > 0),
  length       REAL NOT NULL CHECK (length > 0),
  shape        TEXT NOT NULL DEFAULT 'rectangle' CHECK (shape IN ('rectangle', 'L-shape', 'custom')),
  sun_exposure TEXT NOT NULL CHECK (sun_exposure IN ('full sun', 'part shade', 'full shade')),
  soil_type    TEXT NOT NULL,
  style        TEXT NOT NULL CHECK (style IN ('Modern', 'Cottage', 'Japanese Zen', 'Mediterranean', 'Vegetable Garden', 'Blank')),
  status       TEXT NOT NULL DEFAULT 'Idea' CHECK (status IN ('Idea', 'Planning', 'Ready to Build', 'Built')),
  budget       REAL NOT NULL DEFAULT 0,
  thumbnail    TEXT,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS garden_items (
  id          TEXT PRIMARY KEY,
  garden_id   INTEGER NOT NULL REFERENCES gardens(id) ON DELETE CASCADE,
  item_type   TEXT NOT NULL CHECK (item_type IN ('plant', 'material')),
  plant_id    INTEGER REFERENCES plants(id),
  material_id INTEGER REFERENCES materials(id),
  x           REAL NOT NULL,
  y           REAL NOT NULL,
  width       REAL NOT NULL,
  height      REAL NOT NULL,
  rotation    REAL NOT NULL DEFAULT 0,
  z_index     INTEGER NOT NULL DEFAULT 0,
  quantity    INTEGER NOT NULL DEFAULT 1,
  CHECK ((item_type = 'plant' AND plant_id IS NOT NULL) OR (item_type = 'material' AND material_id IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS build_tasks (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  garden_id    INTEGER NOT NULL REFERENCES gardens(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  order_index  INTEGER NOT NULL,
  completed    INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS care_tasks (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  garden_id    INTEGER NOT NULL REFERENCES gardens(id) ON DELETE CASCADE,
  plant_id     INTEGER NOT NULL REFERENCES plants(id),
  task_type    TEXT NOT NULL CHECK (task_type IN ('water', 'prune', 'fertilise', 'plant')),
  month        TEXT NOT NULL,
  completed    INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  UNIQUE (garden_id, plant_id, task_type)
);

CREATE INDEX IF NOT EXISTS idx_gardens_user        ON gardens(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_gardens_status      ON gardens(status);
CREATE INDEX IF NOT EXISTS idx_items_garden        ON garden_items(garden_id);
CREATE INDEX IF NOT EXISTS idx_items_plant         ON garden_items(plant_id);
CREATE INDEX IF NOT EXISTS idx_build_tasks_garden  ON build_tasks(garden_id, order_index);
CREATE INDEX IF NOT EXISTS idx_care_tasks_garden   ON care_tasks(garden_id);
CREATE INDEX IF NOT EXISTS idx_plants_type         ON plants(type);
CREATE INDEX IF NOT EXISTS idx_materials_category  ON materials(category);
