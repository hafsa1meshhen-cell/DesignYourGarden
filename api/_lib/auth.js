import { SignJWT, jwtVerify } from 'jose'
import { env } from './env.js'

export const COOKIE = 'gc_token'
const key = new TextEncoder().encode(env.JWT_SECRET)
const MAX_AGE = 7 * 24 * 3600

export async function issueSession(res, user) {
  const token = await new SignJWT({ email: user.email }).setProtectedHeader({ alg: 'HS256' }).setSubject(String(user.id)).setIssuedAt().setExpirationTime(`${MAX_AGE}s`).sign(key)
  res.cookie(COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: env.isProd, maxAge: MAX_AGE * 1000, path: '/' })
}

export function clearSession(res) {
  res.clearCookie(COOKIE, { httpOnly: true, sameSite: 'lax', secure: env.isProd, path: '/' })
}

export async function readSession(req) {
  const token = req.cookies?.[COOKIE]
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'] })
    return { id: Number(payload.sub), email: payload.email }
  } catch {
    return null
  }
}

// Middleware: rejects the request unless a valid session cookie is present.
export async function requireAuth(req, res, next) {
  const s = await readSession(req)
  if (!s) return res.status(401).json({ error: 'Please log in to continue.' })
  req.userId = s.id
  next()
}
