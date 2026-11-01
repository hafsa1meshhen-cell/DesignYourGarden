// Local API server for development. Vite proxies /api/* here (see vite.config.js).
import { env } from './_lib/env.js'
import app from './_app.js'
import { dbStatus } from '../db/client.js'

app.listen(env.API_PORT, '127.0.0.1', async () => {
  console.log(`GardenCraft API on http://127.0.0.1:${env.API_PORT}`)
  const s = await dbStatus()
  console.log(s.ok ? `   Database: ${s.where}` : `   Database not available at ${s.where} (${s.error}). Set DATABASE_URL in .env and run "npm run db:setup".`)
})
