import './env.js'
import express from 'express'
import cors from 'cors'

import authRoutes      from './routes/auth.routes.js'
import employerRoutes   from './routes/employer.routes.js'
import hrManagerRoutes  from './routes/hr-manager.routes.js'
import messagesRoutes    from './routes/messages.routes.js'
import announcementsRoutes from './routes/announcements.routes.js'
import { requirePermission } from './middleware/rbac.middleware.js'
import { UPLOAD_DIR } from './middleware/upload.js'

const app = express()

app.use(cors())
app.use(express.json({ limit: '4mb' }))
app.use('/uploads', express.static(UPLOAD_DIR))

// ─── Public routes ────────────────────────────────────────────
app.use('/api/auth', authRoutes)

// ─── Protected / dashboard routes ─────────────────────────────
app.use('/api/employer',   employerRoutes)
app.use('/api/hr-manager', hrManagerRoutes)
app.use('/api/messages', messagesRoutes)

// Announcements are read by every signed-in account - the employee portal shows
// them too - so the read is left to the route's own filtering. Writing is HR
// work and is permission-checked.
//
// The guard sits here rather than inside the router because the announcement
// router and controller are the user's own in-progress files, and a guard in
// front of them gets the 403 enforced without editing them. The controller
// keeps its own role check as a second layer.
app.post('/api/announcements', ...requirePermission('announcements.create'))
app.delete('/api/announcements/:id', ...requirePermission('announcements.delete'))
app.use('/api/announcements', announcementsRoutes)

// ─── 404 fallback ─────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ message: 'Not found' })
})

// ─── Error handler ────────────────────────────────────────────
//
// Last in the stack, and only reached when a controller throws or a route
// rejects. Without it Express answers with its own HTML 500 page, which is
// why a failing request used to surface in the browser as a bare
// "500 (Internal Server Error)" with nothing usable in the response body.
//
// Two things are fixed here:
//   1. The response is JSON, so `response.json()` in the frontend succeeds and
//      the UI can show a real message instead of a parse failure.
//   2. Every 5xx is logged with the method, path and a stable error code, so
//      the cause is recoverable from the server console instead of guessing.
//
// Internal details (stack traces, SQL, file paths) are never returned to the
// client - only logged. The code is safe to show because it is built from
// names this codebase already uses in its own responses.
app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error)
  }

  const status = Number(error?.status || error?.statusCode) || 500

  // 4xx means the request itself was wrong; those are the controller's
  // business and already carry a message.
  if (status < 500) {
    return res.status(status).json({
      message: error?.message || 'Request could not be processed.',
      code: error?.code || undefined,
    })
  }

  const code = error?.code || error?.name || 'Error'

  console.error(
    `[error] ${req.method} ${req.originalUrl} -> ${status} (${code})`,
  )
  console.error(
    `[error] ${error?.message || error}`,
  )

  if (error?.stack) {
    console.error(error.stack)
  }

  res.status(status).json({
    message:
      'The server could not complete that request. Please try again.',
    code,
  })
})

export default app
