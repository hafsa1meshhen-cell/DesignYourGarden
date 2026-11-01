// The ONLY module that talks to the database. Swap this file to move to a cloud database;
// the API routes and the screens only use the functions exported below.
import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Database from 'better-sqlite3'
import { careTasksFor } from '../api/_lib/care.js'
import { BUILD_TASK_TEMPLATE } from '../src/data/content.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const DB_PATH = path.resolve(ROOT, process.env.DATABASE_PATH || 'db/gardencraft.db')

export class DbUnavailableError extends Error {
  constructor(cause) {
    super('We couldn’t open the GardenCraft database. Run “npm run db:setup” and restart the app.')
    this.cause = cause
    this.status = 503
  }
}

let db = null
let openError = null

export function getDb() {
  if (db) return db
  try {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
    const conn = new Database(DB_PATH)
    conn.pragma('journal_mode = WAL')
    conn.pragma('foreign_keys = ON')
    conn.pragma('busy_timeout = 5000')
    const ok = conn.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='plants'").get()
    if (!ok) {
      conn.close()
      throw new Error(`Tables are missing in ${DB_PATH}`)
    }
    db = conn
    openError = null
    return db
  } catch (e) {
    openError = e
    throw new DbUnavailableError(e)
  }
}

export function dbStatus() {
  try {
    getDb()
    return { ok: true, path: DB_PATH }
  } catch {
    return { ok: false, path: DB_PATH, error: openError?.message }
  }
}

// Used by the setup script: opens (creating if needed) without the tables check.
export function runSqlFiles(files) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
  const conn = new Database(DB_PATH)
  conn.pragma('journal_mode = WAL')
  conn.pragma('foreign_keys = ON')
  for (const f of files) conn.exec(fs.readFileSync(path.resolve(ROOT, f), 'utf8'))
  const counts = Object.fromEntries(['users', 'plants', 'materials', 'gardens', 'garden_items', 'build_tasks', 'care_tasks'].map((t) => [t, conn.prepare(`SELECT COUNT(*) n FROM ${t}`).get().n]))
  conn.close()
  return counts
}

export function closeDb() {
  db?.close()
  db = null
}

const now = () => new Date().toISOString()
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const bool = (r, k = 'completed') => (r ? { ...r, [k]: !!r[k] } : r)

// ---------- users ----------
export function createUser({ email, password_hash, full_name, unit_preference, climate_zone }) {
  const info = getDb()
    .prepare('INSERT INTO users (email, password_hash, full_name, unit_preference, climate_zone) VALUES (?, ?, ?, ?, ?)')
    .run(email, password_hash, full_name, unit_preference, climate_zone)
  return findUserById(info.lastInsertRowid)
}
export const findUserByEmail = (email) => getDb().prepare('SELECT * FROM users WHERE email = ?').get(email)
export const findUserById = (id) => getDb().prepare('SELECT id, email, full_name, unit_preference, climate_zone, created_at FROM users WHERE id = ?').get(id)
export function updateUser(id, patch) {
  const fields = ['full_name', 'unit_preference', 'climate_zone'].filter((k) => k in patch)
  if (fields.length) getDb().prepare(`UPDATE users SET ${fields.map((f) => `${f} = @${f}`).join(', ')} WHERE id = @id`).run({ ...patch, id })
  return findUserById(id)
}

// ---------- catalog ----------
export function listPlants({ type, sun, water, care, q } = {}) {
  const where = []
  const args = {}
  if (type && type !== 'All') (where.push('type = @type'), (args.type = type))
  if (sun) (where.push('sun_needs = @sun'), (args.sun = sun))
  if (water) (where.push('water_needs = @water'), (args.water = water))
  if (care) (where.push('care_level = @care'), (args.care = care))
  if (q) (where.push("name LIKE @q ESCAPE '\\'"), (args.q = `%${q.replace(/[%_\\]/g, '\\$&')}%`))
  return getDb().prepare(`SELECT * FROM plants ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY id`).all(args)
}
export const listMaterials = () => getDb().prepare('SELECT * FROM materials ORDER BY id').all()

export function getStats() {
  const d = getDb()
  return {
    gardens: d.prepare('SELECT COUNT(*) n FROM gardens').get().n,
    plants: d.prepare("SELECT COALESCE(SUM(quantity), 0) n FROM garden_items WHERE item_type = 'plant'").get().n,
    built: d.prepare("SELECT COUNT(*) n FROM gardens WHERE status = 'Built'").get().n,
  }
}

// ---------- gardens ----------
const ITEM_COLS = 'id, item_type, plant_id, material_id, x, y, width, height, rotation, z_index, quantity'

function itemsFor(gardenIds) {
  if (!gardenIds.length) return {}
  const rows = getDb().prepare(`SELECT garden_id, ${ITEM_COLS} FROM garden_items WHERE garden_id IN (${gardenIds.map(() => '?').join(',')}) ORDER BY z_index, rowid`).all(...gardenIds)
  const out = {}
  for (const { garden_id, ...it } of rows) (out[garden_id] = out[garden_id] || []).push(it)
  return out
}

export function listGardens(userId) {
  const gardens = getDb().prepare('SELECT * FROM gardens WHERE user_id = ? ORDER BY updated_at DESC').all(userId)
  const items = itemsFor(gardens.map((g) => g.id))
  return gardens.map((g) => ({ ...g, items: items[g.id] || [] }))
}

const ownGarden = (userId, id) => getDb().prepare('SELECT * FROM gardens WHERE id = ? AND user_id = ?').get(id, userId)

export function getGarden(userId, id) {
  const g = ownGarden(userId, id)
  if (!g) return null
  return { ...g, items: itemsFor([g.id])[g.id] || [] }
}

const insertItem = () =>
  getDb().prepare(`INSERT INTO garden_items (${ITEM_COLS}, garden_id) VALUES (@id, @item_type, @plant_id, @material_id, @x, @y, @width, @height, @rotation, @z_index, @quantity, @garden_id)`)

function insertBuildTasks(gardenId) {
  const st = getDb().prepare('INSERT INTO build_tasks (garden_id, title, order_index) VALUES (?, ?, ?)')
  BUILD_TASK_TEMPLATE.forEach((t, i) => st.run(gardenId, t, i))
}

function syncCareTasks(gardenId) {
  const d = getDb()
  const plants = d.prepare("SELECT DISTINCT p.* FROM garden_items gi JOIN plants p ON p.id = gi.plant_id WHERE gi.garden_id = ? AND gi.item_type = 'plant'").all(gardenId)
  const ids = plants.map((p) => p.id)
  d.prepare(`DELETE FROM care_tasks WHERE garden_id = ? ${ids.length ? `AND plant_id NOT IN (${ids.map(() => '?').join(',')})` : ''}`).run(gardenId, ...ids)
  const ins = d.prepare('INSERT OR IGNORE INTO care_tasks (garden_id, plant_id, task_type, month) VALUES (?, ?, ?, ?)')
  for (const p of plants) for (const c of careTasksFor(p)) ins.run(gardenId, p.id, c.task_type, c.month)
}

export function createGarden(userId, data, items = []) {
  const d = getDb()
  return d.transaction(() => {
    const t = now()
    const info = d
      .prepare(`INSERT INTO gardens (user_id, name, width, length, shape, sun_exposure, soil_type, style, status, budget, created_at, updated_at)
                VALUES (@user_id, @name, @width, @length, @shape, @sun_exposure, @soil_type, @style, @status, @budget, @t, @t)`)
      .run({ ...data, user_id: userId, status: items.length ? 'Planning' : 'Idea', t })
    const gid = info.lastInsertRowid
    const ins = insertItem()
    for (const it of items) ins.run({ ...it, garden_id: gid })
    insertBuildTasks(gid)
    syncCareTasks(gid)
    return getGarden(userId, gid)
  })()
}

export function updateGarden(userId, id, patch) {
  if (!ownGarden(userId, id)) return null
  const fields = ['name', 'status', 'budget', 'sun_exposure', 'soil_type', 'style', 'width', 'length', 'shape'].filter((k) => k in patch)
  getDb()
    .prepare(`UPDATE gardens SET ${[...fields.map((f) => `${f} = @${f}`), 'updated_at = @t'].join(', ')} WHERE id = @id AND user_id = @user_id`)
    .run({ ...patch, t: now(), id, user_id: userId })
  return getGarden(userId, id)
}

export function duplicateGarden(userId, id, newItemId) {
  const src = getGarden(userId, id)
  if (!src) return null
  const { name, width, length, shape, sun_exposure, soil_type, style, budget, thumbnail } = src
  const copy = createGarden(userId, { name: `${name} (copy)`, width, length, shape, sun_exposure, soil_type, style, budget }, src.items.map((i) => ({ ...i, id: newItemId() })))
  getDb().prepare('UPDATE gardens SET thumbnail = ? WHERE id = ?').run(thumbnail, copy.id)
  return { ...copy, thumbnail }
}

export function deleteGarden(userId, id) {
  return getDb().prepare('DELETE FROM gardens WHERE id = ? AND user_id = ?').run(id, userId).changes > 0
}

// Replaces the full item set of a garden in one transaction (upsert + delete missing).
export function replaceItems(userId, id, items) {
  const d = getDb()
  return d.transaction(() => {
    const g = ownGarden(userId, id)
    if (!g) return null
    const ids = items.map((i) => i.id)
    d.prepare(`DELETE FROM garden_items WHERE garden_id = ? ${ids.length ? `AND id NOT IN (${ids.map(() => '?').join(',')})` : ''}`).run(id, ...ids)
    const up = d.prepare(`INSERT INTO garden_items (${ITEM_COLS}, garden_id) VALUES (@id, @item_type, @plant_id, @material_id, @x, @y, @width, @height, @rotation, @z_index, @quantity, @garden_id)
      ON CONFLICT(id) DO UPDATE SET x = excluded.x, y = excluded.y, width = excluded.width, height = excluded.height, rotation = excluded.rotation,
      z_index = excluded.z_index, quantity = excluded.quantity WHERE garden_items.garden_id = excluded.garden_id`)
    for (const it of items) {
      const res = up.run({ ...it, garden_id: id })
      if (res.changes === 0) throw Object.assign(new Error('An item id clashes with another garden.'), { status: 400 })
    }
    const status = g.status === 'Idea' && items.length ? 'Planning' : g.status
    const t = now()
    d.prepare('UPDATE gardens SET status = ?, updated_at = ? WHERE id = ?').run(status, t, id)
    syncCareTasks(id)
    return { ok: true, status, updated_at: t, count: items.length }
  })()
}

export function setThumbnail(userId, id, dataUrl) {
  return getDb().prepare('UPDATE gardens SET thumbnail = ? WHERE id = ? AND user_id = ?').run(dataUrl, id, userId).changes > 0
}

export function getPlanData(userId, id) {
  const g = getGarden(userId, id)
  if (!g) return null
  const d = getDb()
  const tasks = d.prepare('SELECT id, title, order_index, completed, completed_at FROM build_tasks WHERE garden_id = ? ORDER BY order_index').all(id).map((r) => bool(r))
  const care = d
    .prepare('SELECT c.id, c.plant_id, p.name AS plant_name, c.task_type, c.month, c.completed, c.completed_at FROM care_tasks c JOIN plants p ON p.id = c.plant_id WHERE c.garden_id = ?')
    .all(id)
    .map((r) => bool(r))
    .sort((a, b) => MONTHS.indexOf(a.month) - MONTHS.indexOf(b.month) || a.plant_name.localeCompare(b.plant_name))
  return { garden: g, tasks, care_tasks: care }
}

export function setBuildTask(userId, gardenId, taskId, completed) {
  if (!ownGarden(userId, gardenId)) return null
  const t = completed ? now() : null
  const res = getDb().prepare('UPDATE build_tasks SET completed = ?, completed_at = ? WHERE id = ? AND garden_id = ?').run(completed ? 1 : 0, t, taskId, gardenId)
  return res.changes ? bool(getDb().prepare('SELECT id, title, order_index, completed, completed_at FROM build_tasks WHERE id = ?').get(taskId)) : null
}

export function setCareTask(userId, gardenId, taskId, completed) {
  if (!ownGarden(userId, gardenId)) return null
  const res = getDb().prepare('UPDATE care_tasks SET completed = ?, completed_at = ? WHERE id = ? AND garden_id = ?').run(completed ? 1 : 0, completed ? now() : null, taskId, gardenId)
  return res.changes ? { id: taskId, completed } : null
}

export const plantExists = (id) => !!getDb().prepare('SELECT 1 FROM plants WHERE id = ?').get(id)
export const materialExists = (id) => !!getDb().prepare('SELECT 1 FROM materials WHERE id = ?').get(id)
