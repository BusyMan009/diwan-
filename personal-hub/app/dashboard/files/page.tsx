'use client'

import { createBrowserClient } from '@supabase/ssr'
import { useState, useEffect, useRef, useCallback } from 'react'
interface FileItem {
  id: string
  name: string
  title: string | null
  note: string | null
  url: string
  size_bytes: number
  mime_type: string
  created_at: string
  expires_at: string | null
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('ar-SA', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function getIcon(mime: string) {
  if (mime.startsWith('image/')) return 'ti-photo'
  if (mime.includes('pdf')) return 'ti-file-type-pdf'
  if (mime.includes('word')) return 'ti-file-type-doc'
  if (mime.includes('zip') || mime.includes('rar')) return 'ti-file-zip'
  if (mime.includes('video')) return 'ti-video'
  if (mime.includes('audio')) return 'ti-music'
  if (mime.includes('text') || mime.includes('code')) return 'ti-file-code'
  return 'ti-file'
}

export default function FilesPage() {
  const [files, setFiles] = useState<FileItem[]>([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [showMeta, setShowMeta] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [expiry, setExpiry] = useState('never')
  const [guests, setGuests] = useState<{ id: string; name: string }[]>([])
 const [shareModal, setShareModal] = useState<string | null>(null)
const [sharedFiles, setSharedFiles] = useState<{ file_id: string; guest_id: string }[]>([])
const inputRef = useRef<HTMLInputElement>(null)

const fetchFiles = useCallback(async () => {
  const res = await fetch('/api/files')
  const data = await res.json()
  setFiles(data)
}, [])

useEffect(() => {
  fetchFiles()
  fetch('/api/guests').then(r => r.json()).then(d => setGuests(d || []))
  fetch('/api/shared-files').then(r => r.json()).then(d => setSharedFiles(d || []))

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const channel = supabase
    .channel('files-realtime')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'files',
    }, () => {
      fetchFiles()
    })
    .subscribe()

return () => { supabase.removeChannel(channel) }
}, [fetchFiles])

async function toggleShare(fileId: string, guestId: string) {
  const res = await fetch('/api/shared-files', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      file_id: fileId,
      guest_id: guestId,
    }),
  })

  if (!res.ok) {
    console.log(await res.text())
    alert('فشل النشر')
    return
  }

  const data = await res.json()
  console.log(data)

const updated = await fetch('/api/shared-files').then(r => r.json())
setSharedFiles(updated || [])
}

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPendingFile(file)
    setTitle('')
    setNote('')
    setExpiry('never')
    setShowMeta(true)
  }

  function handleCancel() {
    setShowMeta(false)
    setPendingFile(null)
    setTitle('')
    setNote('')
    setExpiry('never')
    if (inputRef.current) inputRef.current.value = ''
  }

  async function handleUpload() {
    if (!pendingFile) return
    setShowMeta(false)
    setUploading(true)
    setProgress(0)

    const formData = new FormData()
    formData.append('file', pendingFile)
    if (title) formData.append('title', title)
    if (note) formData.append('note', note)
    if (expiry !== 'never') formData.append('expiry', expiry)

    const interval = setInterval(() => {
      setProgress(p => Math.min(p + 8, 90))
    }, 300)

    await fetch('/api/files', { method: 'POST', body: formData })

    clearInterval(interval)
    setProgress(100)
    setTimeout(() => { setUploading(false); setProgress(0) }, 500)
    setPendingFile(null)
    if (inputRef.current) inputRef.current.value = ''
    await fetchFiles()
  }

  async function handleDelete(id: string) {
    await fetch(`/api/files/${id}`, { method: 'DELETE' })
    await fetchFiles()
  }

  return (
    <div style={{ maxWidth: '800px' }}>

      {/* Header */}
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{
          fontFamily: 'var(--font-geist-mono)',
          fontSize: '24px',
          fontWeight: 400,
          letterSpacing: '-0.02em',
          color: 'var(--text-1)',
        }}>
          الملفات
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
          ارفع وشارك أي نوع من الملفات
        </p>
      </div>

      {/* Upload Area */}
      {!showMeta && (
        <div
          onClick={() => inputRef.current?.click()}
          style={{
            border: '1px dashed var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '48px',
            textAlign: 'center',
            cursor: 'pointer',
            marginBottom: '24px',
            transition: 'border-color 0.2s, background 0.2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'var(--text-muted)'
            e.currentTarget.style.background = 'var(--bg-surface)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'var(--border)'
            e.currentTarget.style.background = 'transparent'
          }}
        >
          <i className="ti ti-cloud-upload" style={{ fontSize: '32px', color: 'var(--text-muted)', display: 'block', marginBottom: '12px' }} />
          <div style={{ color: 'var(--text-2)', fontSize: '14px', marginBottom: '4px' }}>اضغط لرفع ملف</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>يدعم جميع أنواع الملفات</div>
          <input ref={inputRef} type="file" onChange={handleFileSelect} style={{ display: 'none' }} />
        </div>
      )}

      {/* Meta Form */}
      {showMeta && pendingFile && (
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-card)',
          borderRadius: 'var(--radius-md)',
          padding: '24px',
          marginBottom: '24px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid var(--border)' }}>
            <i className={`ti ${getIcon(pendingFile.type)}`} style={{ fontSize: '24px', color: 'var(--text-muted)' }} />
            <div>
              <div style={{ color: 'var(--text-1)', fontSize: '13px', fontWeight: 500 }}>{pendingFile.name}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px' }}>{formatSize(pendingFile.size)}</div>
            </div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ color: 'var(--text-2)', fontSize: '12px', fontWeight: 500, display: 'block', marginBottom: '6px' }}>العنوان (اختياري)</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="مثل: تقرير مارس، صورة العرس..."
              style={{
                width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)', padding: '8px 12px', color: 'var(--text-1)',
                fontFamily: 'var(--font-geist)', fontSize: '13px', outline: 'none', direction: 'rtl',
              }}
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ color: 'var(--text-2)', fontSize: '12px', fontWeight: 500, display: 'block', marginBottom: '6px' }}>ملاحظة (اختياري)</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="وصف قصير أو ملاحظة..."
              rows={3}
              style={{
                width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)', padding: '8px 12px', color: 'var(--text-1)',
                fontFamily: 'var(--font-geist)', fontSize: '13px', outline: 'none', resize: 'none', direction: 'rtl',
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ color: 'var(--text-2)', fontSize: '12px', fontWeight: 500, display: 'block', marginBottom: '6px' }}>احذفه تلقائياً بعد</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[
                { label: 'لانهائي', value: 'never' },
                { label: '30 دقيقة', value: '30m' },
                { label: 'ساعة', value: '1h' },
                { label: '24 ساعة', value: '24h' },
                { label: '7 أيام', value: '7d' },
                { label: '30 يوم', value: '30d' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setExpiry(opt.value)}
                  style={{
                    padding: '5px 12px', borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    background: expiry === opt.value ? 'var(--text-1)' : 'var(--bg)',
                    color: expiry === opt.value ? 'var(--bg)' : 'var(--text-muted)',
                    fontSize: '12px', cursor: 'pointer', fontFamily: 'var(--font-geist)', transition: 'all 0.15s',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button onClick={handleCancel} style={{ background: 'transparent', color: 'var(--text-2)', border: '1px solid var(--border)', padding: '7px 14px', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-geist)' }}>إلغاء</button>
            <button onClick={handleUpload} style={{ background: 'var(--text-1)', color: 'var(--bg)', border: 'none', padding: '7px 14px', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-geist)' }}>رفع</button>
          </div>
        </div>
      )}

      {/* Progress */}
      {uploading && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ color: 'var(--text-2)', fontSize: '13px' }}>جاري الرفع...</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{progress}%</span>
          </div>
          <div style={{ background: 'var(--border)', borderRadius: '9999px', height: '3px' }}>
            <div style={{ background: 'var(--text-1)', height: '3px', borderRadius: '9999px', width: `${progress}%`, transition: 'width 0.3s' }} />
          </div>
        </div>
      )}

      {/* Files List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {files.length === 0 && !uploading && (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)', fontSize: '13px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
            لا توجد ملفات بعد
          </div>
        )}
        {files.map(file => (
          <div key={file.id} style={{
            background: 'var(--bg-surface)', border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-card)', borderRadius: 'var(--radius-md)', padding: '14px 16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <i className={`ti ${getIcon(file.mime_type)}`} style={{ fontSize: '20px', color: 'var(--text-muted)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: 'var(--text-1)', fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {file.title || file.name}
                </div>
                {file.title && (
                  <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {file.name}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '12px', marginTop: '3px', flexWrap: 'wrap' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{formatSize(file.size_bytes)}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{formatDate(file.created_at)}</span>
                  {file.expires_at && (
                    <span style={{ color: '#f59e0b', fontSize: '11px' }}>ينتهي {formatDate(file.expires_at)}</span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                {guests.length > 0 && (
                  <button
                    onClick={() => setShareModal(shareModal === file.id ? null : file.id)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: sharedFiles.some(s => s.file_id === file.id) ? '#4ade80' : 'var(--text-muted)',
                      padding: '6px', borderRadius: '4px', display: 'flex',
                    }}
                  >
                    <i className="ti ti-share" style={{ fontSize: '15px' }} />
                  </button>
                )}
                <a href={`/api/files/download/${file.id}`} download={file.name} style={{
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '6px', borderRadius: '4px', display: 'flex'
                }}>
                  <i className="ti ti-download" style={{ fontSize: '15px' }} />
                </a>
                <button onClick={() => handleDelete(file.id)} style={{
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '6px', borderRadius: '4px'
                }}>
                  <i className="ti ti-trash" style={{ fontSize: '15px' }} />
                </button>
              </div>
            </div>

            {/* Share Modal */}
            {shareModal === file.id && (
              <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '8px' }}>شارك مع:</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {guests.map(guest => {
                    const isShared = sharedFiles.some(s => s.file_id === file.id && s.guest_id === guest.id)
                    return (
                      <div key={guest.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-2)', fontSize: '12px' }}>{guest.name}</span>
                        <button
                          onClick={() => toggleShare(file.id, guest.id)}
                          style={{
                            background: isShared ? '#1a3a1a' : 'var(--bg)',
                            color: isShared ? '#4ade80' : 'var(--text-muted)',
                            border: '1px solid var(--border)',
                            borderRadius: '6px', padding: '3px 10px',
                            fontSize: '11px', cursor: 'pointer',
                          }}
                        >
                          {isShared ? 'منشور' : 'نشر'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {file.note && (
              <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '12px', direction: 'rtl' }}>
                {file.note}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}