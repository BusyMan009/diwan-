'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

interface Drop {
  id: string
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
}

interface Guest {
  id: string
  name: string
  pin: string
}

interface SharedFile {
  id: string
  files: {
    id: string
    name: string
    title: string | null
    size_bytes: number
    mime_type: string
  } | null
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

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getIcon(mime: string) {
  if (mime?.startsWith('image/')) return 'ti-photo'
  if (mime?.includes('pdf')) return 'ti-file-type-pdf'
  if (mime?.includes('word')) return 'ti-file-type-doc'
  if (mime?.includes('zip') || mime?.includes('rar')) return 'ti-file-zip'
  if (mime?.includes('video')) return 'ti-video'
  if (mime?.includes('audio')) return 'ti-music'
  return 'ti-file'
}

const EXPIRY_OPTIONS = [
  { label: 'لانهائي', value: null },
  { label: '30 دقيقة', value: 30 },
  { label: 'ساعة', value: 60 },
  { label: '6 ساعات', value: 360 },
  { label: 'يوم', value: 1440 },
  { label: '7 أيام', value: 10080 },
]

export default function DropPage() {
  const params = useParams()
  const pin = params.pin as string

  const [guest, setGuest] = useState<Guest | null>(null)
  const [drops, setDrops] = useState<Drop[]>([])
  const [sharedFiles, setSharedFiles] = useState<SharedFile[]>([])
  const [notFound, setNotFound] = useState(false)
  const [senderName, setSenderName] = useState('')
  const [nameSaved, setNameSaved] = useState(false)
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [expiry, setExpiry] = useState<number | null>(null)
  const [notifyTelegram, setNotifyTelegram] = useState(true)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [activeTab, setActiveTab] = useState<'send' | 'inbox' | 'files'>('send')
  const [sendTab, setSendTab] = useState<'text' | 'file'>('text')
  const [copied, setCopied] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(`drop_name_${pin}`)
    if (saved) { setSenderName(saved); setNameSaved(true) }
    fetchData()
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const channel = supabase
      .channel(`guest-drops-${pin}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'guest_drops',
      }, () => { fetchData() })
      .subscribe()

    const filesChannel = supabase
      .channel(`shared-files-${pin}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'shared_files',
      }, () => { fetchData() })
      .subscribe()

    return () => {
      window.removeEventListener('resize', check)
      supabase.removeChannel(channel)
      supabase.removeChannel(filesChannel)
    }
  }, [pin])

  async function fetchData() {
    const res = await fetch(`/api/guest-drop/${pin}`)
    if (!res.ok) { setNotFound(true); return }
    const data = await res.json()
    setGuest(data.guest)
    setDrops(data.drops || [])

    const sfRes = await fetch(`/api/shared-files?pin=${pin}`)
    const sfData = await sfRes.json()
    setSharedFiles(sfData || [])
  }

  function saveName() {
    if (!senderName.trim()) return
    localStorage.setItem(`drop_name_${pin}`, senderName)
    setNameSaved(true)
  }

  async function handleSendText() {
    if (!text.trim()) return
    setSending(true)
    await fetch('/api/guest-drop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pin,
        sender_name: senderName,
        content: text,
        direction: 'incoming',
        expiry,
        notify_telegram: notifyTelegram,
      }),
    })
    setText('')
    setExpiry(null)
    setSending(false)
    setSent(true)
    setTimeout(() => setSent(false), 3000)
    await fetchData()
  }

  async function handleSendFile() {
    if (!file) return
    setSending(true)
    const formData = new FormData()
    formData.append('pin', pin)
    formData.append('sender_name', senderName)
    formData.append('file', file)
    formData.append('direction', 'incoming')
    if (expiry) formData.append('expiry', String(expiry))
    formData.append('notify_telegram', String(notifyTelegram))
    await fetch('/api/guest-drop', { method: 'POST', body: formData })
    setFile(null)
    setExpiry(null)
    setSending(false)
    setSent(true)
    setTimeout(() => setSent(false), 3000)
    await fetchData()
  }

  const incomingDrops = drops.filter(d => d.direction === 'incoming')
  const outgoingDrops = drops.filter(d => d.direction === 'outgoing')
  const validSharedFiles = sharedFiles.filter(sf => sf.files)

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

  if (notFound) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ textAlign: 'center' }}>
        <i className="ti ti-ban" style={{ fontSize: '48px', color: 'var(--text-muted)', display: 'block', marginBottom: '16px' }} />
        <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>هذا الرابط غير صالح أو معطل</div>
      </div>
    </div>
  )

  if (!guest) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>جاري التحقق...</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', direction: 'rtl' }}>
      <div style={{ display: 'flex', minHeight: '100vh' }}>

        {/* Sidebar */}
        {!isMobile && (
          <aside style={{
            width: '220px',
            background: 'var(--bg)',
            borderLeft: '1px solid var(--border)',
            padding: '24px 12px',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
          }}>
            <div style={{ padding: '4px 12px', marginBottom: '24px' }}>
              <div style={{ fontFamily: 'var(--font-geist-mono)', color: 'var(--text-1)', fontSize: '15px', fontWeight: 400, letterSpacing: '-0.02em' }}>ديوان</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '2px' }}>{guest.name}</div>
            </div>

            <div style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '0 12px', margin: '16px 0 4px' }}>
              القائمة
            </div>

            {[
              { key: 'send', icon: 'ti-send', label: 'إرسال' },
              { key: 'inbox', icon: 'ti-inbox', label: `وصلني (${outgoingDrops.length})` },
              { key: 'files', icon: 'ti-folder', label: `الملفات (${validSharedFiles.length})` },
            ].map(item => (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key as any)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '7px 12px', borderRadius: 'var(--radius-md)',
                  color: activeTab === item.key ? 'var(--text-1)' : 'var(--text-muted)',
                  background: activeTab === item.key ? 'var(--bg-surface)' : 'transparent',
                  fontSize: '14px', fontWeight: activeTab === item.key ? 500 : 400,
                  border: 'none', cursor: 'pointer', width: '100%', textAlign: 'right',
                  borderRight: activeTab === item.key ? '2px solid var(--text-1)' : '2px solid transparent',
                  marginBottom: '1px', fontFamily: 'var(--font-geist)',
                  transition: 'color 0.15s, background 0.15s',
                }}
              >
                <i className={`ti ${item.icon}`} style={{ fontSize: '15px' }} />
                {item.label}
              </button>
            ))}

            <div style={{ flex: 1 }} />

            {nameSaved && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '11px', padding: '0 12px', marginBottom: '4px' }}>مسجل كـ</div>
                <div style={{ color: 'var(--text-1)', fontSize: '12px', padding: '0 12px', marginBottom: '8px' }}>{senderName}</div>
                <button
                  onClick={() => { setNameSaved(false); localStorage.removeItem(`drop_name_${pin}`) }}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 12px', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)', background: 'transparent', fontSize: '13px', border: 'none', cursor: 'pointer', width: '100%', fontFamily: 'var(--font-geist)' }}
                >
                  <i className="ti ti-logout" style={{ fontSize: '15px' }} />
                  تغيير الاسم
                </button>
              </div>
            )}
          </aside>
        )}

        {/* Main Content */}
        <main style={{ flex: 1, padding: isMobile ? '16px' : '36px 40px', overflowY: 'auto' }}>

          {/* Mobile Header */}
          {isMobile && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-geist-mono)', color: 'var(--text-1)', fontSize: '15px' }}>ديوان</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{guest.name}</div>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[
                  { key: 'send', icon: 'ti-send' },
                  { key: 'inbox', icon: 'ti-inbox' },
                  { key: 'files', icon: 'ti-folder' },
                ].map(item => (
                  <button
                    key={item.key}
                    onClick={() => setActiveTab(item.key as any)}
                    style={{
                      background: activeTab === item.key ? 'var(--bg-surface)' : 'transparent',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '6px 10px',
                      color: activeTab === item.key ? 'var(--text-1)' : 'var(--text-muted)',
                      cursor: 'pointer',
                    }}
                  >
                    <i className={`ti ${item.icon}`} style={{ fontSize: '15px' }} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Name Input */}
          {!nameSaved && (
            <div style={{ maxWidth: '400px' }}>
              <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontFamily: 'var(--font-geist-mono)', fontSize: '24px', fontWeight: 400, letterSpacing: '-0.02em', color: 'var(--text-1)', marginBottom: '4px' }}>
                  مرحباً
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>أدخل اسمك للمتابعة</p>
              </div>
              <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '24px' }}>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ color: 'var(--text-2)', fontSize: '12px', fontWeight: 500, display: 'block', marginBottom: '6px' }}>اسمك</label>
                  <input
                    value={senderName}
                    onChange={e => setSenderName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && saveName()}
                    placeholder="اكتب اسمك..."
                    autoFocus
                    style={inputStyle}
                  />
                </div>
                <button
                  onClick={saveName}
                  disabled={!senderName.trim()}
                  style={{
                    width: '100%', background: 'var(--text-1)', color: 'var(--bg)',
                    border: 'none', borderRadius: 'var(--radius-md)', padding: '10px',
                    fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                    fontFamily: 'var(--font-geist)', opacity: !senderName.trim() ? 0.4 : 1,
                  }}
                >
                  متابعة
                </button>
              </div>
            </div>
          )}

          {/* Send Tab */}
          {nameSaved && activeTab === 'send' && (
            <div style={{ maxWidth: '680px' }}>
              <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontFamily: 'var(--font-geist-mono)', fontSize: '24px', fontWeight: 400, letterSpacing: '-0.02em', color: 'var(--text-1)', marginBottom: '4px' }}>إرسال</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>أرسل نص أو ملف</p>
              </div>

              <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '24px', marginBottom: '24px' }}>

                {/* Send Type Tabs */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                  {[{ key: 'text', label: 'نص' }, { key: 'file', label: 'ملف' }].map(t => (
                    <button
                      key={t.key}
                      onClick={() => setSendTab(t.key as any)}
                      style={{
                        padding: '6px 16px', borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border)',
                        background: sendTab === t.key ? 'var(--text-1)' : 'var(--bg)',
                        color: sendTab === t.key ? 'var(--bg)' : 'var(--text-muted)',
                        fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--font-geist)',
                        fontWeight: sendTab === t.key ? 500 : 400,
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {sendTab === 'text' && (
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ color: 'var(--text-2)', fontSize: '12px', fontWeight: 500, display: 'block', marginBottom: '6px' }}>الرسالة</label>
                    <textarea
                      value={text}
                      onChange={e => setText(e.target.value)}
                      placeholder="اكتب رسالتك..."
                      rows={4}
                      style={{ ...inputStyle, resize: 'none' }}
                    />
                  </div>
                )}

                {sendTab === 'file' && (
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ color: 'var(--text-2)', fontSize: '12px', fontWeight: 500, display: 'block', marginBottom: '6px' }}>الملف</label>
                    <label style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)',
                      padding: '20px', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '13px',
                    }}>
                      <i className="ti ti-cloud-upload" style={{ fontSize: '20px' }} />
                      {file ? file.name : 'اضغط لاختيار ملف'}
                      <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} style={{ display: 'none' }} />
                    </label>
                  </div>
                )}

                {/* Expiry */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ color: 'var(--text-2)', fontSize: '12px', fontWeight: 500, display: 'block', marginBottom: '6px' }}>احذفه تلقائياً بعد</label>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {EXPIRY_OPTIONS.map(opt => (
                      <button
                        key={String(opt.value)}
                        onClick={() => setExpiry(opt.value)}
                        style={{
                          padding: '4px 10px', borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border)',
                          background: expiry === opt.value ? 'var(--text-1)' : 'var(--bg)',
                          color: expiry === opt.value ? 'var(--bg)' : 'var(--text-muted)',
                          fontSize: '11px', cursor: 'pointer', fontFamily: 'var(--font-geist)',
                          transition: 'all 0.15s',
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Telegram Notify Toggle */}
                <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-2)', fontSize: '12px' }}>إشعار Telegram عند الإرسال</span>
                  <button
                    onClick={() => setNotifyTelegram(!notifyTelegram)}
                    style={{
                      width: '36px', height: '20px', borderRadius: '9999px',
                      background: notifyTelegram ? 'var(--text-1)' : 'var(--border)',
                      border: 'none', cursor: 'pointer', position: 'relative',
                      transition: 'background 0.2s',
                    }}
                  >
                    <div style={{
                      position: 'absolute', top: '2px',
                      right: notifyTelegram ? '2px' : '18px',
                      width: '16px', height: '16px', borderRadius: '50%',
                      background: notifyTelegram ? 'var(--bg)' : 'var(--text-muted)',
                      transition: 'right 0.2s',
                    }} />
                  </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={sendTab === 'text' ? handleSendText : handleSendFile}
                    disabled={sending || (sendTab === 'text' ? !text.trim() : !file)}
                    style={{
                      background: sent ? '#166534' : 'var(--text-1)',
                      color: sent ? '#4ade80' : 'var(--bg)',
                      border: 'none', borderRadius: 'var(--radius-md)', padding: '8px 20px',
                      fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                      fontFamily: 'var(--font-geist)',
                      opacity: sending || (sendTab === 'text' ? !text.trim() : !file) ? 0.4 : 1,
                      transition: 'all 0.3s',
                    }}
                  >
                    {sent ? 'تم الإرسال' : sending ? 'جاري الإرسال...' : 'إرسال'}
                  </button>
                </div>
              </div>

              {/* My Sends */}
              {incomingDrops.length > 0 && (
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '10px' }}>
                    أرسلته أنت
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {incomingDrops.map(drop => (
                      <DropCard key={drop.id} drop={drop} onCopy={id => { setCopied(id); setTimeout(() => setCopied(null), 2000) }} copied={copied} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Inbox Tab */}
          {nameSaved && activeTab === 'inbox' && (
            <div style={{ maxWidth: '680px' }}>
              <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontFamily: 'var(--font-geist-mono)', fontSize: '24px', fontWeight: 400, letterSpacing: '-0.02em', color: 'var(--text-1)', marginBottom: '4px' }}>وصلني</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>الرسائل والملفات الواردة إليك</p>
              </div>

              {outgoingDrops.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)', fontSize: '13px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                  لا يوجد شيء بعد
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {outgoingDrops.map(drop => (
                    <DropCard key={drop.id} drop={drop} onCopy={id => { setCopied(id); setTimeout(() => setCopied(null), 2000) }} copied={copied} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Files Tab */}
          {nameSaved && activeTab === 'files' && (
            <div style={{ maxWidth: '680px' }}>
              <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontFamily: 'var(--font-geist-mono)', fontSize: '24px', fontWeight: 400, letterSpacing: '-0.02em', color: 'var(--text-1)', marginBottom: '4px' }}>الملفات</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>الملفات المشاركة معك</p>
              </div>

              {validSharedFiles.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)', fontSize: '13px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                  لا توجد ملفات مشاركة
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {validSharedFiles.map(sf => (
                    <div key={sf.id} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <i className={`ti ${getIcon(sf.files!.mime_type)}`} style={{ fontSize: '20px', color: 'var(--text-muted)', flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ color: 'var(--text-1)', fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {sf.files!.title || sf.files!.name}
                          </div>
                          {sf.files!.size_bytes && (
                            <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px' }}>
                              {formatSize(sf.files!.size_bytes)}
                            </div>
                          )}
                        </div>
                        <a
                          href={`/api/files/download-guest/${sf.files!.id}`}
                          download={sf.files!.name}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '6px', borderRadius: '4px', display: 'flex', textDecoration: 'none' }}
                        >
                          <i className="ti ti-download" style={{ fontSize: '15px' }} />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </main>
      </div>
    </div>
  )
}

function DropCard({ drop, onCopy, copied }: { drop: Drop; onCopy: (id: string) => void; copied: string | null }) {
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

  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '14px 16px' }}>
      {drop.type === 'text' && (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
          <div style={{
            flex: 1, color: 'var(--text-2)', fontSize: '13px', direction: 'rtl', lineHeight: 1.6,
            overflow: 'hidden', display: '-webkit-box',
            WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as const,
          }}>
            {drop.content}
          </div>
          <button
            onClick={() => { navigator.clipboard.writeText(drop.content || ''); onCopy(drop.id) }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied === drop.id ? '#4ade80' : 'var(--text-muted)', padding: '4px', flexShrink: 0 }}
          >
            <i className={`ti ${copied === drop.id ? 'ti-check' : 'ti-copy'}`} style={{ fontSize: '15px' }} />
          </button>
        </div>
      )}
      {drop.type === 'file' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <i className="ti ti-file" style={{ color: 'var(--text-muted)', fontSize: '18px', flexShrink: 0 }} />
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
      <div style={{ display: 'flex', gap: '10px', marginTop: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{timeAgo(drop.created_at)}</span>
        {drop.expires_at && (
          <span style={{ color: '#f59e0b', fontSize: '11px' }}>
            {(() => {
              const diff = new Date(drop.expires_at).getTime() - Date.now()
              if (diff <= 0) return 'منتهي'
              const m = Math.floor(diff / 60000)
              const h = Math.floor(diff / 3600000)
              const d = Math.floor(diff / 86400000)
              if (m < 60) return `ينتهي بعد ${m} دقيقة`
              if (h < 24) return `ينتهي بعد ${h} ساعة`
              return `ينتهي بعد ${d} يوم`
            })()}
          </span>
        )}
      </div>
    </div>
  )
}