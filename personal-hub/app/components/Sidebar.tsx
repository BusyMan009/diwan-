'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const navItems = [
  { href: '/dashboard', icon: 'ti-layout-dashboard', label: 'الرئيسية' },
  { href: '/dashboard/files', icon: 'ti-folder', label: 'الملفات' },
  { href: '/dashboard/clipboard', icon: 'ti-clipboard', label: 'الحافظة' },
  { href: '/dashboard/notes', icon: 'ti-notes', label: 'الملاحظات' },
  { href: '/dashboard/links', icon: 'ti-link', label: 'الروابط' },
  { href: '/dashboard/reminders', icon: 'ti-bell', label: 'الريمايندرات' },
]

const toolItems = [
  { href: '/dashboard/tools', icon: 'ti-tools', label: 'الأدوات' },
  { href: '/dashboard/guest-drop', icon: 'ti-upload', label: 'Guest Drop' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Mobile Top Bar */}
      <div style={{
        display: 'none',
        position: 'fixed',
        top: 0, left: 0, right: 0,
        height: '56px',
        background: 'var(--bg)',
        borderBottom: '1px solid var(--border)',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        zIndex: 100,
      }} className="mobile-topbar">
        <span style={{ fontFamily: 'var(--font-geist-mono)', fontSize: '15px', color: 'var(--text-1)' }}>
          ديوان
        </span>
        <button
          onClick={() => setOpen(!open)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-1)', fontSize: '20px' }}
        >
          <i className={`ti ${open ? 'ti-x' : 'ti-menu-2'}`} />
        </button>
      </div>

      {/* Mobile Overlay */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            display: 'none',
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 150,
          }}
          className="mobile-overlay"
        />
      )}

      {/* Sidebar */}
      <aside
        className="sidebar"
        style={{
          width: '220px',
          minHeight: '100vh',
          background: 'var(--bg)',
          borderLeft: '1px solid var(--border)',
          padding: '24px 12px',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
        }}
      >
        <div style={{ padding: '4px 12px', marginBottom: '24px' }}>
          <div style={{
            fontFamily: 'var(--font-geist-mono)',
            color: 'var(--text-1)',
            fontSize: '15px',
            fontWeight: 400,
            letterSpacing: '-0.02em',
          }}>
            ديوان
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '2px' }}>
            مكانك الخاص
          </div>
        </div>

        <NavSection label="القائمة" />
        {navItems.map(item => (
          <NavItem key={item.href} {...item} active={pathname === item.href} onClick={() => setOpen(false)} />
        ))}

        <NavSection label="الأدوات" />
        {toolItems.map(item => (
          <NavItem key={item.href} {...item} active={pathname === item.href} onClick={() => setOpen(false)} />
        ))}

        <div style={{ flex: 1 }} />

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
          <NavItem href="/dashboard/settings" icon="ti-settings" label="الإعدادات" active={pathname === '/dashboard/settings'} onClick={() => setOpen(false)} />
        </div>
      </aside>

      <style>{`
        @media (max-width: 768px) {
          .mobile-topbar { display: flex !important; }
          .mobile-overlay { display: block !important; }
          .sidebar {
            position: fixed !important;
            top: 0; right: 0;
            height: 100vh;
            z-index: 200;
            transform: ${open ? 'translateX(0)' : 'translateX(100%)'};
            transition: transform 0.25s ease;
            padding-top: 72px !important;
          }
        }
      `}</style>
    </>
  )
}

function NavSection({ label }: { label: string }) {
  return (
    <div style={{
      color: 'var(--text-muted)',
      fontSize: '11px',
      fontWeight: 500,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      padding: '0 12px',
      margin: '16px 0 4px',
    }}>
      {label}
    </div>
  )
}

function NavItem({ href, icon, label, active, onClick }: {
  href: string; icon: string; label: string; active: boolean; onClick: () => void
}) {
  return (
    <Link href={href} onClick={onClick} style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '7px 12px',
      borderRadius: 'var(--radius-md)',
      color: active ? 'var(--text-1)' : 'var(--text-3)',
      background: active ? 'var(--bg-surface)' : 'transparent',
      fontSize: '14px',
      fontWeight: active ? 500 : 400,
      transition: 'color 0.15s, background 0.15s',
      marginBottom: '1px',
      borderLeft: active ? '2px solid var(--text-1)' : '2px solid transparent',
    }}>
      <i className={`ti ${icon}`} style={{ fontSize: '15px' }} />
      {label}
    </Link>
  )
}