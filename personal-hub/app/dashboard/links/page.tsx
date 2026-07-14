'use client'

import { useState, useEffect } from 'react'

interface LinkItem {
  id: string
  url: string
  title: string | null
  description: string | null
  favicon: string | null
  og_image: string | null
  created_at: string
}

function getDomain(url: string) {
  try {
    return new URL(url).hostname.replace('www.', '')
  } catch {
    return url
  }
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

export default function LinksPage() {
  const [links, setLinks] = useState<LinkItem[]>([])
  const [url, setUrl] = useState('')
  const [adding, setAdding] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    fetchLinks()
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  async function fetchLinks() {
    const res = await fetch('/api/links')
    const data = await res.json()
    setLinks(data)
  }

  async function handleAdd() {
    if (!url.trim()) return
    setAdding(true)
    let fullUrl = url.trim()
    if (!fullUrl.startsWith('http')) fullUrl = 'https://' + fullUrl
    await fetch('/api/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: fullUrl }),
    })
    setUrl('')
    setAdding(false)
    await fetchLinks()
  }

  async function handleDelete(id: string) {
    await fetch(`/api/links/${id}`, { method: 'DELETE' })
    await fetchLinks()
  }

  return (
    <div style={{ maxWidth: '800px', width: '100%' }}>

      {/* Header */}
      <div style={{ marginBottom: isMobile ? '24px' : '40px' }}>
        <h1 style={{ fontFamily: 'var(--font-geist-mono)', fontSize: isMobile ? '20px' : '24px', fontWeight: 400, letterSpacing: '-0.02em', color: 'var(--text-1)' }}>
          الروابط
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
          احفظ روابطك المفضلة
        </p>
      </div>

      {/* Input */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '14px 16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="الصق رابطاً هنا..."
            style={{
              flex: 1, background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)', padding: '8px 12px',
              color: 'var(--text-1)', fontFamily: 'var(--font-geist)',
              fontSize: '13px', outline: 'none', direction: 'ltr',
            }}
          />
          <button
            onClick={handleAdd}
            disabled={adding || !url.trim()}
            style={{
              background: 'var(--text-1)', color: 'var(--bg)', border: 'none',
              borderRadius: 'var(--radius-md)', padding: '8px 14px',
              fontSize: '13px', fontWeight: 500, cursor: 'pointer',
              fontFamily: 'var(--font-geist)',
              opacity: adding || !url.trim() ? 0.4 : 1,
              whiteSpace: 'nowrap',
            }}
          >
            {adding ? '...' : 'إضافة'}
          </button>
        </div>
      </div>

      {/* Links List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {links.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)', fontSize: '13px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
            لا توجد روابط بعد
          </div>
        )}
        {links.map(link => (
          <div key={link.id} style={{
            background: 'var(--bg-surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)', padding: '12px 14px',
            display: 'flex', alignItems: 'center', gap: '10px',
          }}>
            {/* Favicon */}
            <div style={{ flexShrink: 0, width: '28px', height: '28px', borderRadius: '6px', background: 'var(--bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {link.favicon ? (
                <img
                  src={link.favicon}
                  alt=""
                  width={16}
                  height={16}
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              ) : (
                <i className="ti ti-link" style={{ fontSize: '13px', color: 'var(--text-muted)' }} />
              )}
            </div>

            {/* Info */}
            <a

              href={link.url}
              target="_blank"
              rel="noreferrer"
              style={{ flex: 1, minWidth: 0, textDecoration: 'none' }}
            >
              <div style={{ color: 'var(--text-1)', fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {link.title || getDomain(link.url)}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '1px' }}>
                {getDomain(link.url)} · {timeAgo(link.created_at)}
              </div>
            </a>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                <a
                href={link.url}
                target="_blank"
                rel="noreferrer"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', borderRadius: '4px', display: 'flex', textDecoration: 'none' }}
              >
                <i className="ti ti-external-link" style={{ fontSize: '14px' }} />
              </a>
              <button
                onClick={() => handleDelete(link.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', borderRadius: '4px' }}
              >
                <i className="ti ti-trash" style={{ fontSize: '14px' }} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}