'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    })

    const data = await res.json()

    if (data.success) {
      if (data.type === 'temporary') {
        // PIN مؤقت — نحفظ في sessionStorage عشان نعرف نعمل logout
        sessionStorage.setItem('diwan_temp_session', '1')
      }
      router.push('/dashboard')
    } else {
      setError('الرقم السري غلط')
      setLoading(false)
    }
  }

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
    }}>
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-card)',
        borderRadius: 'var(--radius-md)',
        padding: '40px',
        width: '100%',
        maxWidth: '360px',
      }}>
        <h1 style={{
          fontFamily: 'var(--font-geist-mono)',
          color: 'var(--text-1)',
          fontSize: '20px',
          fontWeight: 400,
          letterSpacing: '-0.02em',
          textAlign: 'center',
          marginBottom: '8px',
        }}>
          ديوان
        </h1>
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: '13px', marginBottom: '32px' }}>
          مكانك الخاص
        </p>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input
            type="password"
            placeholder="الرقم السري"
            value={pin}
            onChange={e => setPin(e.target.value)}
            style={{
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              color: 'var(--text-1)',
              fontFamily: 'var(--font-geist)',
              fontSize: '14px',
              outline: 'none',
              textAlign: 'center',
              letterSpacing: '0.2em',
              width: '100%',
            }}
            maxLength={10}
            autoFocus
          />

          {error && (
            <p style={{ color: '#ff4444', textAlign: 'center', fontSize: '13px' }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || pin.length === 0}
            style={{
              background: 'var(--text-1)',
              color: 'var(--bg)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              padding: '10px',
              fontFamily: 'var(--font-geist)',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              opacity: loading || pin.length === 0 ? 0.4 : 1,
              transition: 'opacity 0.2s',
            }}
          >
            {loading ? '...' : 'دخول'}
          </button>
        </form>
      </div>
    </main>
  )
}