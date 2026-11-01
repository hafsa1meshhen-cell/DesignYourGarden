// The Express app behind /api. Used by api/index.js (Vercel) and api/_dev-server.js (local).
import './_lib/env.js'
import express from 'express'
import cookieParser from 'cookie-parser'
import { dbStatus } from '../db/client.js'
import { errorHandler } from './_lib/http.js'
import auth from './_routes/auth.js'
import catalog from './_routes/catalog.js'
import gardens from './_routes/gardens.js'
import profile from './_routes/profile.js'

const app = express()
app.disable('x-powered-by')
app.use(express.json({ limit: '2mb' }))
app.use(cookieParser())
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store')
  next()
})

app.get('/api/health', async (req, res) => {
  const s = await dbStatus()
  res.status(s.ok ? 200 : 503).json(s.ok ? { ok: true } : { ok: false, error: 'We couldn’t reach the GardenCraft database. Check DATABASE_URL and run “npm run db:setup”.' })
})
app.use('/api/auth', auth)
app.use('/api', catalog)
app.use('/api/gardens', gardens)
app.use('/api/profile', profile)
app.use('/api', (req, res) => res.status(404).json({ error: 'That API route doesn’t exist.' }))
app.use(errorHandler)

export default app
