// The ONLY module that talks to the database (PostgreSQL, hosted on Neon).
// The API routes and the screens only use the async functions exported below.
import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import { careTasksFor } from '../api/_lib/care.js'
import { BUILD_TASK_TEMPLATE } from '../src/data/content.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const URL_ = process.env.DATABASE_URL || ''

export class DbUnavailableError extends Error {
  constructor(cause) {
    super('We couldn’t reach the GardenCraft database. Check DATABASE_URL, run “npm run db:setup”, then try again.')
    this.cause = cause
    this.status = 503
  }
}

// Where the database lives, without the password (safe to print).
export function dbLabel() {
  try {
    const u = new URL(URL_)
    return `${u.hostname}${u.pathname}`
  } catch {
    return '(DATABASE_URL not set)'
  }
}

let pool = null
function getPool() {
  if (!URL_) throw new DbUnavailableError(new Error('DATABASE_URL is not set'))
  if (!pool) {
    const local = /@(localhost|127\.0\.0\.1)[:/]/.test(URL_)
    // TLS is configured explicitly below (full certificate checks), so drop the URL's sslmode hints.
    const conn = new URL(URL_)
    conn.searchParams.delete('sslmode')
    conn.searchParams.delete('channel_binding')
    pool = new pg.Pool({
      connectionString: conn.toString(),
      ssl: local ? false : { rejectUnauthorized: true },
      max: Number(process.env.PG_POOL_MAX) || (process.env.VERCEL ? 3 : 8),
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 8_000,
    })
    pool.on('error', () => {}) // idle client dropped by the server; the pool replaces it
  }
  return pool
}

// Connection / missing-table problems become a friendly 503; everything else bubbles up.
const UNAVAILABLE = new Set(['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET', 'EAI_AGAIN', '42P01', '3D000', '28P01', '28000', '57P03'])
function wrap(e) {
  if (e instanceof DbUnavailableError) return e
  if (UNAVAILABLE.has(e.code) || /timeout|connect/i.test(e.message || '')) return new DbUnavailableError(e)
  return e
}

async function q(sql, params = [], client = null) {
  try {
    return await (client || getPool()).query(sql, params)
  } catch (e) {
    throw wrap(e)
  }
}
const rows = async (sql, params, c) => (await q(sql, params, c)).rows
const one = async (sql, params, c) => (await q(sql, params, c)).rows[0] || null

async function tx(fn) {
  let client
  try {
    client = await getPool().connect()
  } catch (e) {
    throw wrap(e)
  }
  try {
    await client.query('BEGIN')
    const out = await fn(client)
    await client.query('COMMIT')
    return out
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {})
    throw wrap(e)
  } finally {
    client.release()
  }
}

export async function dbStatus() {
  try {
    await q('SELECT 1 FROM plants LIMIT 1')
    return { ok: true, where: dbLabel() }
  } catch (e) {
    return { ok: false, where: dbLabel(), error: e.cause?.message || e.message }
  }
}

// Used by the setup script.
export async function runSqlFiles(files) {
  for (const f of files) await q(fs.readFileSync(path.resolve(ROOT, f), 'utf8'))
  const counts = {}
  for (const t of ['users', 'plants', 'materials', 'gardens', 'garden_items', 'build_tasks', 'care_tasks']) counts[t] = (await one(`SELECT COUNT(*)::int AS n FROM ${t}`)).n
  return counts
}

export async function dropAll() {
  await q('DROP TABLE IF EXISTS care_tasks, build_tasks, garden_items, gardens, materials, plants, users CASCADE')
}

export async function closeDb() {
  await pool?.end()
  pool = null
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

// ---------- users ----------
const USER_COLS = 'id, email, full_name, unit_preference, climate_zone, created_at'

export const createUser = ({ email, password_hash, full_name, unit_preference, climate_zone }) =>
  one(`INSERT INTO users (email, password_hash, full_name, unit_preference, climate_zone) VALUES ($1, $2, $3, $4, $5) RETURNING ${USER_COLS}`, [email, password_hash, full_name, unit_preference, climate_zone])
export const findUserByEmail = (email) => one('SELECT * FROM users WHERE lower(email) = lower($1)', [email])
export const findUserById = (id) => one(`SELECT ${USER_COLS} FROM users WHERE id = $1`, [id])

export async function updateUser(id, patch) {
  const fields = ['full_name', 'unit_preference', 'climate_zone'].filter((k) => k in patch)
  if (fields.length) await q(`UPDATE users SET ${fields.map((f, i) => `${f} = $${i + 2}`).join(', ')} WHERE id = $1`, [id, ...fields.map((f) => patch[f])])
  return findUserById(id)
}

// ---------- catalog ----------
export function listPlants({ type, sun, water, care, q: search } = {}) {
  const where = []
  const args = []
  const add = (sql, v) => {
    args.push(v)
    where.push(sql.replace('?', `$${args.length}`))
  }
  if (type && type !== 'All') add('type = ?', type)
  if (sun) add('sun_needs = ?', sun)
  if (water) add('water_needs = ?', water)
  if (care) add('care_level = ?', care)
  if (search) add("name ILIKE ? ESCAPE '\\'", `%${search.replace(/[%_\\]/g, '\\$&')}%`)
  return rows(`SELECT * FROM plants ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY id`, args)
}
export const listMaterials = () => rows('SELECT * FROM materials ORDER BY id')

export async function getStats() {
  const r = await one(`SELECT
    (SELECT COUNT(*)::int FROM gardens) AS gardens,
    (SELECT COALESCE(SUM(quantity), 0)::int FROM garden_items WHERE item_type = 'plant') AS plants,
    (SELECT COUNT(*)::int FROM gardens WHERE status = 'Built') AS built`)
  return r
}

// ---------- gardens ----------
const ITEM_COLS = 'id, item_type, plant_id, material_id, x, y, width, height, rotation, z_index, quantity'

async function itemsFor(gardenIds, c) {
  if (!gardenIds.length) return {}
  const list = await rows(`SELECT garden_id, ${ITEM_COLS} FROM garden_items WHERE garden_id = ANY($1::int[]) ORDER BY z_index, id`, [gardenIds], c)
  const out = {}
  for (const { garden_id, ...it } of list) (out[garden_id] = out[garden_id] || []).push(it)
  return out
}

export async function listGardens(userId) {
  const gardens = await rows('SELECT * FROM gardens WHERE user_id = $1 ORDER BY updated_at DESC', [userId])
  const items = await itemsFor(gardens.map((g) => g.id))
  return gardens.map((g) => ({ ...g, items: items[g.id] || [] }))
}

const ownGarden = (userId, id, c) => one('SELECT * FROM gardens WHERE id = $1 AND user_id = $2', [id, userId], c)

export async function getGarden(userId, id, c) {
  const g = await ownGarden(userId, id, c)
  if (!g) return null
  return { ...g, items: (await itemsFor([g.id], c))[g.id] || [] }
}

const ITEM_PARAMS = (it, gardenId) => [it.id, it.item_type, it.plant_id, it.material_id, it.x, it.y, it.width, it.height, it.rotation, it.z_index, it.quantity, gardenId]
const INSERT_ITEM = `INSERT INTO garden_items (${ITEM_COLS}, garden_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`

async function syncCareTasks(gardenId, c) {
  const plants = await rows("SELECT DISTINCT p.* FROM garden_items gi JOIN plants p ON p.id = gi.plant_id WHERE gi.garden_id = $1 AND gi.item_type = 'plant'", [gardenId], c)
  await q('DELETE FROM care_tasks WHERE garden_id = $1 AND NOT (plant_id = ANY($2::int[]))', [gardenId, plants.map((p) => p.id)], c)
  for (const p of plants)
    for (const t of careTasksFor(p))
      await q('INSERT INTO care_tasks (garden_id, plant_id, task_type, month) VALUES ($1, $2, $3, $4) ON CONFLICT (garden_id, plant_id, task_type) DO NOTHING', [gardenId, p.id, t.task_type, t.month], c)
}

export function createGarden(userId, data, items = []) {
  return tx(async (c) => {
    const g = await one(
      `INSERT INTO gardens (user_id, name, width, length, shape, sun_exposure, soil_type, style, status, budget)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [userId, data.name, data.width, data.length, data.shape, data.sun_exposure, data.soil_type, data.style, items.length ? 'Planning' : 'Idea', data.budget],
      c,
    )
    for (const it of items) await q(INSERT_ITEM, ITEM_PARAMS(it, g.id), c)
    for (const [i, title] of BUILD_TASK_TEMPLATE.entries()) await q('INSERT INTO build_tasks (garden_id, title, order_index) VALUES ($1, $2, $3)', [g.id, title, i], c)
    await syncCareTasks(g.id, c)
    return getGarden(userId, g.id, c)
  })
}

export async function updateGarden(userId, id, patch) {
  const fields = ['name', 'status', 'budget', 'sun_exposure', 'soil_type', 'style', 'width', 'length', 'shape'].filter((k) => k in patch)
  const sets = [...fields.map((f, i) => `${f} = $${i + 3}`), 'updated_at = now()']
  const res = await q(`UPDATE gardens SET ${sets.join(', ')} WHERE id = $1 AND user_id = $2`, [id, userId, ...fields.map((f) => patch[f])])
  return res.rowCount ? getGarden(userId, id) : null
}

export async function duplicateGarden(userId, id, newItemId) {
  const src = await getGarden(userId, id)
  if (!src) return null
  const { name, width, length, shape, sun_exposure, soil_type, style, budget, thumbnail } = src
  const copy = await createGarden(userId, { name: `${name} (copy)`, width, length, shape, sun_exposure, soil_type, style, budget }, src.items.map((i) => ({ ...i, id: newItemId() })))
  await q('UPDATE gardens SET thumbnail = $1 WHERE id = $2', [thumbnail, copy.id])
  return { ...copy, thumbnail }
}

export async function deleteGarden(userId, id) {
  return (await q('DELETE FROM gardens WHERE id = $1 AND user_id = $2', [id, userId])).rowCount > 0
}

// Replaces the full item set of a garden in one transaction (upsert + delete missing).
export function replaceItems(userId, id, items) {
  return tx(async (c) => {
    const g = await one('SELECT * FROM gardens WHERE id = $1 AND user_id = $2 FOR UPDATE', [id, userId], c)
    if (!g) return null
    await q('DELETE FROM garden_items WHERE garden_id = $1 AND NOT (id = ANY($2::text[]))', [id, items.map((i) => i.id)], c)
    for (const it of items) {
      const res = await q(
        `${INSERT_ITEM} ON CONFLICT (id) DO UPDATE SET x = EXCLUDED.x, y = EXCLUDED.y, width = EXCLUDED.width, height = EXCLUDED.height,
         rotation = EXCLUDED.rotation, z_index = EXCLUDED.z_index, quantity = EXCLUDED.quantity WHERE garden_items.garden_id = EXCLUDED.garden_id`,
        ITEM_PARAMS(it, id),
        c,
      )
      if (res.rowCount === 0) throw Object.assign(new Error('An item id clashes with another garden.'), { status: 400 })
    }
    const status = g.status === 'Idea' && items.length ? 'Planning' : g.status
    const r = await one('UPDATE gardens SET status = $1, updated_at = now() WHERE id = $2 RETURNING updated_at', [status, id], c)
    await syncCareTasks(id, c)
    return { ok: true, status, updated_at: r.updated_at, count: items.length }
  })
}

export async function setThumbnail(userId, id, dataUrl) {
  return (await q('UPDATE gardens SET thumbnail = $1 WHERE id = $2 AND user_id = $3', [dataUrl, id, userId])).rowCount > 0
}

export async function getPlanData(userId, id) {
  const g = await getGarden(userId, id)
  if (!g) return null
  const tasks = await rows('SELECT id, title, order_index, completed, completed_at FROM build_tasks WHERE garden_id = $1 ORDER BY order_index', [id])
  const care = (await rows('SELECT c.id, c.plant_id, p.name AS plant_name, c.task_type, c.month, c.completed, c.completed_at FROM care_tasks c JOIN plants p ON p.id = c.plant_id WHERE c.garden_id = $1', [id]))
    .sort((a, b) => MONTHS.indexOf(a.month) - MONTHS.indexOf(b.month) || a.plant_name.localeCompare(b.plant_name))
  return { garden: g, tasks, care_tasks: care }
}

export async function setBuildTask(userId, gardenId, taskId, completed) {
  if (!(await ownGarden(userId, gardenId))) return null
  return one(
    `UPDATE build_tasks SET completed = $1, completed_at = CASE WHEN $1 THEN now() ELSE NULL END WHERE id = $2 AND garden_id = $3
     RETURNING id, title, order_index, completed, completed_at`,
    [completed, taskId, gardenId],
  )
}

export async function setCareTask(userId, gardenId, taskId, completed) {
  if (!(await ownGarden(userId, gardenId))) return null
  const r = await q('UPDATE care_tasks SET completed = $1, completed_at = CASE WHEN $1 THEN now() ELSE NULL END WHERE id = $2 AND garden_id = $3', [completed, taskId, gardenId])
  return r.rowCount ? { id: taskId, completed } : null
}

export const plantExists = async (id) => !!(await one('SELECT 1 FROM plants WHERE id = $1', [id]))
export const materialExists = async (id) => !!(await one('SELECT 1 FROM materials WHERE id = $1', [id]))
