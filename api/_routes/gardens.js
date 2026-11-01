import { Router } from 'express'
import crypto from 'node:crypto'
import * as db from '../../db/client.js'
import { requireAuth } from '../_lib/auth.js'
import { HttpError, asyncRoute } from '../_lib/http.js'
import { gardenInput, itemsInput } from '../_lib/validate.js'
import { buildShoppingList } from '../../src/lib/garden.js'

// Every query below is scoped to req.userId, so one user can never read or change another user's gardens.
const r = Router()
r.use(requireAuth)

const NOT_FOUND = 'We couldn’t find that garden. It may have been deleted.'
const gid = (req) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id < 1 || id > 2_147_483_647) throw new HttpError(404, NOT_FOUND)
  return id
}
const found = (v) => {
  if (!v) throw new HttpError(404, NOT_FOUND)
  return v
}
async function checkRefs(items) {
  for (const it of items) {
    if (it.item_type === 'plant' && !(await db.plantExists(it.plant_id))) throw new HttpError(400, `Unknown plant #${it.plant_id}.`)
    if (it.item_type === 'material' && !(await db.materialExists(it.material_id))) throw new HttpError(400, `Unknown material #${it.material_id}.`)
  }
}
const byId = (list) => Object.fromEntries(list.map((x) => [x.id, x]))
const taskId = (req) => {
  const id = Number(req.params.taskId)
  if (!Number.isInteger(id) || id < 1 || id > 2_147_483_647) throw new HttpError(404, 'That task no longer exists.')
  return id
}

r.get('/', asyncRoute(async (req, res) => res.json({ gardens: await db.listGardens(req.userId) })))

r.post('/', asyncRoute(async (req, res) => {
  const data = gardenInput(req.body || {})
  const items = itemsInput(req.body?.items || []).map((i) => ({ ...i, id: crypto.randomUUID() }))
  await checkRefs(items)
  res.status(201).json({ garden: await db.createGarden(req.userId, data, items) })
}))

r.get('/:id', asyncRoute(async (req, res) => res.json({ garden: found(await db.getGarden(req.userId, gid(req))) })))

r.patch('/:id', asyncRoute(async (req, res) => {
  const patch = gardenInput(req.body || {}, true)
  res.json({ garden: found(await db.updateGarden(req.userId, gid(req), patch)) })
}))

r.delete('/:id', asyncRoute(async (req, res) => {
  found(await db.deleteGarden(req.userId, gid(req)))
  res.json({ ok: true })
}))

r.post('/:id/duplicate', asyncRoute(async (req, res) => {
  res.status(201).json({ garden: found(await db.duplicateGarden(req.userId, gid(req), () => crypto.randomUUID())) })
}))

r.get('/:id/items', asyncRoute(async (req, res) => res.json({ items: found(await db.getGarden(req.userId, gid(req))).items })))

r.put('/:id/items', asyncRoute(async (req, res) => {
  const items = itemsInput(req.body?.items)
  await checkRefs(items)
  res.json(found(await db.replaceItems(req.userId, gid(req), items)))
}))

r.put('/:id/thumbnail', asyncRoute(async (req, res) => {
  const url = String(req.body?.thumbnail || '')
  if (url.length > 1_500_000 || !/^data:image\/(png|webp|jpeg);base64,[A-Za-z0-9+/=]+$/.test(url)) throw new HttpError(400, 'That thumbnail image isn’t valid.')
  found(await db.setThumbnail(req.userId, gid(req), url))
  res.json({ ok: true })
}))

r.get('/:id/plan', asyncRoute(async (req, res) => {
  const data = found(await db.getPlanData(req.userId, gid(req)))
  const [plants, materials] = await Promise.all([db.listPlants(), db.listMaterials()])
  res.json({ ...data, list: buildShoppingList(data.garden.items, byId(plants), byId(materials)) })
}))

r.patch('/:id/tasks/:taskId', asyncRoute(async (req, res) => {
  const t = await db.setBuildTask(req.userId, gid(req), taskId(req), !!req.body?.completed)
  if (!t) throw new HttpError(404, 'That task no longer exists.')
  res.json({ task: t })
}))

r.patch('/:id/care-tasks/:taskId', asyncRoute(async (req, res) => {
  const t = await db.setCareTask(req.userId, gid(req), taskId(req), !!req.body?.completed)
  if (!t) throw new HttpError(404, 'That care task no longer exists.')
  res.json({ task: t })
}))

export default r
