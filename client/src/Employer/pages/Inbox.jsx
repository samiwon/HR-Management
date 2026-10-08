import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Send,
  Search,
  Inbox as InboxIcon,
  Paperclip,
  CheckCheck,
  Check,
  Clock,
  MoreVertical,
  Trash2,
  Eraser,
  FileText,
  X,
  Plus,
  UserPlus,
  Loader2,
  Users,
  Pencil,
  ListChecks,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  Download,
  MessageSquare,
  Bell,
  Sparkles,
} from 'lucide-react'
import { useMessaging } from '../context/messagingStore'
import { fetchUsersApi } from '../../lib/messagesApi'

const MODAL_COLORS = [
  'bg-sky-500',
  'bg-violet-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-indigo-500',
]

// ─────────────────────────────────────────────────────────────
// Format Date and Time Helpers
// ─────────────────────────────────────────────────────────────
function formatMessageDateHeader(dateStr) {
  if (!dateStr) return 'Today'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return 'Today'

  const today = new Date()
  const isToday =
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()

  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear()

  if (isToday) return 'Today'
  if (isYesterday) return 'Yesterday'

  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  })
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  const now = new Date()
  const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000)

  if (diffSec < 45) return 'Just now'
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
  if (diffSec < 172800) return 'Yesterday'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ─────────────────────────────────────────────────────────────
// New Conversation Modal
// ─────────────────────────────────────────────────────────────
function NewConversationModal({ open, onClose, onSelect }) {
  const { startConversation } = useMessaging()
  const [people, setPeople] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [starting, setStarting] = useState(null)
  const [query, setQuery] = useState('')

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const { users } = await fetchUsersApi()
      setPeople(Array.isArray(users) ? users : [])
    } catch {
      setPeople([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      setQuery('')
      load()
    }
  }, [open])

  if (!open) return null

  const q = query.trim().toLowerCase()
  const filtered = q
    ? people.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q) ||
          (p.subtitle || '').toLowerCase().includes(q)
      )
    : people

  const handlePick = async (person) => {
    if (starting) return
    setStarting(person.email || person.id)
    try {
      const user = await startConversation(person)
      onSelect(user)
    } catch {
      setError("Couldn't start this conversation. Please try again.")
    } finally {
      setStarting(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#15181d] rounded-2xl max-w-lg w-full shadow-2xl border border-gray-200/90 dark:border-[#262b31] overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-gray-100 dark:border-[#262b31] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gray-950 dark:bg-white text-white dark:text-gray-950 flex items-center justify-center shadow-xs">
              <UserPlus size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-950 dark:text-gray-100">New conversation</h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">Select a team member or HR Admin to message</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1c2026] transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-100 dark:border-[#262b31] bg-gray-50/50 dark:bg-[#121418]">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, email, or department…"
              className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 dark:border-[#262b31] rounded-xl bg-white dark:bg-[#1c2026] text-gray-950 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-gray-100"
              autoFocus
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-[#262b31]">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-gray-400">
              <Loader2 size={20} className="animate-spin" />
              <span className="text-xs">Loading directory…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-400 dark:text-gray-500">
              No matching members found.
            </div>
          ) : (
            filtered.map((person, idx) => (
              <button
                key={person.id || person.email || idx}
                onClick={() => handlePick(person)}
                disabled={Boolean(starting)}
                className="w-full text-left px-5 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-[#1c2026] transition-colors border-0 outline-none focus:outline-none disabled:opacity-60 cursor-pointer"
              >
                <div className="relative shrink-0">
                  <div
                    className={`w-10 h-10 rounded-full ${MODAL_COLORS[idx % MODAL_COLORS.length]} text-white font-bold text-xs flex items-center justify-center shadow-xs`}
                  >
                    {person.initials || 'U'}
                  </div>
                  {person.online && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#15181d]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-gray-950 dark:text-gray-100 truncate">{person.name}</p>
                    <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-[#1c2026] px-1.5 py-0.5 rounded border border-gray-200 dark:border-[#262b31]">
                      {person.subtitle || 'Member'}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">{person.email}</p>
                </div>
              </button>
            ))
          )}
        </div>

        {error && (
          <div className="px-5 py-2.5 bg-red-50 dark:bg-red-950/30 border-t border-red-200 dark:border-red-900 text-[11px] text-red-600 dark:text-red-400">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Attachment Modal
// ─────────────────────────────────────────────────────────────
function AttachmentModal({ file, caption, onCaptionChange, contactName, uploading, onSend, onCancel }) {
  const isImage = file.type.startsWith('image/')
  const previewUrl = useMemo(() => URL.createObjectURL(file), [file])

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl, onCancel])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-[#15181d] rounded-2xl border border-gray-200/90 dark:border-[#262b31] shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-[#262b31] flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 shrink-0 rounded-xl bg-gray-950 dark:bg-white text-white dark:text-gray-950 flex items-center justify-center shadow-xs">
              <Paperclip size={15} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-gray-950 dark:text-gray-100">Send attachment</h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                To {contactName} · optional message
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={uploading}
            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1c2026] rounded-lg transition-colors cursor-pointer disabled:opacity-40"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5">
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-gray-200 dark:border-[#262b31] bg-gray-50 dark:bg-[#121418] p-3">
            {isImage ? (
              <img
                src={previewUrl}
                alt={file.name}
                className="w-20 h-20 shrink-0 rounded-lg object-cover"
              />
            ) : (
              <div className="w-20 h-20 shrink-0 rounded-lg bg-gray-950 dark:bg-[#1c2026] text-white dark:text-gray-200 flex items-center justify-center">
                <FileText size={22} />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-bold text-gray-950 dark:text-gray-100 truncate">{file.name}</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                {file.type || 'Document'} · {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>

          <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">
            Message (optional)
          </label>
          <textarea
            value={caption}
            onChange={(e) => onCaptionChange(e.target.value)}
            placeholder="Add a message to send with this file…"
            autoFocus
            rows={3}
            className="w-full resize-none rounded-xl border border-gray-200 dark:border-[#262b31] bg-white dark:bg-[#1c2026] px-3 py-2.5 text-xs text-gray-950 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-gray-100"
          />
        </div>

        <div className="px-5 py-4 border-t border-gray-100 dark:border-[#262b31] flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={uploading}
            className="h-9 px-4 rounded-xl border border-gray-200 dark:border-[#262b31] bg-white dark:bg-[#1c2026] text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#252a32] transition-colors cursor-pointer disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={onSend}
            disabled={uploading}
            className="inline-flex h-9 items-center gap-1.5 px-4 rounded-xl bg-gray-950 hover:bg-black text-white dark:bg-white dark:hover:bg-gray-200 dark:text-gray-950 text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-40"
          >
            {uploading ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            <span>{uploading ? 'Uploading…' : 'Send file'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Highlight text match helper
// ─────────────────────────────────────────────────────────────
function HighlightMatch({ text = '', query = '' }) {
  if (!query.trim() || !text) return <>{text}</>
  const q = query.trim()
  const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  const parts = text.split(regex)

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark
            key={i}
            className="bg-amber-300 dark:bg-amber-400 text-gray-950 font-semibold px-0.5 rounded-xs"
          >
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  )
}

// ─────────────────────────────────────────────────────────────
// Main Inbox Component
// ─────────────────────────────────────────────────────────────
function Inbox({ basePath = '/employer/inbox', canStartChat = false }) {
  const { contactId } = useParams()
  const navigate = useNavigate()
  const {
    contacts,
    threads,
    currentUser,
    totalUnread,
    incomingToast,
    dismissToast,
    sendMessage,
    sendAttachment,
    editMessage,
    deleteMessage,
    bulkDeleteMessages,
    markContactRead,
    clearChat,
    deleteChat,
  } = useMessaging()

  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState(() => new Set())

  const [draft, setDraft] = useState('')
  const [conversationQuery, setConversationQuery] = useState('')
  const [messageSearchOpen, setMessageSearchOpen] = useState(false)
  const [messageQuery, setMessageQuery] = useState('')
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0)

  const [showMenu, setShowMenu] = useState(false)
  const [hiddenContacts, setHiddenContacts] = useState(new Set())
  const [uploading, setUploading] = useState(false)
  const [pendingFile, setPendingFile] = useState(null)
  const [attachmentCaption, setAttachmentCaption] = useState('')
  const [newChatOpen, setNewChatOpen] = useState(false)
  const [flagAsComplaint, setFlagAsComplaint] = useState(false)

  const bottomRef = useRef(null)
  const fileInputRef = useRef(null)
  const messageRefs = useRef({})

  // 1. Dynamic Unified Conversation Model
  const conversations = useMemo(() => {
    return contacts.map((c) => {
      const msgs = threads[String(c.id)] || []
      const employee =
        currentUser.role === 'HR_MANAGER' ||
        currentUser.role === 'HR_ADMIN' ||
        currentUser.role === 'ADMIN'
          ? c
          : currentUser
      const adminHR =
        currentUser.role === 'HR_MANAGER' ||
        currentUser.role === 'HR_ADMIN' ||
        currentUser.role === 'ADMIN'
          ? currentUser
          : c

      return {
        id: `conv_${c.id}`,
        contactId: String(c.id),
        contact: c,
        employee,
        'Admin/HR': adminHR,
        lastMessage: c.lastMessage,
        messages: msgs,
        unread: c.unread || 0,
      }
    })
  }, [contacts, threads, currentUser])

  // Filter visible conversations
  const relevantConversations = useMemo(() => {
    return conversations.filter((conv) => {
      if (hiddenContacts.has(conv.contactId)) return false
      if (canStartChat) return true
      return conv.contact.isHR || conv.messages.length > 0 || conv.lastMessage !== null
    })
  }, [conversations, hiddenContacts, canStartChat])

  // Responsive desktop detection
  const [isDesktop, setIsDesktop] = useState(false)
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Active conversation resolution
  const activeConversation = useMemo(() => {
    if (contactId) {
      return (
        relevantConversations.find((conv) => conv.contactId === String(contactId)) || null
      )
    }
    return isDesktop && relevantConversations.length > 0 ? relevantConversations[0] : null
  }, [contactId, relevantConversations, isDesktop])

  const activeContactId = activeConversation ? activeConversation.contactId : null
  const activeContact = activeConversation ? activeConversation.contact : null
  const messages = activeConversation ? activeConversation.messages : []

  // Mark active contact as read
  useEffect(() => {
    if (activeContactId) {
      markContactRead(activeContactId)
    }
  }, [activeContactId, markContactRead])

  // Reset thread tools when changing active contact
  useEffect(() => {
    setEditingId(null)
    setEditText('')
    setSelectionMode(false)
    setSelectedIds(new Set())
    setMessageQuery('')
    setMessageSearchOpen(false)
    setCurrentMatchIndex(0)
  }, [activeContactId])

  // Auto-scroll on new message
  useEffect(() => {
    if (!messageSearchOpen) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages.length, messageSearchOpen])

  // 2. Search Conversations (Sidebar)
  const filteredConversations = useMemo(() => {
    const q = conversationQuery.trim().toLowerCase()
    if (!q) return relevantConversations

    return relevantConversations.filter((conv) => {
      const name = (conv.contact.name || '').toLowerCase()
      const email = (conv.contact.email || '').toLowerCase()
      const role = (conv.contact.roleLabel || conv.contact.role || '').toLowerCase()
      const dept = (conv.contact.department || '').toLowerCase()
      const last = (conv.lastMessage?.text || '').toLowerCase()
      return (
        name.includes(q) ||
        email.includes(q) ||
        role.includes(q) ||
        dept.includes(q) ||
        last.includes(q)
      )
    })
  }, [relevantConversations, conversationQuery])

  // 3. Search Messages (Inside active chat)
  const matchedMessageIds = useMemo(() => {
    const q = messageQuery.trim().toLowerCase()
    if (!q || !activeConversation) return []
    return messages
      .filter((m) => (m.text || '').toLowerCase().includes(q))
      .map((m) => m.id)
  }, [messages, messageQuery, activeConversation])

  const scrollToMatchedMessage = (id) => {
    const el = messageRefs.current[id]
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  const handleNextMatch = () => {
    if (matchedMessageIds.length === 0) return
    const nextIdx = (currentMatchIndex + 1) % matchedMessageIds.length
    setCurrentMatchIndex(nextIdx)
    scrollToMatchedMessage(matchedMessageIds[nextIdx])
  }

  const handlePrevMatch = () => {
    if (matchedMessageIds.length === 0) return
    const prevIdx =
      (currentMatchIndex - 1 + matchedMessageIds.length) % matchedMessageIds.length
    setCurrentMatchIndex(prevIdx)
    scrollToMatchedMessage(matchedMessageIds[prevIdx])
  }

  useEffect(() => {
    if (matchedMessageIds.length > 0) {
      setCurrentMatchIndex(0)
      scrollToMatchedMessage(matchedMessageIds[0])
    }
  }, [matchedMessageIds])

  // 4. Message date grouping
  const groupedMessages = useMemo(() => {
    const groups = []
    let currentHeader = null
    let currentBatch = []

    messages.forEach((msg) => {
      const header = formatMessageDateHeader(msg.createdAt)
      if (header !== currentHeader) {
        if (currentBatch.length > 0) {
          groups.push({ header: currentHeader, items: currentBatch })
        }
        currentHeader = header
        currentBatch = [msg]
      } else {
        currentBatch.push(msg)
      }
    })

    if (currentBatch.length > 0) {
      groups.push({ header: currentHeader, items: currentBatch })
    }

    return groups
  }, [messages])

  // Actions
  const handleSelectContact = (person) => {
    const pId = String(person.id)
    if (hiddenContacts.has(pId)) {
      setHiddenContacts((prev) => {
        const next = new Set(prev)
        next.delete(pId)
        return next
      })
    }
    setNewChatOpen(false)
    navigate(`${basePath}/${pId}`, { replace: true })
  }

  const handleClear = () => {
    if (activeContactId) clearChat(activeContactId)
    setShowMenu(false)
  }

  const handleDelete = () => {
    if (activeContactId) {
      deleteChat(activeContactId)
      setHiddenContacts((prev) => new Set(prev).add(activeContactId))
      setShowMenu(false)
      const remaining = relevantConversations.filter(
        (conv) => conv.contactId !== activeContactId
      )
      if (remaining.length > 0) {
        navigate(`${basePath}/${remaining[0].contactId}`, { replace: true })
      }
    }
  }

  const handleSend = (e) => {
    e.preventDefault()
    if (!draft.trim() || !activeContactId) return
    sendMessage(activeContactId, draft, { isComplain: flagAsComplaint })
    setDraft('')
    setFlagAsComplaint(false)
  }

  const handleFile = (file) => {
    if (!file || !activeContactId) return
    setPendingFile(file)
    setAttachmentCaption('')
  }

  const handleCancelAttachment = () => {
    setPendingFile(null)
    setAttachmentCaption('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSendAttachment = async () => {
    if (!pendingFile || !activeContactId) return
    setUploading(true)
    try {
      await sendAttachment(activeContactId, pendingFile, attachmentCaption)
      handleCancelAttachment()
    } finally {
      setUploading(false)
    }
  }

  const startEdit = (msg) => {
    setEditingId(msg.id)
    setEditText(msg.text || '')
    setSelectionMode(false)
    setSelectedIds(new Set())
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditText('')
  }

  const saveEdit = async () => {
    if (!editingId || !activeContactId) return
    await editMessage(activeContactId, editingId, editText)
    cancelEdit()
  }

  const handleDeleteMessage = async (msg) => {
    if (activeContactId) {
      await deleteMessage(activeContactId, msg.id)
      if (editingId === msg.id) cancelEdit()
    }
  }

  const exitSelection = () => {
    setSelectionMode(false)
    setSelectedIds(new Set())
  }

  const toggleSelectionMode = () => {
    if (editingId) cancelEdit()
    setSelectedIds(new Set())
    setSelectionMode((on) => !on)
  }

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleBulkDelete = async () => {
    if (!activeContactId || selectedIds.size === 0) return
    await bulkDeleteMessages(activeContactId, [...selectedIds])
    exitSelection()
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto text-gray-900 dark:text-gray-100">
      {/* ─────────────────────────────────────────────────────────────
          1. IN-APP TOAST NOTIFICATION ON NEW MESSAGE
         ───────────────────────────────────────────────────────────── */}
      {incomingToast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 p-4 bg-white dark:bg-[#181c22] border border-gray-200 dark:border-[#2f353d] rounded-2xl shadow-2xl animate-in slide-in-from-top-4 duration-200 max-w-sm">
          <div className="w-10 h-10 rounded-full bg-emerald-500 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
            <Bell size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1">
              <p className="text-xs font-bold text-gray-950 dark:text-gray-100 truncate">
                {incomingToast.name}
              </p>
              <span className="text-[10px] text-gray-400 font-mono shrink-0">
                {incomingToast.time}
              </span>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
              {incomingToast.text}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => {
                navigate(`${basePath}/${incomingToast.contactId}`, { replace: true })
                dismissToast()
              }}
              className="px-2.5 py-1 text-[11px] font-bold bg-gray-950 text-white dark:bg-white dark:text-gray-950 rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
            >
              Reply
            </button>
            <button
              onClick={dismissToast}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-md transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          2. PAGE HEADER
         ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-950 dark:bg-white text-white dark:text-gray-950 flex items-center justify-center shadow-xs">
            <InboxIcon size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-gray-950 dark:text-gray-100">
                Inbox
              </h1>
              {totalUnread > 0 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {totalUnread} unread
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {canStartChat
                ? 'Dynamic messaging center · chat with employees & team members'
                : 'Direct messaging with HR Admin · inquiries, concerns & requests'}
            </p>
          </div>
        </div>

        {/* "New conversation" button */}
        <button
          onClick={() => setNewChatOpen(true)}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-gray-950 hover:bg-black text-white dark:bg-white dark:hover:bg-gray-200 dark:text-gray-950 text-xs font-bold transition-all shadow-xs cursor-pointer"
        >
          <Plus size={14} />
          <span>New conversation</span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. MESSAGING WORKSPACE (Side-by-side on desktop, responsive)
         ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-5 min-h-[620px] h-[calc(100vh-210px)] max-h-[820px]">
        {/* LEFT SIDEBAR: CONVERSATION LIST */}
        <aside
          className={`w-full lg:w-80 shrink-0 flex flex-col bg-white dark:bg-[#15181d] rounded-2xl border border-gray-200/90 dark:border-[#262b31] shadow-2xs overflow-hidden ${
            !isDesktop && activeContact ? 'hidden' : ''
          }`}
        >
          {/* Search Conversations Input */}
          <div className="p-3.5 border-b border-gray-100 dark:border-[#262b31]">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
              />
              <input
                value={conversationQuery}
                onChange={(e) => setConversationQuery(e.target.value)}
                placeholder="Search conversations…"
                className="w-full pl-9 pr-8 py-2 text-xs border border-gray-200 dark:border-[#262b31] rounded-xl bg-gray-50/70 dark:bg-[#1c2026] text-gray-950 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-gray-100"
              />
              {conversationQuery && (
                <button
                  onClick={() => setConversationQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Conversations scroll list (Sorted by latest message) */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400 dark:text-gray-500">
                <Users className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                <p className="font-semibold text-gray-700 dark:text-gray-300">
                  {conversationQuery ? 'No matching conversations' : 'No conversations yet'}
                </p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                  {conversationQuery
                    ? 'Try searching with another keyword.'
                    : canStartChat
                    ? 'Click "New conversation" to start chatting.'
                    : 'Your conversation with HR Admin will appear here.'}
                </p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const cId = conv.contactId
                const unread = conv.unread
                const last = conv.lastMessage
                const isActive = activeContactId === cId
                const contact = conv.contact
                const relativeTime = last?.createdAt
                  ? formatRelativeTime(last.createdAt)
                  : last?.time || ''

                return (
                  <button
                    key={cId}
                    onClick={() => navigate(`${basePath}/${cId}`, { replace: true })}
                    className={`w-full text-left px-3.5 py-3 rounded-xl flex items-center gap-3 transition-colors border-0 outline-none focus:outline-none cursor-pointer ${
                      isActive
                        ? 'bg-gray-100 dark:bg-[#1c2026] ring-1 ring-inset ring-gray-950/10 dark:ring-white/10 font-medium'
                        : 'hover:bg-gray-50 dark:hover:bg-[#1c2026]/60'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <div
                        className={`w-10 h-10 rounded-full ${
                          contact.color || 'bg-gray-700'
                        } text-white font-bold text-xs flex items-center justify-center shadow-2xs`}
                      >
                        {contact.initials || 'U'}
                      </div>
                      {contact.online && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#15181d]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-gray-950 dark:text-gray-100 truncate">
                          {contact.name}
                        </span>
                        {relativeTime && (
                          <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500 shrink-0">
                            {relativeTime}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-1 mt-0.5">
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate flex items-center gap-1">
                          {last ? (
                            <>
                              {last.from === 'me' && (
                                <span className="font-semibold text-gray-400">You: </span>
                              )}
                              <span>
                                {last.text || (last.attachment ? '📎 Attachment' : '')}
                              </span>
                            </>
                          ) : contact.isHR ? (
                            'HR Admin · Start a conversation'
                          ) : (
                            'No messages yet'
                          )}
                        </p>
                        {unread > 0 && (
                          <span className="shrink-0 px-1.5 py-0.5 rounded-full text-[9px] font-black bg-emerald-500 text-white">
                            {unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>

          {/* Current User Profile Card */}
          <div className="p-3.5 border-t border-gray-100 dark:border-[#262b31] bg-gray-50/70 dark:bg-[#181c22]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gray-950 dark:bg-white text-white dark:text-gray-950 font-bold text-xs flex items-center justify-center shadow-xs shrink-0">
                {currentUser.initials || 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-gray-950 dark:text-gray-100 truncate">
                  {currentUser.name}
                </p>
                <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 truncate mt-0.5">
                  {currentUser.roleLabel || currentUser.role} · {currentUser.email}
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* RIGHT PANEL: CHAT THREAD */}
        <section
          className={`flex-1 flex flex-col bg-white dark:bg-[#15181d] rounded-2xl border border-gray-200/90 dark:border-[#262b31] shadow-2xs overflow-hidden min-w-0 ${
            !isDesktop && !activeContact ? 'hidden' : ''
          }`}
        >
          {!activeContact ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400 dark:text-gray-500">
              <InboxIcon className="w-12 h-12 mb-3 text-gray-300 dark:text-gray-600 stroke-1" />
              <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
                No active conversation
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm">
                Start a new conversation or select someone from the conversations list on the left.
              </p>
              <button
                onClick={() => setNewChatOpen(true)}
                className="mt-4 inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-gray-950 text-white dark:bg-white dark:text-gray-950 text-xs font-bold shadow-xs cursor-pointer"
              >
                <Plus size={14} />
                <span>Start conversation</span>
              </button>
            </div>
          ) : (
            <>
              {/* Chat Thread Header */}
              <header className="px-5 py-3.5 border-b border-gray-100 dark:border-[#262b31] flex items-center justify-between gap-3 bg-white dark:bg-[#15181d] shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Back button for mobile */}
                  <button
                    type="button"
                    onClick={() => navigate(basePath, { replace: true })}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1c2026] transition-colors cursor-pointer shrink-0 lg:hidden"
                    aria-label="Back to conversations"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <div
                    className={`w-10 h-10 rounded-full ${
                      activeContact.color || 'bg-gray-700'
                    } text-white font-bold text-xs flex items-center justify-center shadow-2xs shrink-0`}
                  >
                    {activeContact.initials || 'U'}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-xs sm:text-sm font-bold text-gray-950 dark:text-gray-100 truncate flex items-center gap-2">
                      <span>{activeContact.name}</span>
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          activeContact.online ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                        title={activeContact.online ? 'Online' : 'Offline'}
                      />
                    </h2>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                      {activeContact.roleLabel || 'Staff'} · {activeContact.email}
                    </p>
                  </div>
                </div>

                {/* Right Header Toolbar (Search messages, Selection, Menu) */}
                <div className="flex items-center gap-1.5">
                  {/* Search Messages Toggle */}
                  <button
                    onClick={() => setMessageSearchOpen((v) => !v)}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      messageSearchOpen
                        ? 'bg-gray-950 text-white dark:bg-white dark:text-gray-950'
                        : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1c2026]'
                    }`}
                    title="Search messages in this conversation"
                  >
                    <Search size={16} />
                  </button>

                  {/* Multi-selection toggle / bulk delete */}
                  {selectionMode ? (
                    <>
                      <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 px-1">
                        {selectedIds.size} selected
                      </span>
                      <button
                        onClick={handleBulkDelete}
                        disabled={selectedIds.size === 0}
                        className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-xs font-semibold text-red-600 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                      <button
                        onClick={exitSelection}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1c2026] transition-colors cursor-pointer"
                        title="Cancel selection"
                      >
                        <X size={16} />
                      </button>
                    </>
                  ) : (
                    messages.length > 0 && (
                      <button
                        onClick={toggleSelectionMode}
                        className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1c2026] transition-colors cursor-pointer"
                        title="Select multiple messages"
                      >
                        <ListChecks size={15} />
                        <span className="hidden sm:inline">Select</span>
                      </button>
                    )
                  )}

                  {/* Options dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setShowMenu(!showMenu)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1c2026] transition-colors cursor-pointer"
                      title="More options"
                    >
                      <MoreVertical size={16} />
                    </button>
                    {showMenu && (
                      <div className="absolute right-0 top-9 w-44 bg-white dark:bg-[#1c2026] rounded-xl shadow-xl border border-gray-200/90 dark:border-[#262b31] py-1 z-50 animate-in fade-in duration-100">
                        <button
                          onClick={handleClear}
                          className="w-full text-left flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#252a32] cursor-pointer"
                        >
                          <Eraser size={13} className="text-gray-400" />
                          <span>Clear messages</span>
                        </button>
                        <button
                          onClick={handleDelete}
                          className="w-full text-left flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                        >
                          <Trash2 size={13} />
                          <span>Delete chat</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </header>

              {/* SEARCH MESSAGES TOOLBAR (When search button is active) */}
              {messageSearchOpen && (
                <div className="px-5 py-2.5 border-b border-gray-100 dark:border-[#262b31] bg-gray-50 dark:bg-[#14171d] flex items-center justify-between gap-3 animate-in fade-in duration-150">
                  <div className="flex-1 relative flex items-center">
                    <Search
                      size={13}
                      className="absolute left-3 text-gray-400 dark:text-gray-500"
                    />
                    <input
                      type="text"
                      value={messageQuery}
                      onChange={(e) => setMessageQuery(e.target.value)}
                      placeholder="Search messages in this conversation…"
                      autoFocus
                      className="w-full pl-8 pr-8 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-[#2d323b] bg-white dark:bg-[#1c2026] text-gray-950 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-gray-100"
                    />
                    {messageQuery && (
                      <button
                        onClick={() => setMessageQuery('')}
                        className="absolute right-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>

                  {messageQuery.trim() && (
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[11px] font-mono text-gray-500 dark:text-gray-400 px-1">
                        {matchedMessageIds.length > 0
                          ? `${currentMatchIndex + 1} of ${matchedMessageIds.length}`
                          : '0 results'}
                      </span>
                      <button
                        onClick={handlePrevMatch}
                        disabled={matchedMessageIds.length === 0}
                        className="p-1 rounded text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-[#252a32] disabled:opacity-40 cursor-pointer"
                        title="Previous match"
                      >
                        <ChevronUp size={15} />
                      </button>
                      <button
                        onClick={handleNextMatch}
                        disabled={matchedMessageIds.length === 0}
                        className="p-1 rounded text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-[#252a32] disabled:opacity-40 cursor-pointer"
                        title="Next match"
                      >
                        <ChevronDown size={15} />
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setMessageSearchOpen(false)
                      setMessageQuery('')
                    }}
                    className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                    title="Close search"
                  >
                    <X size={15} />
                  </button>
                </div>
              )}

              {/* Message Feed with Date Headers & Message Bubbles */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-gray-50/40 dark:bg-[#121418]">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center text-center py-16">
                    <div
                      className={`w-12 h-12 rounded-full ${
                        activeContact.color || 'bg-gray-700'
                      } text-white font-bold text-base flex items-center justify-center shadow-xs mb-3`}
                    >
                      {activeContact.initials || 'U'}
                    </div>
                    <p className="text-xs font-bold text-gray-950 dark:text-gray-100">
                      Direct message with {activeContact.name}
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 max-w-[280px]">
                      Send a message below. Messages are saved, delivered, and updated dynamically.
                    </p>
                  </div>
                )}

                {groupedMessages.map((group, groupIdx) => (
                  <div key={group.header || groupIdx} className="space-y-3">
                    {/* Date Separator Pill */}
                    <div className="flex justify-center my-3">
                      <span className="text-[10px] font-bold text-gray-400 dark:text-gray-400 bg-white/90 dark:bg-[#181c22] px-3 py-1 rounded-full border border-gray-200/80 dark:border-[#292f38] shadow-2xs">
                        {group.header}
                      </span>
                    </div>

                    {group.items.map((msg) => {
                      const mine = msg.from === 'me'
                      const att = msg.attachment
                      const isImage =
                        att &&
                        ((att.type && att.type.toLowerCase().startsWith('image/')) ||
                          /\.(png|jpg|jpeg|webp|gif|bmp|svg)$/i.test(att.name || '') ||
                          /\.(png|jpg|jpeg|webp|gif|bmp|svg)$/i.test(att.url || ''))
                      const isEditing = editingId === msg.id
                      const isSelected = selectedIds.has(msg.id)
                      const isPending = msg.pending || msg.id.startsWith('pending-')
                      const isMatched =
                        messageQuery.trim() &&
                        (msg.text || '').toLowerCase().includes(messageQuery.trim().toLowerCase())
                      const isCurrentMatch =
                        matchedMessageIds[currentMatchIndex] === msg.id

                      return (
                        <div
                          key={msg.id}
                          ref={(el) => {
                            if (el) messageRefs.current[msg.id] = el
                          }}
                          className={`flex items-end gap-2 ${
                            mine ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          {/* Selection Checkbox */}
                          {selectionMode && mine && (
                            <button
                              type="button"
                              onClick={() => toggleSelect(msg.id)}
                              className={`mb-2 h-5 w-5 shrink-0 rounded-md border flex items-center justify-center transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-gray-950 border-gray-950 dark:bg-white dark:border-white text-white dark:text-gray-950'
                                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                              }`}
                              aria-label={isSelected ? 'Deselect message' : 'Select message'}
                            >
                              {isSelected && <Check size={12} strokeWidth={3} />}
                            </button>
                          )}

                          {/* Recipient Avatar */}
                          {!mine && (
                            <div
                              className={`w-7 h-7 rounded-full ${
                                activeContact.color || 'bg-gray-700'
                              } text-white text-[10px] font-bold flex items-center justify-center shrink-0 mb-0.5`}
                            >
                              {activeContact.initials || 'U'}
                            </div>
                          )}

                          {/* Message Bubble Container */}
                          <div
                            tabIndex={-1}
                            className={`group max-w-[75%] sm:max-w-[65%] px-4 py-2.5 text-xs border-0 outline-none select-text ${
                              mine
                                ? 'bg-gray-950 text-white dark:bg-white dark:text-gray-950 rounded-2xl rounded-br-xs shadow-2xs'
                                : 'bg-gray-100 text-gray-950 dark:bg-[#1c2026] dark:text-gray-100 rounded-2xl rounded-bl-xs'
                            } ${
                              isSelected
                                ? 'ring-2 ring-gray-900 dark:ring-gray-100'
                                : ''
                            } ${
                              isCurrentMatch
                                ? 'ring-2 ring-amber-500 shadow-md'
                                : isMatched
                                ? 'ring-1 ring-amber-400/60'
                                : ''
                            }`}
                          >
                            {/* Attachment view */}
                            {att && (
                              <div className="mb-2">
                                {isImage ? (
                                  <div className="relative group/img rounded-xl overflow-hidden border border-gray-200/40 dark:border-[#262b31] bg-black/5">
                                    <img
                                      src={att.url}
                                      alt={att.name}
                                      className="max-h-56 w-auto object-cover rounded-xl"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                      <a
                                        href={att.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="px-3 py-1.5 rounded-lg bg-white/90 hover:bg-white text-gray-950 text-xs font-bold shadow-sm transition-transform hover:scale-105 flex items-center gap-1.5"
                                      >
                                        View
                                      </a>
                                      <a
                                        href={att.url}
                                        download={att.name}
                                        className="p-2 rounded-lg bg-white/90 hover:bg-white text-gray-950 shadow-sm transition-transform hover:scale-105 flex items-center justify-center"
                                        title="Download image"
                                      >
                                        <Download size={15} />
                                      </a>
                                    </div>
                                  </div>
                                ) : (
                                  <div
                                    className={`flex items-center justify-between gap-3 p-3 rounded-xl border text-xs ${
                                      mine
                                        ? 'bg-white/10 dark:bg-gray-900/20 border-white/20 dark:border-gray-700/40 text-white'
                                        : 'bg-white dark:bg-[#15181d] border-gray-200 dark:border-[#262b31] text-gray-900 dark:text-gray-100'
                                    } shadow-2xs`}
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <div
                                        className={`p-2 rounded-lg shrink-0 ${
                                          mine
                                            ? 'bg-white/20 text-white'
                                            : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                                        }`}
                                      >
                                        <FileText size={18} />
                                      </div>
                                      <div className="min-w-0">
                                        <p className="font-bold truncate">{att.name}</p>
                                        <p
                                          className={`text-[10px] truncate ${
                                            mine
                                              ? 'text-gray-200/80'
                                              : 'text-gray-400 dark:text-gray-500'
                                          }`}
                                        >
                                          {att.type || 'Document file'}
                                        </p>
                                      </div>
                                    </div>
                                    <a
                                      href={att.url}
                                      download={att.name}
                                      target="_blank"
                                      rel="noreferrer"
                                      className={`p-2 rounded-xl transition-all shrink-0 cursor-pointer shadow-2xs flex items-center justify-center ${
                                        mine
                                          ? 'bg-white text-gray-950 hover:bg-gray-100'
                                          : 'bg-gray-950 text-white hover:bg-black dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200'
                                      }`}
                                      title="Download document"
                                    >
                                      <Download size={15} />
                                    </a>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Message text / Editing State */}
                            {isEditing ? (
                              <div className="space-y-2">
                                <textarea
                                  value={editText}
                                  onChange={(e) => setEditText(e.target.value)}
                                  rows={2}
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                      e.preventDefault()
                                      if (editText.trim()) saveEdit()
                                    }
                                    if (e.key === 'Escape') cancelEdit()
                                  }}
                                  placeholder="Edit message…"
                                  className={`w-full resize-none rounded-lg px-2.5 py-1.5 text-xs placeholder:text-gray-400 focus:outline-none ${
                                    mine
                                      ? 'bg-black/10 dark:bg-gray-900/10 text-white dark:text-gray-950'
                                      : 'bg-white dark:bg-[#252a32] text-gray-950 dark:text-gray-100'
                                  }`}
                                />
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={cancelEdit}
                                    className={`text-[10px] font-semibold px-2 py-1 rounded-md cursor-pointer ${
                                      mine
                                        ? 'text-gray-300 dark:text-gray-500 hover:bg-white/10'
                                        : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-[#252a32]'
                                    }`}
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => saveEdit()}
                                    disabled={!editText.trim()}
                                    className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md bg-white text-gray-950 dark:bg-gray-950 dark:text-white hover:opacity-90 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                  >
                                    <Check size={11} strokeWidth={3} />
                                    Save
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                {msg.isComplain && (
                                  <span className="mb-1 inline-flex rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide">
                                    Workplace inquiry
                                  </span>
                                )}

                                {msg.text && (
                                  <p className="leading-relaxed whitespace-pre-wrap">
                                    <HighlightMatch text={msg.text} query={messageQuery} />
                                  </p>
                                )}

                                {/* Message Footer: Edit/Delete Actions, (edited), Timestamp & Status (Sent / Delivered / Read) */}
                                <div
                                  className={`flex items-center justify-end gap-1.5 mt-1 text-[9.5px] font-mono ${
                                    mine
                                      ? 'text-gray-400 dark:text-gray-500'
                                      : 'text-gray-400 dark:text-gray-500'
                                  }`}
                                >
                                  {/* Edit & Delete actions for outgoing messages */}
                                  {mine && !selectionMode && (
                                    <>
                                      <button
                                        onClick={() => startEdit(msg)}
                                        disabled={isPending}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer enabled:hover:opacity-100 disabled:opacity-30 disabled:cursor-not-allowed"
                                        title="Edit message"
                                      >
                                        <Pencil size={10} />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteMessage(msg)}
                                        disabled={isPending}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer enabled:hover:opacity-100 disabled:opacity-30 disabled:cursor-not-allowed text-red-400 hover:text-red-500"
                                        title="Delete message"
                                      >
                                        <Trash2 size={10} />
                                      </button>
                                    </>
                                  )}

                                  {/* Edited tag with timestamp tooltip */}
                                  {msg.edited && (
                                    <span
                                      className="italic opacity-80"
                                      title={
                                        msg.editedAt
                                          ? `Edited at ${new Date(msg.editedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
                                          : 'Edited'
                                      }
                                    >
                                      (edited)
                                    </span>
                                  )}

                                  {/* Message Timestamp */}
                                  <span
                                    title={
                                      msg.createdAt
                                        ? new Date(msg.createdAt).toLocaleString()
                                        : msg.time
                                    }
                                  >
                                    {msg.time}
                                  </span>

                                  {/* Sent / Delivered / Read Status Indicators */}
                                  {mine && (
                                    <div className="flex items-center gap-0.5">
                                      {isPending ? (
                                        <span title="Sending…">
                                          <Clock size={10} className="animate-pulse" />
                                        </span>
                                      ) : msg.read || msg.status === 'read' ? (
                                        <span
                                          title="Read"
                                          className="text-emerald-400 dark:text-emerald-300 flex items-center"
                                        >
                                          <CheckCheck size={12} strokeWidth={2.5} />
                                        </span>
                                      ) : msg.status === 'delivered' ? (
                                        <span
                                          title="Delivered"
                                          className="text-gray-400 dark:text-gray-400 flex items-center"
                                        >
                                          <CheckCheck size={12} strokeWidth={2} />
                                        </span>
                                      ) : (
                                        <span
                                          title="Sent"
                                          className="text-gray-400 dark:text-gray-400 flex items-center"
                                        >
                                          <Check size={12} strokeWidth={2} />
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              {/* Message Composer */}
              <form
                onSubmit={handleSend}
                className="p-3 sm:p-4 border-t border-gray-100 dark:border-[#262b31] bg-white dark:bg-[#15181d] flex items-center gap-2 shrink-0"
              >
                {!canStartChat && (
                  <label
                    className="flex shrink-0 items-center gap-1.5 text-[11px] font-semibold text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 cursor-pointer"
                    title="Flag as inquiry or question for HR follow-up"
                  >
                    <input
                      type="checkbox"
                      checked={flagAsComplaint}
                      onChange={(e) => setFlagAsComplaint(e.target.checked)}
                      className="accent-indigo-600 rounded-sm"
                    />
                    <span>Question / Inquiry</span>
                  </label>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="h-10 w-10 shrink-0 rounded-xl bg-gray-50 dark:bg-[#1c2026] border border-gray-200 dark:border-[#262b31] text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
                  title="Attach file"
                >
                  <Paperclip size={15} />
                </button>

                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={`Write a message to ${activeContact.name}…`}
                  className="flex-1 h-10 px-3.5 text-xs rounded-xl bg-gray-50/80 dark:bg-[#1c2026] border border-gray-200 dark:border-[#262b31] text-gray-950 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-900 dark:focus:ring-gray-100"
                />

                <button
                  type="submit"
                  disabled={!draft.trim()}
                  className="h-10 px-4 rounded-xl bg-gray-950 hover:bg-black text-white dark:bg-white dark:hover:bg-gray-200 dark:text-gray-950 text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <Send size={13} />
                  <span className="hidden sm:inline">Send</span>
                </button>
              </form>
            </>
          )}
        </section>
      </div>

      {/* New conversation modal */}
      <NewConversationModal
        key={newChatOpen ? 'open' : 'closed'}
        open={newChatOpen}
        onClose={() => setNewChatOpen(false)}
        onSelect={handleSelectContact}
      />

      {/* Attachment upload modal */}
      {pendingFile && activeContact && (
        <AttachmentModal
          file={pendingFile}
          caption={attachmentCaption}
          onCaptionChange={setAttachmentCaption}
          contactName={activeContact.name}
          uploading={uploading}
          onSend={handleSendAttachment}
          onCancel={handleCancelAttachment}
        />
      )}
    </div>
  )
}

export default Inbox
