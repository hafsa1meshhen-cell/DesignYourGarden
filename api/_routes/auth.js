import { Router } from 'express'
import bcrypt from 'bcryptjs'
import * as db from '../../db/client.js'
import { clearSession, issueSession, readSession } from '../_lib/auth.js'
import { HttpError, asyncRoute } from '../_lib/http.js'
import { signupInput } from '../_lib/validate.js'

const r = Router()
const publicUser = ({ password_hash, ...u }) => u
// Compared against when the email is unknown, so response time doesn't reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10)

r.post('/signup', asyncRoute(async (req, res) => {
  const input = signupInput(req.body || {})
  if (await db.findUserByEmail(input.email)) throw new HttpError(409, 'An account with that email already exists. Try logging in instead.')
  const password_hash = await bcrypt.hash(input.password, 10)
  const user = await db.createUser({ ...input, password_hash })
  await issueSession(res, user)
  res.status(201).json({ user })
}))

r.post('/login', asyncRoute(async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase()
  const password = String(req.body?.password || '')
  const user = email ? await db.findUserByEmail(email) : null
  const ok = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH)
  if (!user || !ok) throw new HttpError(401, 'That email and password don’t match. Please try again.')
  await issueSession(res, user)
  res.json({ user: publicUser(user) })
}))

r.post('/logout', (req, res) => {
  clearSession(res)
  res.json({ ok: true })
})

r.get('/me', asyncRoute(async (req, res) => {
  const s = await readSession(req)
  const user = s ? await db.findUserById(s.id) : null
  if (!user) {
    if (s) clearSession(res)
    return res.json({ user: null })
  }
  res.json({ user })
}))

export default r
