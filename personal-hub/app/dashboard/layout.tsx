'use client'

import { useEffect } from 'react'
import Sidebar from '../components/Sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    const isTemp = sessionStorage.getItem('diwan_temp_session')
    if (isTemp) {
      // لما يغلق التاب أو المتصفح نعمل logout
      const handleUnload = () => {
        fetch('/api/auth/logout', { method: 'POST', keepalive: true })
        sessionStorage.removeItem('diwan_temp_session')
      }
      window.addEventListener('beforeunload', handleUnload)
      return () => window.removeEventListener('beforeunload', handleUnload)
    }
  }, [])

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: 'var(--bg)',
      direction: 'rtl',
    }}>
      <Sidebar />
      <main style={{
        flex: 1,
        padding: '40px 48px',
        overflowY: 'auto',
      }}
      className="main-content"
      >
        {children}
      </main>
      <style>{`
        @media (max-width: 768px) {
          .main-content {
            padding: 80px 16px 24px !important;
            width: 100%;
          }
        }
      `}</style>
    </div>
  )
}