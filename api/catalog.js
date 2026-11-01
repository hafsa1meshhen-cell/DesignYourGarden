import { Router } from 'express'
import * as db from '../db/client.js'
import { asyncRoute } from './_lib/http.js'

const r = Router()

r.get('/plants', asyncRoute(async (req, res) => {
  const { type, sun, water, care, q } = req.query
  res.json({ plants: db.listPlants({ type, sun, water, care, q: q ? String(q).slice(0, 60) : '' }) })
}))

r.get('/materials', asyncRoute(async (req, res) => res.json({ materials: db.listMaterials() })))

r.get('/stats', asyncRoute(async (req, res) => res.json(db.getStats())))

export default r
