// Small helpers for consistent JSON errors.
export class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

export const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

export function errorHandler(err, req, res, _next) {
  const status = err.status || (err.type === 'entity.too.large' ? 413 : 500)
  if (status >= 500 && status !== 503) console.error('API error:', err)
  const message =
    status === 413 ? 'That upload is too large.' : status >= 500 && status !== 503 ? 'Something went wrong on our side. Please try again.' : err.message
  res.status(status).json({ error: message })
}
