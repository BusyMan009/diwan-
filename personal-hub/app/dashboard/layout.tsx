import Sidebar from '../components/Sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
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