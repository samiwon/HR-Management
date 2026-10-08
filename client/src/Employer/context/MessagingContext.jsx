import { useEffect, useRef, useState, useCallback } from 'react'
import { MessagingContext } from './messagingStore'
import { getUser } from '../../lib/auth'
import { connectSocket, disconnectSocket } from '../../lib/socket'
import { authHeaders } from '../../lib/hrApi'
import {
  fetchContactsApi,
  fetchThreadApi,
  sendMessageApi,
  sendAttachmentApi,
  updateMessageApi,
  deleteMessageApi,
  bulkDeleteMessagesApi,
  markReadApi,
  clearChatApi,
  deleteChatApi,
  startConversationApi,
} from '../../lib/messagesApi'

const AVATAR_COLORS = [
  'bg-sky-500',
  'bg-violet-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-indigo-500',
]

const isSameOrNewer = (existing, incoming) =>
  new Date(existing?.createdAt || 0) >= new Date(incoming.createdAt || 0)

function initialsFromName(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('')
}

function playChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(587.33, ctx.currentTime) // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12) // A5
    gain.gain.setValueAtTime(0.08, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.35)
  } catch {}
}

function showDesktopNotification(title, body) {
  try {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(title, { body })
      } else if (Notification.permission === 'default') {
        Notification.requestPermission().then((perm) => {
          if (perm === 'granted') new Notification(title, { body })
        })
      }
    }
  } catch {}
}

const STORAGE_KEY = 'yanol_chat_shared_store_v1'

function getLocalSharedStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return { threads: {}, hrContacts: [] }
}

function saveLocalSharedStore(store) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {}
}

export function MessagingProvider({ children, portalType = 'employer' }) {
  const isHR = portalType === 'hr'
  const [currentUser, setCurrentUser] = useState(() => {
    const authUser = getUser()
    const isHRUser =
      isHR ||
      ['HR_MANAGER', 'HR_ADMIN', 'ADMIN'].includes(String(authUser?.role || '').toUpperCase())
    return {
      id: String(authUser?.id || (isHRUser ? '2' : '7')),
      name: authUser?.name || (isHRUser ? 'HR Admin' : 'Employee'),
      email: authUser?.email || (isHRUser ? 'hradmin@yanol.com' : 'employee@yanol.com'),
      role: authUser?.role || (isHRUser ? 'HR_ADMIN' : 'EMPLOYEE'),
      roleLabel: isHRUser ? 'HR Admin' : 'Employee',
      employeeId: String(authUser?.employeeId || authUser?.id || (isHRUser ? 'HR-001' : 'EMP-001')),
      initials: initialsFromName(authUser?.name || (isHRUser ? 'HR' : 'EM')),
    }
  })

  useEffect(() => {
    const onStorageChange = () => {
      const authUser = getUser()
      if (authUser) {
        const isHRUser =
          isHR ||
          ['HR_MANAGER', 'HR_ADMIN', 'ADMIN'].includes(String(authUser?.role || '').toUpperCase())
        setCurrentUser({
          id: String(authUser.id),
          name: authUser.name || (isHRUser ? 'HR Admin' : 'Employee'),
          email: authUser.email,
          role: authUser.role,
          roleLabel: isHRUser ? 'HR Admin' : 'Employee',
          employeeId: String(authUser.employeeId || authUser.id),
          initials: initialsFromName(authUser.name || ''),
        })
      }
    }
    window.addEventListener('storage', onStorageChange)
    return () => window.removeEventListener('storage', onStorageChange)
  }, [isHR])

  const [contacts, setContacts] = useState([])
  const [threads, setThreads] = useState({})
  const [notifications, setNotifications] = useState([])
  const [incomingToast, setIncomingToast] = useState(null)

  const upsertAnnouncementNotifications = useCallback((announcements) => {
    if (!Array.isArray(announcements)) return
    let dismissed = []
    try { dismissed = JSON.parse(localStorage.getItem('yanol-dismissed-announcement-notifications') || '[]') } catch {}
    const dismissedIds = new Set(dismissed.map(String))
    setNotifications((current) => {
      const existing = new Map(current.filter((item) => item.type === 'announcement').map((item) => [String(item.id), item]))
      const announcementItems = announcements
        .filter((item) => !dismissedIds.has(String(item.id)))
        .map((item) => {
          const id = `announcement-${item.id}`
          const previous = existing.get(id)
          return {
            id,
            title: item.title,
            message: item.content,
            time: item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Now',
            createdAt: item.createdAt,
            unread: previous ? previous.unread : true,
            type: 'announcement',
            category: item.category || 'General',
            priority: item.priority || 'Normal',
          }
        })
      const incomingIds = new Set(announcementItems.map((item) => item.id))
      const retainedAnnouncements = current.filter((item) => item.type === 'announcement' && !incomingIds.has(item.id))
      return [...announcementItems, ...retainedAnnouncements, ...current.filter((item) => item.type !== 'announcement')].slice(0, 30)
    })
  }, [])

  const loadAnnouncements = useCallback(async () => {
    if (isHR) return
    try {
      const response = await fetch('/api/announcements', { headers: authHeaders(), cache: 'no-store' })
      if (!response.ok) return
      const data = await response.json()
      upsertAnnouncementNotifications(Array.isArray(data) ? data : data.announcements || [])
    } catch {
      // Keep existing notification and messaging functionality available offline.
    }
  }, [isHR, upsertAnnouncementNotifications])

  const contactsRef = useRef(contacts)
  const threadsRef = useRef(threads)

  // Refs are only read inside the callbacks below, so they are synced after
  // each commit instead of being written during render.
  useEffect(() => {
    contactsRef.current = contacts
  }, [contacts])

  useEffect(() => {
    threadsRef.current = threads
  }, [threads])

  const channelRef = useRef(null)

  const upsertMessage = useCallback((contactId, message, replaceId) => {
    const key = String(contactId)
    setThreads((prev) => {
      const current = prev[key] || []
      let nextMessages
      if (replaceId) {
        nextMessages = current.map((m) => (m.id === replaceId ? message : m))
      } else {
        const existingIndex = current.findIndex((m) => m.id === message.id)
        if (existingIndex === -1) {
          nextMessages = [...current, message]
        } else if (!message.pending && isSameOrNewer(current[existingIndex], message)) {
          nextMessages = [...current]
          nextMessages[existingIndex] = message
        } else {
          return prev
        }
      }

      // Persist to local shared store
      const store = getLocalSharedStore()
      store.threads[key] = nextMessages
      saveLocalSharedStore(store)

      return { ...prev, [key]: nextMessages }
    })
  }, [])

  const reloadContactsAndThreads = useCallback(async () => {
    const store = getLocalSharedStore()

    // Restore cached threads
    if (store.threads && Object.keys(store.threads).length > 0) {
      setThreads((prev) => ({ ...store.threads, ...prev }))
    }

    try {
      const { contacts: raw } = await fetchContactsApi()
      if (Array.isArray(raw)) {
        const colored = raw.map((c, i) => ({
          ...c,
          id: String(c.id),
          color: AVATAR_COLORS[i % AVATAR_COLORS.length],
        }))

        // Employees always have an HR Admin contact available, even before
        // starting a conversation. Other contacts appear after a message exists.
        if (!isHR) {
          const filtered = colored.filter((c) => {
            const t = (store.threads && store.threads[c.id]) || []
            return c.isHR || c.lastMessage !== null || t.length > 0
          })
          setContacts(filtered)
        } else {
          setContacts(colored)
        }

        const validIds = new Set(colored.map((c) => String(c.id)))
        const validStoreThreads = {}
        if (store.threads) {
          Object.keys(store.threads).forEach((id) => {
            if (validIds.has(String(id))) {
              validStoreThreads[id] = store.threads[id]
            }
          })
        }
        store.threads = validStoreThreads
        saveLocalSharedStore(store)

        const settled = await Promise.allSettled(colored.map((c) => fetchThreadApi(c.id)))
        const initialThreads = { ...validStoreThreads }
        colored.forEach((c, i) => {
          if (settled[i].status === 'fulfilled' && Array.isArray(settled[i].value.messages)) {
            initialThreads[c.id] = settled[i].value.messages
          }
        })
        setThreads(initialThreads)
      }
    } catch (err) {
      console.error('Failed to load contacts and threads:', err)
    }
  }, [isHR])

  const handleMessageRead = useCallback(({ contactId }) => {
    const cId = String(contactId)
    setThreads((prev) => {
      const list = prev[cId] || []
      const updated = list.map((m) => (m.from === 'me' ? { ...m, read: true, status: 'read' } : m))
      return { ...prev, [cId]: updated }
    })
    setContacts((prev) =>
      prev.map((c) =>
        String(c.id) === cId && c.lastMessage?.from === 'me'
          ? { ...c, lastMessage: { ...c.lastMessage, read: true, status: 'read' } }
          : c
      )
    )
  }, [])

  const handleIncoming = useCallback(
    ({ contactId, message, senderName }) => {
      const cId = String(contactId)
      upsertMessage(cId, message)

      if (message.from === 'them') {
        playChime()
        const name = senderName || (isHR ? 'Employee' : 'HR Admin')
        showDesktopNotification(`New message from ${name}`, message.text || 'Sent an attachment')
        setIncomingToast({
          id: `toast-${Date.now()}`,
          contactId: cId,
          name,
          text: message.text || (message.attachment ? `📎 ${message.attachment.name}` : 'New message'),
          time: message.time || 'Just now',
        })
      }

      setContacts((prev) => {
        const existingIndex = prev.findIndex((c) => String(c.id) === cId)
        let updatedContact
        if (existingIndex !== -1) {
          const old = prev[existingIndex]
          updatedContact = {
            ...old,
            unread: message.from === 'them' ? (old.unread || 0) + 1 : old.unread,
            lastMessage: {
              id: message.id,
              text: message.text || (message.attachment ? `📎 ${message.attachment.name}` : ''),
              from: message.from,
              time: message.time,
              createdAt: message.createdAt || new Date().toISOString(),
              read: Boolean(message.read),
              status: message.status || (message.read ? 'read' : 'delivered'),
            },
          }
        } else {
          updatedContact = {
            id: cId,
            name: senderName || (isHR ? 'Employee' : 'HR Admin'),
            email: isHR ? 'employee@yanol.com' : 'hradmin@yanol.com',
            role: isHR ? 'EMPLOYEE' : 'HR_ADMIN',
            roleLabel: isHR ? 'Employee' : 'HR Admin',
            isHR: !isHR,
            initials: initialsFromName(senderName || (isHR ? 'EM' : 'HR')),
            color: AVATAR_COLORS[prev.length % AVATAR_COLORS.length],
            online: true,
            unread: message.from === 'them' ? 1 : 0,
            lastMessage: {
              id: message.id,
              text: message.text || (message.attachment ? `📎 ${message.attachment.name}` : ''),
              from: message.from,
              time: message.time,
              createdAt: message.createdAt || new Date().toISOString(),
              read: Boolean(message.read),
              status: message.status || (message.read ? 'read' : 'delivered'),
            },
          }
        }
        return [updatedContact, ...prev.filter((c) => String(c.id) !== cId)]
      })

      if (message.from === 'them') {
        setNotifications((prev) => [
          {
            id: `n-${message.id}-${Date.now()}`,
            title: `New message from ${senderName || (isHR ? 'Employee' : 'HR Admin')}`,
            message: message.text || (message.attachment ? `Shared a file: ${message.attachment.name}` : ''),
            time: 'Now',
            unread: true,
            type: 'message',
            contactId: cId,
          },
          ...prev,
        ].slice(0, 20))
      }
    },
    [isHR, upsertMessage]
  )

  const handlePresence = useCallback(({ userId, online }) => {
    setContacts((prev) => prev.map((c) => (String(c.id) === String(userId) ? { ...c, online } : c)))
  }, [])

  const handleAnnouncement = useCallback((announcement) => {
    if (!isHR && announcement?.id) upsertAnnouncementNotifications([announcement])
  }, [isHR, upsertAnnouncementNotifications])

  const handleAnnouncementDeleted = useCallback(({ id } = {}) => {
    if (isHR || !id) return
    setNotifications((current) => current.filter((item) => item.id !== `announcement-${id}`))
  }, [isHR])

  const removeMessages = useCallback((contactId, ids) => {
    const idSet = new Set(ids.map(String))
    const key = String(contactId)
    setThreads((prev) => {
      const current = prev[key] || []
      const nextMessages = current.filter((m) => !idSet.has(m.id))
      const store = getLocalSharedStore()
      store.threads[key] = nextMessages
      saveLocalSharedStore(store)
      return { ...prev, [key]: nextMessages }
    })
  }, [])

  const handleMessageUpdated = useCallback(
    ({ contactId, message }) => {
      upsertMessage(String(contactId), message)
    },
    [upsertMessage]
  )

  const handleMessageDeleted = useCallback(
    ({ contactId, messageId }) => {
      removeMessages(String(contactId), [messageId])
    },
    [removeMessages]
  )

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect — cached threads are restored synchronously on mount on purpose
    reloadContactsAndThreads()
    loadAnnouncements()
    const announcementPoll = window.setInterval(loadAnnouncements, 60000)
    const handleAnnouncementCreated = (event) => handleAnnouncement(event.detail)
    const handleAnnouncementStorage = (event) => {
      if (event.key === 'company-announcement-created') loadAnnouncements()
    }
    window.addEventListener('company-announcement-created', handleAnnouncementCreated)
    window.addEventListener('storage', handleAnnouncementStorage)

    const socket = connectSocket()
    if (socket) {
      socket.on('message:new', handleIncoming)
      socket.on('message:read', handleMessageRead)
      socket.on('message:updated', handleMessageUpdated)
      socket.on('message:deleted', handleMessageDeleted)
      socket.on('presence', handlePresence)
      socket.on('announcement:new', handleAnnouncement)
      socket.on('announcement:deleted', handleAnnouncementDeleted)
    }

    try {
      const channel = new BroadcastChannel('yanol_messaging_realtime')
      channelRef.current = channel

      channel.onmessage = (event) => {
        const { type, payload } = event.data || {}
        if (type === 'NEW_MESSAGE' && payload) {
          const { senderPortal, targetContactId, message, senderName } = payload

          if (isHR && senderPortal === 'employer') {
            handleIncoming({
              contactId: targetContactId || '1',
              message: { ...message, from: 'them', senderName },
            })
          } else if (!isHR && senderPortal === 'hr') {
            handleIncoming({
              contactId: '2',
              message: { ...message, from: 'them', senderName: 'HR Admin' },
            })
          }
        } else if (type === 'MESSAGE_READ' && payload) {
          handleMessageRead({ contactId: payload.contactId })
        } else if (type === 'MESSAGE_UPDATED' && payload) {
          upsertMessage(String(payload.contactId), payload.message)
        } else if (type === 'MESSAGE_DELETED' && payload) {
          removeMessages(String(payload.contactId), payload.messageIds || [payload.messageId])
        } else if (type === 'CONVERSATION_STARTED') {
          reloadContactsAndThreads()
        }
      }
    } catch {}

    return () => {
      if (socket) {
        socket.off('message:new', handleIncoming)
        socket.off('message:read', handleMessageRead)
        socket.off('message:updated', handleMessageUpdated)
        socket.off('message:deleted', handleMessageDeleted)
        socket.off('presence', handlePresence)
        socket.off('announcement:new', handleAnnouncement)
        socket.off('announcement:deleted', handleAnnouncementDeleted)
      }
      window.clearInterval(announcementPoll)
      window.removeEventListener('company-announcement-created', handleAnnouncementCreated)
      window.removeEventListener('storage', handleAnnouncementStorage)
      disconnectSocket()
      if (channelRef.current) {
        channelRef.current.close()
        channelRef.current = null
      }
    }
  }, [handleIncoming, handleMessageRead, handlePresence, handleMessageUpdated, handleMessageDeleted, handleAnnouncement, handleAnnouncementDeleted, loadAnnouncements, removeMessages, upsertMessage, isHR, reloadContactsAndThreads])

  const sendMessage = useCallback(
    async (contactId, text, options = {}) => {
      const cId = String(contactId)
      const trimmed = String(text || '').trim()
      if (!trimmed) return
      // `isComplain` marks Employee → HR Admin complaints so HR can flag
      // them inside the thread (see Employer/lib/complaints.js).
      const isComplain = Boolean(options.isComplain)
      const tempId = `pending-${Date.now()}`
      const nowTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      const nowIso = new Date().toISOString()

      const optimisticMsg = {
        id: tempId,
        text: trimmed,
        from: 'me',
        senderId: isHR ? 2 : 1,
        time: nowTime,
        createdAt: nowIso,
        read: false,
        attachment: null,
        isComplain,
        pending: true,
      }

      upsertMessage(cId, optimisticMsg)

      setContacts((prev) => {
        const updated = prev.map((c) =>
          String(c.id) === cId
            ? {
                ...c,
                lastMessage: {
                  text: trimmed,
                  from: 'me',
                  time: nowTime,
                },
              }
            : c
        )
        return [
          ...updated.filter((c) => String(c.id) === cId),
          ...updated.filter((c) => String(c.id) !== cId),
        ]
      })

      // Broadcast immediately across all browser tabs
      if (channelRef.current) {
        channelRef.current.postMessage({
          type: 'NEW_MESSAGE',
          payload: {
            senderPortal: isHR ? 'hr' : 'employer',
            targetContactId: cId,
            senderName: currentUser.name,
            message: {
              id: tempId,
              text: trimmed,
              time: nowTime,
              createdAt: nowIso,
              read: false,
              attachment: null,
              isComplain,
            },
          },
        })
      }

      try {
        const { message } = await sendMessageApi(cId, trimmed, { isComplain })
        upsertMessage(cId, message, tempId)
      } catch {
        upsertMessage(
          cId,
          { id: tempId, text: trimmed, from: 'me', time: nowTime, read: false, attachment: null, pending: false, failed: false },
          tempId
        )
      }
    },
    [currentUser.name, isHR, upsertMessage]
  )

  const sendAttachment = useCallback(
    async (contactId, file, caption) => {
      const cId = String(contactId)
      const text = String(caption || '').trim()
      const tempId = `pending-${Date.now()}`
      const nowTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      const nowIso = new Date().toISOString()

      upsertMessage(cId, {
        id: tempId,
        text,
        from: 'me',
        senderId: isHR ? 2 : 1,
        time: nowTime,
        createdAt: nowIso,
        read: false,
        attachment: { url: null, name: file.name, type: file.type, uploading: true },
        pending: true,
      })

      try {
        const { message } = await sendAttachmentApi(cId, file, text)
        upsertMessage(cId, message, tempId)
      } catch {
        /* upload failed */
      }
    },
    [isHR, upsertMessage]
  )

  const editMessage = useCallback(
    async (contactId, messageId, text) => {
      const cId = String(contactId)
      const trimmed = String(text || '').trim()
      if (!trimmed) return
      const target = (threadsRef.current[cId] || []).find((m) => m.id === messageId)
      if (!target) return

      const optimistic = { ...target, text: trimmed, edited: true, pending: true }
      upsertMessage(cId, optimistic)

      if (channelRef.current) {
        channelRef.current.postMessage({
          type: 'MESSAGE_UPDATED',
          payload: { contactId: cId, message: optimistic },
        })
      }

      try {
        const { message } = await updateMessageApi(cId, messageId, trimmed)
        upsertMessage(cId, message, messageId)
      } catch {
        upsertMessage(cId, { ...target, pending: false }, messageId)
      }
    },
    [upsertMessage]
  )

  const deleteMessage = useCallback(
    async (contactId, messageId) => {
      const cId = String(contactId)
      const prev = (threadsRef.current[cId] || []).find((m) => m.id === messageId)
      removeMessages(cId, [messageId])

      if (channelRef.current) {
        channelRef.current.postMessage({
          type: 'MESSAGE_DELETED',
          payload: { contactId: cId, messageId },
        })
      }

      try {
        await deleteMessageApi(cId, messageId)
      } catch {
        if (prev) upsertMessage(cId, prev)
      }
    },
    [removeMessages, upsertMessage]
  )

  const bulkDeleteMessages = useCallback(
    async (contactId, ids) => {
      const cId = String(contactId)
      const clean = (ids || []).map(String).filter(Boolean)
      if (clean.length === 0) return
      const idSet = new Set(clean)
      const removed = (threadsRef.current[cId] || []).filter((m) => idSet.has(m.id))
      removeMessages(cId, clean)

      channelRef.current?.postMessage({
        type: 'MESSAGE_DELETED',
        payload: { contactId: cId, messageIds: clean },
      })

      try {
        await bulkDeleteMessagesApi(cId, clean)
      } catch {
        removed.forEach((m) => upsertMessage(cId, m))
      }
    },
    [removeMessages, upsertMessage]
  )

  const markContactRead = useCallback(
    async (contactId) => {
      const cId = String(contactId)
      setThreads((prev) => ({
        ...prev,
        [cId]: (prev[cId] || []).map((m) => (m.from === 'them' ? { ...m, read: true } : m)),
      }))
      setContacts((prev) => prev.map((c) => (String(c.id) === cId ? { ...c, unread: 0 } : c)))
      try {
        await markReadApi(cId)
      } catch {
        /* ignore */
      }
    },
    []
  )

  const markAllRead = useCallback(() => {
    contactsRef.current.forEach((c) => {
      if ((c.unread || 0) > 0) markContactRead(c.id)
    })
  }, [markContactRead])

  const markAllNotificationsReadAndRemove = useCallback(() => {
    const dismissedIds = notifications.filter((item) => item.type === 'announcement').map((item) => item.id.replace(/^announcement-/, ''))
    if (dismissedIds.length) {
      try {
        const existing = JSON.parse(localStorage.getItem('yanol-dismissed-announcement-notifications') || '[]')
        localStorage.setItem('yanol-dismissed-announcement-notifications', JSON.stringify([...new Set([...existing, ...dismissedIds])]))
      } catch {}
    }
    setNotifications([])
    markAllRead()
  }, [markAllRead, notifications])

  const dismissNotification = useCallback((id) => {
    if (String(id).startsWith('announcement-')) {
      const announcementId = String(id).replace(/^announcement-/, '')
      try {
        const existing = JSON.parse(localStorage.getItem('yanol-dismissed-announcement-notifications') || '[]')
        localStorage.setItem('yanol-dismissed-announcement-notifications', JSON.stringify([...new Set([...existing, announcementId])]))
      } catch {}
    }
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const startConversation = useCallback(async (person) => {
    const payload = person.kind === 'employee' ? { employeeId: person.id } : { userId: person.userId || person.id }
    try {
      const { user } = await startConversationApi(payload)
      const newContact = {
        ...user,
        id: String(user.id),
        color: AVATAR_COLORS[contactsRef.current.length % AVATAR_COLORS.length],
        roleLabel: user.subtitle || user.role,
        unread: 0,
        lastMessage: null,
      }
      setContacts((prev) =>
        prev.some((c) => String(c.id) === String(user.id)) ? prev : [newContact, ...prev]
      )

      if (channelRef.current) {
        channelRef.current.postMessage({ type: 'CONVERSATION_STARTED', payload: user })
      }
      return newContact
    } catch {
      const fallbackUser = {
        id: String(person.id),
        name: person.name,
        email: person.email,
        role: person.role || 'EMPLOYER',
        roleLabel: person.subtitle || 'Employer',
        initials: person.initials || initialsFromName(person.name),
        color: AVATAR_COLORS[contactsRef.current.length % AVATAR_COLORS.length],
        online: true,
        unread: 0,
        lastMessage: null,
      }
      setContacts((prev) =>
        prev.some((c) => String(c.id) === String(fallbackUser.id)) ? prev : [fallbackUser, ...prev]
      )
      return fallbackUser
    }
  }, [])

  const clearChat = useCallback(async (contactId) => {
    const cId = String(contactId)
    setThreads((prev) => ({ ...prev, [cId]: [] }))
    setContacts((prev) =>
      prev.map((c) => (String(c.id) === cId ? { ...c, unread: 0, lastMessage: null } : c))
    )
    // Clear from the local shared store so it doesn't resurface on reload
    const store = getLocalSharedStore()
    store.threads[cId] = []
    saveLocalSharedStore(store)
    try {
      await clearChatApi(cId)
    } catch {
      /* ignore */
    }
  }, [])

  const deleteChat = useCallback(async (contactId) => {
    const cId = String(contactId)
    setThreads((prev) => {
      const next = { ...prev }
      delete next[cId]
      return next
    })
    setContacts((prev) =>
      prev.map((c) => (String(c.id) === cId ? { ...c, unread: 0, lastMessage: null } : c))
    )
    // Remove from the local shared store so it doesn't resurface on reload
    const store = getLocalSharedStore()
    delete store.threads[cId]
    saveLocalSharedStore(store)
    try {
      await deleteChatApi(cId)
    } catch {
      /* ignore */
    }
  }, [])

  const totalUnread = contacts.reduce(
    (sum, c) => sum + (threads[String(c.id)] || []).filter((m) => m.from === 'them' && !m.read).length,
    0
  )

  const unreadByContact = (contactId) =>
    (threads[String(contactId)] || []).filter((m) => m.from === 'them' && !m.read).length

  const unreadNotifications = notifications.filter((n) => n.unread).length

  const dismissToast = useCallback(() => {
    setIncomingToast(null)
  }, [])

  const value = {
    currentUser,
    contacts,
    threads,
    notifications,
    incomingToast,
    dismissToast,
    totalUnread,
    unreadByContact,
    unreadNotifications,
    sendMessage,
    sendAttachment,
    editMessage,
    deleteMessage,
    bulkDeleteMessages,
    startConversation,
    markContactRead,
    markAllRead,
    markAllNotificationsReadAndRemove,
    dismissNotification,
    clearChat,
    deleteChat,
    reloadContactsAndThreads,
  }

  return <MessagingContext.Provider value={value}>{children}</MessagingContext.Provider>
}
