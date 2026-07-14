'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
interface Guest {
  id: string
  name: string
  pin: string
  active: boolean
  created_at: string
}

interface Drop {
  id: string
  guest_id: string
  sender_name: string
  type: string
  content: string | null
  file_url: string | null
  file_name: string | null
  file_size: number | null
  mime_type: string | null
  direction: string
  expires_at: string | null
  created_at: string
  guests: { name: string; pin: string }
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
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

const EXPIRY_OPTIONS = [
  { label: 'لانهائي', value: null },
  { label: '30 دقيقة', value: 30 },
  { label: 'ساعة', value: 60 },
  { label: '6 ساعات', value: 360 },
  { label: 'يوم', value: 1440 },
  { label: '7 أيام', value: 10080 },
]

export default function GuestDropPage() {
  const [guests, setGuests] = useState<Guest[]>([])
  const [drops, setDrops] = useState<Drop[]>([])
  const [showForm, setShowForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [selectedGuest, setSelectedGuest] = useState<string | null>(null)
  const [sendToGuest, setSendToGuest] = useState<Guest | null>(null)
  const [sendText, setSendText] = useState('')
  const [sendFile, setSendFile] = useState<File | null>(null)
  const [sendExpiry, setSendExpiry] = useState<number | null>(null)
  const [sendTab, setSendTab] = useState<'text' | 'file'>('text')
  const [sending, setSending] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

useEffect(() => {
  fetchAll()
  const check = () => setIsMobile(window.innerWidth < 768)
  check()
  window.addEventListener('resize', check)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const channel = supabase
    .channel('dashboard-guest-drops')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'guest_drops',
    }, () => {
      fetchAll()
    })
    .subscribe()

  return () => {
    window.removeEventListener('resize', check)
    supabase.removeChannel(channel)
  }
}, [])
  async function fetchAll() {
    const [g, d] = await Promise.all([
      fetch('/api/guests').then(r => r.json()),
      fetch('/api/guest-drop').then(r => r.json()),
    ])
    setGuests(g || [])
    setDrops(d || [])
  }

  async function handleCreate() {
    if (!newName.trim()) return
    setCreating(true)
    await fetch('/api/guests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    })
    setNewName('')
    setShowForm(false)
    setCreating(false)
    await fetchAll()
  }

  async function toggleGuest(id: string, active: boolean) {
    await fetch(`/api/guests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !active }),
    })
    await fetchAll()
  }

  async function deleteGuest(id: string) {
    await fetch(`/api/guests/${id}`, { method: 'DELETE' })
    await fetchAll()
  }

  function copyLink(pin: string, id: string) {
    navigator.clipboard.writeText(`${window.location.origin}/drop/${pin}`)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  async function handleSendToGuest() {
    if (!sendToGuest) return
    setSending(true)

    if (sendTab === 'text') {
      await fetch('/api/guest-drop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin: sendToGuest.pin,
          sender_name: 'ديوان',
          content: sendText,
          direction: 'outgoing',
          expiry: sendExpiry,
        }),
      })
    } else if (sendFile) {
      const formData = new FormData()
      formData.append('pin', sendToGuest.pin)
      formData.append('sender_name', 'ديوان')
      formData.append('file', sendFile)
      formData.append('direction', 'outgoing')
      if (sendExpiry) formData.append('expiry', String(sendExpiry))
      await fetch('/api/guest-drop', { method: 'POST', body: formData })
    }

    setSending(false)
    setSendToGuest(null)
    setSendText('')
    setSendFile(null)
    setSendExpiry(null)
    await fetchAll()
  }

  const filteredDrops = selectedGuest
    ? drops.filter(d => d.guest_id === selectedGuest)
    : drops

  return (
    <div style={{ maxWidth: '900px', width: '100%' }}>

      {/* Send Modal */}
      {sendToGuest && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '20px',
        }}>
          <div style={{
            background: 'var(--bg-surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)', padding: '24px',
            width: '100%', maxWidth: '420px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <span style={{ color: 'var(--text-1)', fontSize: '14px', fontWeight: 500 }}>
                إرسال إلى {sendToGuest.name}
              </span>
              <button onClick={() => setSendToGuest(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '18px' }}>×</button>
            </div>

            <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
              {[{ key: 'text', label: '💬 نص' }, { key: 'file', label: '📎 ملف' }].map(t => (
                <button
                  key={t.key}
                  onClick={() => setSendTab(t.key as any)}
                  style={{
                    flex: 1, padding: '7px', borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: sendTab === t.key ? 'var(--text-1)' : 'var(--bg)',
                    color: sendTab === t.key ? 'var(--bg)' : 'var(--text-muted)',
                    fontSize: '12px', cursor: 'pointer',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {sendTab === 'text' && (
              <textarea
                value={sendText}
                onChange={e => setSendText(e.target.value)}
                placeholder="اكتب رسالتك..."
                rows={4}
                style={{
                  width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
                  borderRadius: '8px', padding: '10px 12px', color: 'var(--text-1)',
                  fontSize: '13px', outline: 'none', resize: 'none', direction: 'rtl',
                  marginBottom: '12px',
                }}
              />
            )}

            {sendTab === 'file' && (
              <label style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                border: '1px dashed var(--border)', borderRadius: '8px', padding: '24px',
                cursor: 'pointer', color: 'var(--text-muted)', fontSize: '13px', marginBottom: '12px',
              }}>
                📎 {sendFile ? sendFile.name : 'اضغط لاختيار ملف'}
                <input type="file" onChange={e => setSendFile(e.target.files?.[0] || null)} style={{ display: 'none' }} />
              </label>
            )}

            <div style={{ marginBottom: '16px' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '6px' }}>احذفه تلقائياً بعد</div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {EXPIRY_OPTIONS.map(opt => (
                  <button
                    key={String(opt.value)}
                    onClick={() => setSendExpiry(opt.value)}
                    style={{
                      padding: '4px 10px', borderRadius: '8px', border: '1px solid var(--border)',
                      background: sendExpiry === opt.value ? 'var(--text-1)' : 'var(--bg)',
                      color: sendExpiry === opt.value ? 'var(--bg)' : 'var(--text-muted)',
                      fontSize: '11px', cursor: 'pointer',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleSendToGuest}
              disabled={sending || (sendTab === 'text' ? !sendText.trim() : !sendFile)}
              style={{
                width: '100%', background: 'var(--text-1)', color: 'var(--bg)',
                border: 'none', borderRadius: '8px', padding: '10px',
                fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                opacity: sending || (sendTab === 'text' ? !sendText.trim() : !sendFile) ? 0.4 : 1,
              }}
            >
              {sending ? 'جاري الإرسال...' : 'إرسال'}
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-geist-mono)', fontSize: isMobile ? '20px' : '24px', fontWeight: 400, letterSpacing: '-0.02em', color: 'var(--text-1)' }}>
            Guest Drop
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
            أرسل رابط لأي شخص يرسل لك ملفات أو رسائل
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            background: 'var(--text-1)', color: 'var(--bg)', border: 'none',
            borderRadius: 'var(--radius-md)', padding: '8px 16px',
            fontSize: '13px', fontWeight: 500, cursor: 'pointer',
          }}
        >
          {showForm ? 'إلغاء' : '+ ضيف جديد'}
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)', padding: '20px', marginBottom: '20px',
        }}>
          <div style={{ color: 'var(--text-2)', fontSize: '12px', marginBottom: '8px' }}>اسم الضيف</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              placeholder="مثل: أبوي، صديق أحمد..."
              autoFocus
              style={{
                flex: 1, background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)', padding: '8px 12px',
                color: 'var(--text-1)', fontSize: '13px', outline: 'none', direction: 'rtl',
              }}
            />
            <button
              onClick={handleCreate}
              disabled={creating || !newName.trim()}
              style={{
                background: 'var(--text-1)', color: 'var(--bg)', border: 'none',
                borderRadius: 'var(--radius-md)', padding: '8px 16px',
                fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                opacity: creating || !newName.trim() ? 0.4 : 1,
              }}
            >
              إنشاء
            </button>
          </div>
        </div>
      )}

      {/* Guests */}
      {guests.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '10px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>الضيوف</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {guests.map(guest => (
              <div key={guest.id} style={{
                background: 'var(--bg-surface)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)', padding: '14px 16px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0, background: guest.active ? '#4ade80' : '#444' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: 'var(--text-1)', fontSize: '13px', fontWeight: 500 }}>{guest.name}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px', fontFamily: 'monospace' }}>PIN: {guest.pin}</div>
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '11px', flexShrink: 0 }}>
                    {drops.filter(d => d.guest_id === guest.id).length} إرسال
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0, flexWrap: 'wrap' }}>
                    <button onClick={() => copyLink(guest.pin, guest.id)} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '5px 10px', color: copiedId === guest.id ? '#4ade80' : 'var(--text-muted)', fontSize: '11px', cursor: 'pointer' }}>
                      {copiedId === guest.id ? '✓ تم' : '🔗 رابط'}
                    </button>
                    <button onClick={() => setSendToGuest(guest)} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '5px 10px', color: 'var(--text-muted)', fontSize: '11px', cursor: 'pointer' }}>
                      📤 إرسال
                    </button>
                    <button onClick={() => setSelectedGuest(selectedGuest === guest.id ? null : guest.id)} style={{ background: selectedGuest === guest.id ? 'var(--text-1)' : 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '5px 10px', color: selectedGuest === guest.id ? 'var(--bg)' : 'var(--text-muted)', fontSize: '11px', cursor: 'pointer' }}>
                      📥 الإرساليات
                    </button>
                    <button onClick={() => toggleGuest(guest.id, guest.active)} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '5px 10px', color: 'var(--text-muted)', fontSize: '11px', cursor: 'pointer' }}>
                      {guest.active ? 'تعطيل' : 'تفعيل'}
                    </button>
                    <button onClick={() => deleteGuest(guest.id)} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '5px 10px', color: '#f87171', fontSize: '11px', cursor: 'pointer' }}>
                      حذف
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Drops */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            الإرساليات {selectedGuest && `— ${guests.find(g => g.id === selectedGuest)?.name}`}
          </div>
          {selectedGuest && (
            <button onClick={() => setSelectedGuest(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '11px', cursor: 'pointer' }}>
              عرض الكل
            </button>
          )}
        </div>

        {filteredDrops.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)', fontSize: '13px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
            لا توجد إرساليات بعد
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredDrops.map(drop => (
              <div key={drop.id} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '11px' }}>{drop.direction === 'outgoing' ? '📤' : '📥'}</span>
                      <span style={{ color: 'var(--text-1)', fontSize: '13px', fontWeight: 500 }}>{drop.sender_name}</span>
                      <span style={{ background: 'var(--bg)', color: 'var(--text-muted)', fontSize: '10px', padding: '1px 6px', borderRadius: '9999px', border: '1px solid var(--border)' }}>
                        {drop.guests?.name}
                      </span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>{timeAgo(drop.created_at)}</span>
                      {drop.expires_at && (
                        <span style={{ color: '#f59e0b', fontSize: '10px' }}>⏱ ينتهي قريباً</span>
                      )}
                    </div>
                    {drop.type === 'text' && (
                      <div style={{ color: 'var(--text-2)', fontSize: '13px', direction: 'rtl', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as const }}>
                        {drop.content}
                      </div>
                    )}
                    {drop.type === 'file' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <i className="ti ti-file" style={{ color: 'var(--text-muted)', fontSize: '16px' }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ color: 'var(--text-1)', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{drop.file_name}</div>
                          {drop.file_size && <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{formatSize(drop.file_size)}</div>}
                        </div>
                        {drop.file_url && (
                          <a href={drop.file_url} target="_blank" rel="noreferrer" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
                            <i className="ti ti-download" style={{ fontSize: '15px' }} />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}