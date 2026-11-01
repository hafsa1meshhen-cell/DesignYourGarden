// Loads .env and makes sure a strong JWT_SECRET exists.
// Locally a missing secret is generated into .env; on Vercel it must be set as an environment variable.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const ENV_FILE = path.join(ROOT, '.env')
dotenv.config({ path: ENV_FILE })

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  if (process.env.VERCEL) throw new Error('JWT_SECRET is missing. Add it in Vercel → Project → Settings → Environment Variables (at least 32 characters).')
  const secret = crypto.randomBytes(48).toString('base64url')
  let text = fs.existsSync(ENV_FILE) ? fs.readFileSync(ENV_FILE, 'utf8') : ''
  text = /^JWT_SECRET=.*$/m.test(text) ? text.replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${secret}`) : `${text}${text && !text.endsWith('\n') ? '\n' : ''}JWT_SECRET=${secret}\n`
  if (!/^DATABASE_URL=/m.test(text)) text += 'DATABASE_URL=\n'
  fs.writeFileSync(ENV_FILE, text)
  process.env.JWT_SECRET = secret
  console.log('Generated a new JWT_SECRET and saved it to .env')
}

export const env = {
  JWT_SECRET: process.env.JWT_SECRET,
  API_PORT: Number(process.env.API_PORT) || 5181,
  isProd: process.env.NODE_ENV === 'production' || !!process.env.VERCEL,
}
