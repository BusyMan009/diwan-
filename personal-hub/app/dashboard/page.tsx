'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface FileItem {
  id: string
  name: string
  title: string | null
  mime_type: string
  created_at: string
}

interface ClipItem {
  id: string
  content: string
  created_at: string
}

interface Reminder {
  id: string
  title: string
  event_date: string
  notify_before: number[]
}

interface NoteItem {
  id: string
  title: string
  content: string
  created_at: string
}

interface LinkItem {
  id: string
  title: string
  url: string
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

function getDaysLeft(date: string) {
  const diff = new Date(date).getTime() - Date.now()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  if (days < 0) return { label: 'انتهى', color: '#666' }
  if (days === 0) return { label: 'اليوم!', color: '#f59e0b' }
  if (days === 1) return { label: 'غداً!', color: '#f59e0b' }
  return { label: `بعد ${days} يوم`, color: '#4ade80' }
}

function getFileIcon(mime: string) {
  if (mime.startsWith('image/')) return 'ti-photo'
  if (mime.includes('pdf')) return 'ti-file-type-pdf'
  if (mime.includes('word')) return 'ti-file-type-doc'
  if (mime.includes('zip') || mime.includes('rar')) return 'ti-file-zip'
  if (mime.includes('video')) return 'ti-video'
  if (mime.includes('audio')) return 'ti-music'
  return 'ti-file'
}

function Card({ title, icon, href, count, children }: {
  title: string
  icon: string
  href: string
  count?: number
  children: React.ReactNode
}) {
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i className={`ti ${icon}`} style={{ fontSize: '15px', color: 'var(--text-muted)' }} />
          <span style={{ color: 'var(--text-1)', fontSize: '13px', fontWeight: 500 }}>{title}</span>
          {count !== undefined && (
            <span style={{
              background: 'var(--bg)', color: 'var(--text-muted)',
              fontSize: '10px', padding: '1px 6px', borderRadius: '9999px',
              border: '1px solid var(--border)',
            }}>{count}</span>
          )}
        </div>
        <Link href={href} style={{ color: 'var(--text-muted)', fontSize: '11px', textDecoration: 'none' }}>
          عرض الكل ←
        </Link>
      </div>
      {children}
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', padding: '16px 0' }}>
      {text}
    </div>
  )
}

export default function DashboardPage() {
  const [files, setFiles] = useState<FileItem[]>([])
  const [clips, setClips] = useState<ClipItem[]>([])
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [notes, setNotes] = useState<NoteItem[]>([])
  const [links, setLinks] = useState<LinkItem[]>([])
  const [time, setTime] = useState(new Date())
  const [isMobile, setIsMobile] = useState(false)

  const fetchAll = useCallback(() => {
    fetch('/api/files').then(r => r.json()).then(d => setFiles(d || []))
    fetch('/api/clipboard').then(r => r.json()).then(d => setClips(d || []))
    fetch('/api/reminders').then(r => r.json()).then(d => setReminders(d || []))
    fetch('/api/notes').then(r => r.json()).then(d => setNotes(d || []))
    fetch('/api/links').then(r => r.json()).then(d => setLinks(d || []))
  }, [])

  useEffect(() => {
    fetchAll()

    // يسمع لأي تغيير من الصفحات الثانية
    const bc = new BroadcastChannel('dashboard')
    bc.onmessage = () => fetchAll()

    const timer = setInterval(() => setTime(new Date()), 1000)
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)

    return () => {
      bc.close()
      clearInterval(timer)
      window.removeEventListener('resize', checkMobile)
    }
  }, [fetchAll])

  const upcomingReminders = reminders
    .filter(r => new Date(r.event_date) > new Date())
    .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
    .slice(0, 3)

  const greeting = () => {
    const h = time.getHours()
    if (h < 5) return 'طيبة الليل 🌙'
    if (h < 12) return 'صباح الخير ☀️'
    if (h < 17) return 'مساء النشاط 💪'
    if (h < 21) return 'مساء الخير 🌆'
    return 'طيبة المساء 🌙'
  }

  return (
    <div style={{ maxWidth: '1000px', width: '100%' }}>

      {/* Header */}
      <div style={{ marginBottom: isMobile ? '24px' : '40px' }}>
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          gap: '8px',
        }}>
          <div>
            <h1 style={{
              fontFamily: 'var(--font-geist-mono)',
              fontSize: isMobile ? '20px' : '28px',
              fontWeight: 400,
              letterSpacing: '-0.02em',
              color: 'var(--text-1)',
              marginBottom: '4px',
            }}>
              {greeting()}
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
              {time.toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div style={{
            fontFamily: 'var(--font-geist-mono)',
            fontSize: isMobile ? '22px' : '32px',
            color: 'var(--text-1)',
            letterSpacing: '-0.02em',
          }}>
            {time.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
        gap: '10px',
        marginBottom: '20px',
      }}>
        {[
          { label: 'ملفات', count: files.length, icon: 'ti-folder', href: '/dashboard/files' },
          { label: 'مقتطفات', count: clips.length, icon: 'ti-clipboard', href: '/dashboard/clipboard' },
          { label: 'ملاحظات', count: notes.length, icon: 'ti-notes', href: '/dashboard/notes' },
          { label: 'روابط', count: links.length, icon: 'ti-link', href: '/dashboard/links' },
        ].map(stat => (
          <Link key={stat.href} href={stat.href} style={{ textDecoration: 'none' }}>
            <div
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: isMobile ? '12px' : '16px',
                textAlign: 'center',
                transition: 'border-color 0.2s',
                cursor: 'pointer',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--text-muted)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <i className={`ti ${stat.icon}`} style={{ fontSize: isMobile ? '16px' : '20px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }} />
              <div style={{ fontFamily: 'var(--font-geist-mono)', fontSize: isMobile ? '20px' : '24px', color: 'var(--text-1)', fontWeight: 400 }}>{stat.count}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px' }}>{stat.label}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Main Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        gap: '14px',
      }}>

        {/* Reminders */}
        <Card title="الريمايندرات القادمة" icon="ti-bell" href="/dashboard/reminders" count={upcomingReminders.length}>
          {upcomingReminders.length === 0 ? (
            <EmptyState text="لا توجد مواعيد قادمة" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {upcomingReminders.map(r => {
                const { label, color } = getDaysLeft(r.event_date)
                return (
                  <div key={r.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: 'var(--bg)',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    gap: '8px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <i className="ti ti-bell" style={{ fontSize: '13px', color: 'var(--text-muted)', flexShrink: 0 }} />
                      <span style={{ color: 'var(--text-1)', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</span>
                    </div>
                    <span style={{ fontSize: '11px', color, fontWeight: 500, flexShrink: 0 }}>{label}</span>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        {/* Files */}
        <Card title="آخر الملفات" icon="ti-folder" href="/dashboard/files" count={files.length}>
          {files.length === 0 ? (
            <EmptyState text="لا توجد ملفات" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {files.slice(0, 4).map(f => (
                <div key={f.id} style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '6px 10px',
                  background: 'var(--bg)',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                }}>
                  <i className={`ti ${getFileIcon(f.mime_type)}`} style={{ fontSize: '14px', color: 'var(--text-muted)', flexShrink: 0 }} />
                  <span style={{ color: 'var(--text-1)', fontSize: '12px', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {f.title || f.name}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '10px', flexShrink: 0 }}>{timeAgo(f.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Clipboard */}
        <Card title="آخر الحافظة" icon="ti-clipboard" href="/dashboard/clipboard" count={clips.length}>
          {clips.length === 0 ? (
            <EmptyState text="الحافظة فارغة" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {clips.slice(0, 3).map(c => (
                <div key={c.id} style={{
                  padding: '8px 12px',
                  background: 'var(--bg)',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                }}>
                  <div style={{
                    color: 'var(--text-2)', fontSize: '12px',
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical' as const,
                    direction: 'rtl',
                    wordBreak: 'break-all',
                    maxWidth: '100%',
                  }}>
                    {c.content.slice(0, 120)}{c.content.length > 120 ? '...' : ''}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '10px', marginTop: '4px' }}>{timeAgo(c.created_at)}</div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Notes */}
        <Card title="آخر الملاحظات" icon="ti-notes" href="/dashboard/notes" count={notes.length}>
          {notes.length === 0 ? (
            <EmptyState text="لا توجد ملاحظات" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {notes.slice(0, 3).map(n => (
                <div key={n.id} style={{
                  padding: '8px 12px',
                  background: 'var(--bg)',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                }}>
                  <div style={{ color: 'var(--text-1)', fontSize: '12px', fontWeight: 500, marginBottom: '2px' }}>
                    {n.title || 'بدون عنوان'}
                  </div>
<div style={{
  color: 'var(--text-muted)', fontSize: '11px',
  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  maxWidth: '100%',
}}>
  {n.content.slice(0, 80)}{n.content.length > 80 ? '...' : ''}
</div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Links */}
        <Card title="آخر الروابط" icon="ti-link" href="/dashboard/links" count={links.length}>
          {links.length === 0 ? (
            <EmptyState text="لا توجد روابط" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {links.slice(0, 4).map(l => (
                <a key={l.id} href={l.url} target="_blank" rel="noreferrer" style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '6px 10px',
                  background: 'var(--bg)',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  textDecoration: 'none',
                }}>
                  <i className="ti ti-external-link" style={{ fontSize: '13px', color: 'var(--text-muted)', flexShrink: 0 }} />
                  <span style={{ color: 'var(--text-1)', fontSize: '12px', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {l.title || l.url}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '10px', flexShrink: 0 }}>{timeAgo(l.created_at)}</span>
                </a>
              ))}
            </div>
          )}
        </Card>

        {/* Quick Clipboard */}
        <Card title="حفظ سريع في الحافظة" icon="ti-bolt" href="/dashboard/clipboard">
          <QuickClip onSaved={fetchAll} isMobile={isMobile} />
        </Card>

      </div>
    </div>
  )
}

function QuickClip({ onSaved, isMobile }: { onSaved: () => void, isMobile: boolean }) {
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!text.trim()) return
    setSaving(true)
    await fetch('/api/clipboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text }),
    })
    setText('')
    setSaving(false)
    onSaved()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="الصق أي نص بسرعة..."
        rows={3}
        onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleSave() }}
        style={{
          width: '100%',
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '8px 12px',
          color: 'var(--text-1)',
          fontFamily: 'var(--font-geist)',
          fontSize: '12px',
          outline: 'none',
          resize: 'none',
          direction: 'rtl',
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {!isMobile && <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>Ctrl+Enter للحفظ</span>}
        <button
          onClick={handleSave}
          disabled={saving || !text.trim()}
          style={{
            background: 'var(--text-1)', color: 'var(--bg)', border: 'none',
            borderRadius: '8px', padding: '6px 14px',
            fontSize: '12px', fontWeight: 500, cursor: 'pointer',
            fontFamily: 'var(--font-geist)',
            opacity: saving || !text.trim() ? 0.4 : 1,
            marginRight: isMobile ? 'auto' : '0',
          }}
        >
          حفظ
        </button>
      </div>
    </div>
  )
}