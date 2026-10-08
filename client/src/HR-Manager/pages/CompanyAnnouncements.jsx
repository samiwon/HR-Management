import { useEffect, useState } from 'react'
import { AlertCircle, Info, Loader2, Megaphone, Plus, Send, Trash2, X } from 'lucide-react'
import { Button, PageTitle } from '../../components/ui'
import { Can } from '../../lib/rbac'
import { authHeaders } from '../../lib/hrApi'

const API_URL = '/api/announcements'
const emptyForm = { title: '', content: '', category: 'General', priority: 'Normal', recipientEmployeeId: '' }

function formatDate(value) {
  if (!value) return 'Just now'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

async function request(path = '', options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: authHeaders(options.body ? { 'Content-Type': 'application/json' } : {}),
    cache: 'no-store',
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.message || 'Announcement request failed.')
  return data
}

function NewAnnouncementModal({ onClose, onCreated }) {
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [employees, setEmployees] = useState([])

  useEffect(() => {
    fetch('/api/hr-manager/employees', { headers: authHeaders(), cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.message || 'Could not load employees')
        setEmployees(Array.isArray(data) ? data : data.employees || [])
      })
      .catch(() => setEmployees([]))
  }, [])

  async function submit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const announcement = await request('', { method: 'POST', body: JSON.stringify(form) })
      onCreated(announcement)
    } catch (requestError) {
      setError(requestError.message || 'Unable to create announcement.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-sm sm:p-5" onMouseDown={(event) => event.target === event.currentTarget && !saving && onClose()}>
      <section role="dialog" aria-modal="true" aria-labelledby="announcement-modal-title" className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
          <div><p className="text-xs font-semibold uppercase tracking-wide text-[#0092B8]">Company Announcements</p><h2 id="announcement-modal-title" className="mt-1 text-lg font-bold text-slate-900">Create announcement</h2></div>
          <button type="button" disabled={saving} onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 disabled:opacity-50"><X size={18} /></button>
        </header>
        <form onSubmit={submit} className="space-y-4 p-5 sm:p-6">
          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Announcement title</span><input autoFocus required maxLength={140} value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Add a clear title" className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-[#0092B8] focus:ring-2 focus:ring-cyan-100" /></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Category</span><select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-[#0092B8]"><option>General</option><option>People &amp; Culture</option><option>Operations</option><option>Benefits</option><option>Events</option></select></label>
            <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Priority</span><select value={form.priority} onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-[#0092B8]"><option>Normal</option><option>Important</option><option>Urgent</option></select></label>
          </div>
          <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Audience</span><select value={form.recipientEmployeeId} onChange={(event) => setForm((current) => ({ ...current, recipientEmployeeId: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-[#0092B8]"><option value="">Everyone (company announcement)</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name || `${employee.firstName || ''} ${employee.lastName || ''}`.trim()} · {employee.employeeId || employee.id}</option>)}</select><span className="mt-1 block text-xs text-slate-500">Choose one employee to send an individual announcement.</span></label>
          <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600">Message</span><textarea required maxLength={10000} rows={6} value={form.content} onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))} placeholder="Write the update employees need to know…" className="w-full resize-y rounded-xl border border-slate-200 px-3.5 py-3 text-sm leading-6 outline-none focus:border-[#0092B8] focus:ring-2 focus:ring-cyan-100" /></label>
          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end"><button type="button" disabled={saving} onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Cancel</button><button type="submit" disabled={saving || !form.title.trim() || !form.content.trim()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0092B8] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#007a99] disabled:opacity-50">{saving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}{saving ? 'Publishing…' : 'Publish announcement'}</button></div>
        </form>
      </section>
    </div>
  )
}

export default function CompanyAnnouncements() {
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let active = true
    request()
      .then((data) => active && setAnnouncements(Array.isArray(data) ? data : data.announcements || []))
      .catch((requestError) => active && setError(requestError.message || 'Unable to load announcements.'))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [])

  function handleCreated(announcement) {
    setAnnouncements((current) => [announcement, ...current.filter((item) => item.id !== announcement.id)])
    setModalOpen(false)
    window.dispatchEvent(new CustomEvent('company-announcement-created', { detail: announcement }))
    try { localStorage.setItem('company-announcement-created', JSON.stringify({ id: announcement.id, at: Date.now() })) } catch {}
  }

  async function deleteSelectedAnnouncement() {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      await request(`/${encodeURIComponent(confirmDelete.id)}`, { method: 'DELETE' })
      setAnnouncements((items) => items.filter((item) => item.id !== confirmDelete.id))
      setConfirmDelete(null)
    } catch (deleteError) {
      setError(deleteError.message || 'Unable to delete announcement.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="min-h-full bg-[#F3F4F6] text-slate-950">
      <main className="w-full max-w-[1600px] px-5 py-6 sm:px-8">
        <PageTitle
          eyebrow="Company Updates"
          title="Company Announcements"
          description="Broadcast notices, policies, and company-wide news across the organization."
          className="animate-employee-hero mb-8 px-0 py-2"
          action={
            <Can permission="announcements.create">
              <Button
                type="button"
                onClick={() => setModalOpen(true)}
                icon={Plus}
              >
                New Announcement
              </Button>
            </Can>
          }
        />

        {error && <div role="alert" className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><AlertCircle className="mt-0.5 shrink-0" size={17} />{error}</div>}

        <section className="min-h-[360px] overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.05)]">
          {loading ? <div className="flex min-h-[360px] items-center justify-center"><span className="inline-flex items-center gap-2 text-sm font-medium text-slate-500"><Loader2 size={17} className="animate-spin" />Loading announcements…</span></div> : error ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center px-6 py-12 text-center"><AlertCircle size={28} className="text-rose-500" /><h2 className="mt-4 text-base font-bold text-slate-900">Announcements couldn’t be loaded</h2><p className="mt-1 text-sm text-slate-500">Please check your connection and try again.</p></div>
          ) : announcements.length === 0 ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center px-6 py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-50 text-[#0092B8]"><Info size={25} strokeWidth={1.8} /></div>
              <h2 className="mt-5 text-lg font-bold text-slate-900">No Announcements Yet</h2>
              <p className="mt-1.5 text-sm text-slate-500">Check back later for important updates.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {announcements.map((announcement) => <article key={announcement.id} className="flex gap-4 px-5 py-5 transition hover:bg-slate-50/70 sm:px-7 sm:py-6"><div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-[#0092B8]"><Megaphone size={19} /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="text-base font-bold text-slate-900">{announcement.title}</h2><span className="rounded-full bg-cyan-50 px-2.5 py-1 text-[10px] font-bold text-[#007a99]">{announcement.category || 'General'}</span>{announcement.priority && announcement.priority !== 'Normal' && <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${announcement.priority === 'Urgent' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>{announcement.priority}</span>}</div><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">{announcement.content}</p><p className="mt-3 text-xs text-slate-400">{announcement.author?.name ? `Posted by ${announcement.author.name} · ` : ''}{formatDate(announcement.createdAt)}</p></div><Can permission="announcements.delete"><button type="button" onClick={() => setConfirmDelete(announcement)} aria-label={`Delete announcement: ${announcement.title}`} title="Delete announcement" className="self-start rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={16} /></button></Can></article>)}
            </div>
          )}
        </section>
      </main>
      {modalOpen && <NewAnnouncementModal onClose={() => setModalOpen(false)} onCreated={handleCreated} />}
      {confirmDelete && <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 p-4"><section role="alertdialog" aria-modal="true" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><h2 className="text-lg font-bold text-slate-900">Delete announcement?</h2><p className="mt-2 text-sm text-slate-600">“{confirmDelete.title}” will be removed for all employees. This cannot be undone.</p><div className="mt-6 flex justify-end gap-3"><button type="button" disabled={deleting} onClick={() => setConfirmDelete(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button><button type="button" disabled={deleting} onClick={deleteSelectedAnnouncement} className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{deleting ? 'Deleting…' : 'Delete announcement'}</button></div></section></div>}
    </div>
  )
}
