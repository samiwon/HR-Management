import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'

const SECRET = process.env.JWT_SECRET || 'hr-management-development-secret'

const onlineUsers = new Set()

export let io

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  })

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token
    if (!token) return next(new Error('Missing token'))
    try {
      const payload = jwt.verify(token, SECRET)
      const userId = Number(payload.userId || payload.sub || payload.id)
      if (!userId) return next(new Error('Invalid token user ID'))
      socket.data.userId = userId
      next()
    } catch {
      next(new Error('Invalid token'))
    }
  })

  io.on('connection', (socket) => {
    const userId = socket.data.userId
    socket.join(`user:${userId}`)
    if (!onlineUsers.has(userId)) {
      onlineUsers.add(userId)
      io.emit('presence', { userId, online: true })
    }

    socket.on('disconnect', () => {
      const stillConnected = io.sockets.adapter.rooms.get(`user:${userId}`)?.size > 0
      if (!stillConnected) {
        onlineUsers.delete(userId)
        io.emit('presence', { userId, online: false })
      }
    })
  })

  return io
}

export function isUserOnline(userId) {
  return onlineUsers.has(Number(userId))
}

export { onlineUsers }