// Data service. Every screen talks to this module only; it calls the /api backend.
// The browser never touches the database directly.

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

let onUnauthorized = null
export const setUnauthorizedHandler = (fn) => (onUnauthorized = fn)

const OFFLINE = 'We can’t reach the GardenCraft server. Check that “npm run dev” is running, then try again.'
const FRIENDLY = {
  400: 'Something in that request didn’t look right.',
  401: 'Please log in to continue.',
  404: 'We couldn’t find what you were looking for.',
  413: 'That upload is too large.',
  500: OFFLINE,
  502: OFFLINE,
  503: 'We couldn’t open the GardenCraft database. Run “npm run db:setup” and restart the app.',
  504: OFFLINE,
}

async function request(method, url, body, { keepalive = false, silent401 = false } = {}) {
  let res
  try {
    res = await fetch(url, {
      method,
      credentials: 'same-origin',
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      keepalive,
    })
  } catch {
    throw new ApiError(OFFLINE, 0)
  }
  let data = null
  try {
    data = await res.json()
  } catch {
    /* empty or non-JSON body */
  }
  if (!res.ok) {
    if (res.status === 401 && !silent401) onUnauthorized?.()
    throw new ApiError(data?.error || FRIENDLY[res.status] || `Request failed (${res.status}).`, res.status)
  }
  return data
}

const get = (url, opts) => request('GET', url, undefined, opts)
const send = (method) => (url, body, opts) => request(method, url, body ?? {}, opts)
const post = send('POST')
const put = send('PUT')
const patch = send('PATCH')
const del = (url) => request('DELETE', url)

// Garden ids are numbers in the database; the UI treats them as strings (URLs, <select> values).
const norm = (g) => (g ? { ...g, id: String(g.id) } : g)
const qs = (o) => {
  const p = new URLSearchParams(Object.entries(o).filter(([, v]) => v && v !== 'All'))
  return p.toString() ? `?${p}` : ''
}

export const api = {
  // auth
  me: () => get('/api/auth/me', { silent401: true }).then((d) => d.user),
  login: (email, password) => post('/api/auth/login', { email, password }, { silent401: true }).then((d) => d.user),
  signup: (data) => post('/api/auth/signup', data).then((d) => d.user),
  logout: () => post('/api/auth/logout'),

  // catalog & stats (public)
  async getCatalog() {
    const [p, m] = await Promise.all([get('/api/plants'), get('/api/materials')])
    return { plants: p.plants, materials: m.materials }
  },
  getStats: () => get('/api/stats'),
  getPlants: (filters = {}) => get('/api/plants' + qs(filters)).then((d) => d.plants),

  // gardens
  listGardens: () => get('/api/gardens').then((d) => d.gardens.map(norm)),
  getGarden: (id) => get(`/api/gardens/${id}`).then((d) => norm(d.garden)),
  createGarden: (data) => post('/api/gardens', data).then((d) => norm(d.garden)),
  updateGarden: (id, p) => patch(`/api/gardens/${id}`, p).then((d) => norm(d.garden)),
  duplicateGarden: (id) => post(`/api/gardens/${id}/duplicate`).then((d) => norm(d.garden)),
  deleteGarden: (id) => del(`/api/gardens/${id}`),
  saveItems(id, items) {
    const body = { items }
    return put(`/api/gardens/${id}/items`, body, { keepalive: JSON.stringify(body).length < 60000 })
  },
  saveThumbnail: (id, thumbnail) => put(`/api/gardens/${id}/thumbnail`, { thumbnail }),

  // build plan
  getPlan: (id) => get(`/api/gardens/${id}/plan`).then((d) => ({ ...d, garden: norm(d.garden) })),
  setTaskDone: (gardenId, taskId, completed) => patch(`/api/gardens/${gardenId}/tasks/${taskId}`, { completed }).then((d) => d.task),
  setCareTaskDone: (gardenId, taskId, completed) => patch(`/api/gardens/${gardenId}/care-tasks/${taskId}`, { completed }).then((d) => d.task),

  // profile
  getProfile: () => get('/api/profile'),
  updateProfile: (p) => patch('/api/profile', p).then((d) => d.user),
}
