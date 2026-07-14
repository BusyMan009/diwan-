'use client'

import { useState, useEffect } from 'react'

interface Note {
  id: string
  title: string | null
  content: string
  created_at: string
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (m < 1) return 'الآن'
  if (m < 60) return `منذ ${m} دقيقة`
  if (h < 24) return `منذ ${h} ساعة`
  return `منذ ${d} يوم`
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [editing, setEditing] = useState<Note | null>(null)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    fetchNotes()
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  async function fetchNotes() {
    const res = await fetch('/api/notes')
    const data = await res.json()
    setNotes(data)
  }

  async function handleSave() {
    if (!content.trim()) return
    setSaving(true)

    if (editing) {
      await fetch('/api/notes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editing.id, title, content }),
      })
    } else {
      await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content }),
      })
    }

    setTitle('')
    setContent('')
    setEditing(null)
    setShowForm(false)
    setSaving(false)
    await fetchNotes()
  }

  function handleEdit(note: Note) {
    setEditing(note)
    setTitle(note.title || '')
    setContent(note.content)
    setShowForm(true)
  }

  function handleCancel() {
    setEditing(null)
    setTitle('')
    setContent('')
    setShowForm(false)
  }

  async function handleDelete(id: string) {
    await fetch(`/api/notes/${id}`, { method: 'DELETE' })
    await fetchNotes()
  }

  const inputStyle = {
    width: '100%',
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '8px 12px',
    color: 'var(--text-1)',
    fontFamily: 'var(--font-geist)',
    fontSize: '13px',
    outline: 'none',
    direction: 'rtl' as const,
  }

  return (
    <div style={{ maxWidth: '800px', width: '100%' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isMobile ? '24px' : '40px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-geist-mono)', fontSize: isMobile ? '20px' : '24px', fontWeight: 400, letterSpacing: '-0.02em', color: 'var(--text-1)' }}>
            الملاحظات
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
            أفكارك ومذكراتك في مكان واحد
          </p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); if (showForm) handleCancel() }}
          style={{
            background: 'var(--text-1)', color: 'var(--bg)', border: 'none',
            borderRadius: 'var(--radius-md)', padding: '8px 16px',
            fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-geist)',
          }}
        >
          {showForm ? 'إلغاء' : '+ جديد'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '20px', marginBottom: '24px' }}>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ color: 'var(--text-2)', fontSize: '12px', fontWeight: 500, display: 'block', marginBottom: '6px' }}>العنوان (اختياري)</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="عنوان الملاحظة..."
              style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ color: 'var(--text-2)', fontSize: '12px', fontWeight: 500, display: 'block', marginBottom: '6px' }}>المحتوى *</label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="اكتب ملاحظتك هنا..."
              rows={6}
              autoFocus
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button onClick={handleCancel} style={{ background: 'transparent', color: 'var(--text-2)', border: '1px solid var(--border)', padding: '7px 14px', borderRadius: 'var(--radius-md)', fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--font-geist)' }}>
              إلغاء
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !content.trim()}
              style={{ background: 'var(--text-1)', color: 'var(--bg)', border: 'none', padding: '7px 14px', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-geist)', opacity: saving || !content.trim() ? 0.4 : 1 }}
            >
              {saving ? 'جاري الحفظ...' : editing ? 'تحديث' : 'حفظ'}
            </button>
          </div>
        </div>
      )}

      {/* Notes Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
        {notes.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '48px', color: 'var(--text-muted)', fontSize: '13px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
            لا توجد ملاحظات بعد
          </div>
        )}
        {notes.map(note => (
          <div key={note.id} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {note.title && (
              <div style={{ color: 'var(--text-1)', fontSize: '13px', fontWeight: 500 }}>{note.title}</div>
            )}
            <div style={{
              color: 'var(--text-2)', fontSize: '12px', lineHeight: 1.6, direction: 'rtl',
              overflow: 'hidden', display: '-webkit-box',
              WebkitLineClamp: 4, WebkitBoxOrient: 'vertical' as const,
            }}>
              {note.content}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{timeAgo(note.created_at)}</span>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button onClick={() => handleEdit(note)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', borderRadius: '4px' }}>
                  <i className="ti ti-edit" style={{ fontSize: '14px' }} />
                </button>
                <button onClick={() => handleDelete(note.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', borderRadius: '4px' }}>
                  <i className="ti ti-trash" style={{ fontSize: '14px' }} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}