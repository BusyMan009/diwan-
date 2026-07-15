'use client'

import { useState, useEffect } from 'react'

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch('/api/api-key')
      .then(r => r.json())
      .then(d => {
        setApiKey(d?.key || null)
        setLoading(false)
      })
  }, [])

  async function handleGenerate() {
    setGenerating(true)
    const res = await fetch('/api/api-key', { method: 'POST' })
    const data = await res.json()
    setApiKey(data.key)
    setGenerating(false)
  }

  async function handleCopy() {
    if (!apiKey) return
    await navigator.clipboard.writeText(apiKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ maxWidth: '600px', width: '100%' }}>
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{
          fontFamily: 'var(--font-geist-mono)',
          fontSize: '24px',
          fontWeight: 400,
          letterSpacing: '-0.02em',
          color: 'var(--text-1)',
        }}>
          الإعدادات
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
          إدارة الوصول والأدوات
        </p>
      </div>

      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '24px',
      }}>
        <div style={{ marginBottom: '16px' }}>
          <h2 style={{ color: 'var(--text-1)', fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
            API Key
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
            استخدمه في برنامج ديوان على Windows للرفع المباشر بدون تسجيل دخول
          </p>
        </div>

        {loading ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>جاري التحميل...</div>
        ) : apiKey ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '10px 14px',
            }}>
              <code style={{
                flex: 1,
                fontSize: '12px',
                color: 'var(--text-2)',
                fontFamily: 'var(--font-geist-mono)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {apiKey}
              </code>
              <button
                onClick={handleCopy}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: copied ? '#4ade80' : 'var(--text-muted)',
                  padding: '4px', flexShrink: 0,
                }}
              >
                <i className={`ti ${copied ? 'ti-check' : 'ti-copy'}`} style={{ fontSize: '15px' }} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleGenerate}
                disabled={generating}
                style={{
                  background: 'transparent',
                  color: 'var(--text-2)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '6px 14px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  opacity: generating ? 0.4 : 1,
                  fontFamily: 'var(--font-geist)',
                }}
              >
                تجديد الـ Key
              </button>
            </div>

            <div style={{
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '12px 14px',
            }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '8px' }}>
                حط هذا في ملف <code style={{ fontFamily: 'var(--font-geist-mono)' }}>config.json</code> في مجلد البرنامج:
              </p>
              <code style={{
                display: 'block',
                fontSize: '11px',
                color: 'var(--text-2)',
                fontFamily: 'var(--font-geist-mono)',
                whiteSpace: 'pre',
              }}>
{`{
  "api_key": "${apiKey}"
}`}
              </code>
            </div>
          </div>
        ) : (
          <button
            onClick={handleGenerate}
            disabled={generating}
            style={{
              background: 'var(--text-1)',
              color: 'var(--bg)',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 20px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              opacity: generating ? 0.4 : 1,
              fontFamily: 'var(--font-geist)',
            }}
          >
            {generating ? 'جاري التوليد...' : 'توليد API Key'}
          </button>
        )}
      </div>
    </div>
  )
}