// Local API server. Vite proxies /api/* here during development.
import { env } from './_lib/env.js'
import express from 'express'
import cookieParser from 'cookie-parser'
import { dbStatus } from '../db/client.js'
import { errorHandler } from './_lib/http.js'
import auth from './auth.js'
import catalog from './catalog.js'
import gardens from './gardens.js'
import profile from './profile.js'

const app = express()
app.disable('x-powered-by')
app.use(express.json({ limit: '2mb' }))
app.use(cookieParser())
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store')
  next()
})

app.get('/api/health', (req, res) => {
  const s = dbStatus()
  res.status(s.ok ? 200 : 503).json(s.ok ? { ok: true } : { ok: false, error: 'We couldn’t open the GardenCraft database. Run “npm run db:setup” and restart the app.' })
})
app.use('/api/auth', auth)
app.use('/api', catalog)
app.use('/api/gardens', gardens)
app.use('/api/profile', profile)
app.use('/api', (req, res) => res.status(404).json({ error: 'That API route doesn’t exist.' }))
app.use(errorHandler)

app.listen(env.API_PORT, '127.0.0.1', () => {
  const s = dbStatus()
  console.log(`🌿 GardenCraft API on http://127.0.0.1:${env.API_PORT}`)
  console.log(s.ok ? `   Database: ${s.path}` : `   ⚠ Database not available (${s.error}). Run "npm run db:setup".`)
})
