import { Router } from 'express'
import * as db from '../db/client.js'
import { requireAuth } from './_lib/auth.js'
import { HttpError, asyncRoute } from './_lib/http.js'
import { computeProfile } from '../src/lib/garden.js'

const r = Router()
r.use(requireAuth)
const byId = (rows) => Object.fromEntries(rows.map((x) => [x.id, x]))

r.get('/', asyncRoute(async (req, res) => {
  const user = db.findUserById(req.userId)
  if (!user) throw new HttpError(401, 'Please log in to continue.')
  const gardens = db.listGardens(req.userId)
  res.json({ user, ...computeProfile(gardens, byId(db.listPlants()), byId(db.listMaterials())) })
}))

r.patch('/', asyncRoute(async (req, res) => {
  const patch = {}
  const b = req.body || {}
  if (b.unit_preference !== undefined) {
    if (!['metric', 'imperial'].includes(b.unit_preference)) throw new HttpError(400, 'Unit must be metric or imperial.')
    patch.unit_preference = b.unit_preference
  }
  if (b.full_name !== undefined) {
    const n = String(b.full_name).trim().slice(0, 80)
    if (!n) throw new HttpError(400, 'Your name can’t be empty.')
    patch.full_name = n
  }
  if (b.climate_zone !== undefined) patch.climate_zone = String(b.climate_zone).slice(0, 80)
  res.json({ user: db.updateUser(req.userId, patch) })
}))

export default r
