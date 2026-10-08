import { io } from 'socket.io-client'
import { getToken } from './auth'

// Socket.IO connects directly to the backend in development.
// The Vite proxy no longer fronts Socket.IO — connect to the backend URL
// unless VITE_SOCKET_URL is explicitly set (production same-origin).
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000'

let socket = null

export function connectSocket() {
  const token = getToken()
  if (!token) return null
  if (socket && socket.connected) return socket

  if (socket) {
    socket.disconnect()
    socket = null
  }

  socket = io(SOCKET_URL, {
    auth: { token },
  })

  socket.on('connect_error', (err) => {
    if (err.message === 'Invalid token' || err.message === 'Missing token') {
      socket.close()
    }
  })

  return socket
}

export function getSocket() {
  return socket
}

export function disconnectSocket() {
  if (socket) {
    try {
      socket.close()
    } catch {}
    socket = null
  }
}