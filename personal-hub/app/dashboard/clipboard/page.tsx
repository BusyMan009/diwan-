'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
interface ClipItem {
  id: string
  content: string
  created_at: string
  expires_at: string | null
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

function expiryLabel(date: string | null) {
  if (!date) return null
  const diff = new Date(date).getTime() - Date.now()
  if (diff <= 0) return 'منتهي'
  const m = Math.floor(diff / 60000)
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (m < 60) return `ينتهي بعد ${m} دقيقة`
  if (h < 24) return `ينتهي بعد ${h} ساعة`
  return `ينتهي بعد ${d} يوم`
}

const EXPIRY_OPTIONS = [
  { label: 'لانهائي', value: null },
  { label: '30 دقيقة', value: 30 },
  { label: 'ساعة', value: 60 },
  { label: '6 ساعات', value: 360 },
  { label: 'يوم', value: 1440 },
  { label: '7 أيام', value: 10080 },
]

export default function ClipboardPage() {
  const [items, setItems] = useState<ClipItem[]>([])
  const [text, setText] = useState('')
  const [expiry, setExpiry] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    fetchItems()
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

async function fetchItems() {
  const res = await fetch('/api/clipboard')
  const data = await res.json()
  setItems(data)
}

useEffect(() => {
  fetchItems()
  const check = () => setIsMobile(window.innerWidth < 768)
  check()
  window.addEventListener('resize', check)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const channel = supabase
    .channel('clipboard-realtime')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'clipboard',
    }, () => {
      fetchItems()
    })
    .subscribe()

  return () => {
    window.removeEventListener('resize', check)
    supabase.removeChannel(channel)
  }
}, [])

  async function handleSave() {
    if (!text.trim()) return
    setLoading(true)
    await fetch('/api/clipboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text, expiry }),
    })
    setText('')
    setExpiry(null)
    await fetchItems()
    setLoading(false)
  }

  async function handleDelete(id: string) {
    await fetch(`/api/clipboard/${id}`, { method: 'DELETE' })
    await fetchItems()
  }

  async function handleCopy(content: string, id: string) {
    await navigator.clipboard.writeText(content)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div style={{ maxWidth: '720px', width: '100%' }}>

      {/* Header */}
      <div style={{ marginBottom: isMobile ? '24px' : '40px' }}>
        <h1 style={{
          fontFamily: 'var(--font-geist-mono)',
          fontSize: isMobile ? '20px' : '24px',
          fontWeight: 400,
          letterSpacing: '-0.02em',
          color: 'var(--text-1)',
        }}>
          الحافظة
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
          احفظ النصوص والأكواد والروابط
        </p>
      </div>

      {/* Input Card */}
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: isMobile ? '12px' : '16px',
        marginBottom: '20px',
      }}>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="الصق أي نص، كود، أو رابط..."
          rows={isMobile ? 3 : 4}
          onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleSave() }}
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--text-1)',
            fontFamily: 'var(--font-geist)',
            fontSize: isMobile ? '13px' : '14px',
            lineHeight: 1.6,
            resize: 'vertical',
            direction: 'rtl',
          }}
        />

        {/* Expiry Options */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: '8px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '8px' }}>احذفه تلقائياً بعد</div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {EXPIRY_OPTIONS.map(opt => (
              <button
                key={String(opt.value)}
                type="button"
                onClick={() => setExpiry(opt.value)}
                style={{
                  padding: isMobile ? '5px 10px' : '4px 10px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  background: expiry === opt.value ? 'var(--text-1)' : 'var(--bg)',
                  color: expiry === opt.value ? 'var(--bg)' : 'var(--text-muted)',
                  fontSize: isMobile ? '12px' : '11px',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-geist)',
                  transition: 'all 0.15s',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
          {!isMobile && <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Ctrl+Enter للحفظ</span>}
          <button
            onClick={handleSave}
            disabled={loading || !text.trim()}
            style={{
              background: 'var(--text-1)',
              color: 'var(--bg)',
              border: 'none',
              padding: isMobile ? '8px 20px' : '7px 14px',
              borderRadius: 'var(--radius-md)',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              opacity: loading || !text.trim() ? 0.4 : 1,
              fontFamily: 'var(--font-geist)',
              width: isMobile ? '100%' : 'auto',
            }}
          >
            حفظ
          </button>
        </div>
      </div>

      {/* Items List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {items.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '48px',
            color: 'var(--text-muted)', fontSize: '13px',
            border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
          }}>
            لا يوجد شيء محفوظ بعد
          </div>
        )}
        {items.map(item => (
          <div key={item.id} style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: isMobile ? '12px' : '14px 16px',
          }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{
                flex: 1,
                color: 'var(--text-2)',
                fontSize: isMobile ? '12px' : '13px',
                lineHeight: 1.6,
                wordBreak: 'break-all',
                direction: 'rtl',
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical' as const,
              }}>
                {item.content}
              </div>
              <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                <button
                  onClick={() => handleCopy(item.content, item.id)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: copied === item.id ? '#4ade80' : 'var(--text-muted)',
                    padding: isMobile ? '6px' : '4px', borderRadius: '4px',
                  }}
                >
                  <i className={`ti ${copied === item.id ? 'ti-check' : 'ti-copy'}`} style={{ fontSize: isMobile ? '17px' : '15px' }} />
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-muted)',
                    padding: isMobile ? '6px' : '4px', borderRadius: '4px',
                  }}
                >
                  <i className="ti ti-trash" style={{ fontSize: isMobile ? '17px' : '15px' }} />
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{timeAgo(item.created_at)}</span>
              {item.expires_at && (
                <span style={{ color: '#f59e0b', fontSize: '11px' }}>⏱ {expiryLabel(item.expires_at)}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}