'use client'

import { useState, useEffect } from 'react'

interface Reminder {
  id: string
  title: string
  description: string | null
  event_date: string
  notify_before: number[]
  created_at: string
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('ar-SA', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function getDaysLeft(date: string) {
  const diff = new Date(date).getTime() - Date.now()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  if (days < 0) return 'انتهى'
  if (days === 0) return 'اليوم!'
  if (days === 1) return 'غداً!'
  return `بعد ${days} يوم`
}

function formatNotify(minutes: number) {
  const d = Math.floor(minutes / (24 * 60))
  const h = Math.floor((minutes % (24 * 60)) / 60)
  const m = minutes % 60
  return [d > 0 && `${d} يوم`, h > 0 && `${h} ساعة`, m > 0 && `${m} دقيقة`].filter(Boolean).join(' و')
}

const QUICK_NOTIFY = [
  { label: '5 أيام', value: 5 * 24 * 60 },
  { label: '3 أيام', value: 3 * 24 * 60 },
  { label: 'يوم', value: 24 * 60 },
  { label: '3 ساعات', value: 3 * 60 },
  { label: 'ساعة', value: 60 },
  { label: '30 دقيقة', value: 30 },
]

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [notifyList, setNotifyList] = useState<number[]>([24 * 60])
  const [customDays, setCustomDays] = useState(0)
  const [customHours, setCustomHours] = useState(0)
  const [customMinutes, setCustomMinutes] = useState(0)
  const [image, setImage] = useState<File | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchReminders() }, [])

  async function fetchReminders() {
    const res = await fetch('/api/reminders')
    const data = await res.json()
    setReminders(data)
  }

  function toggleNotify(value: number) {
    setNotifyList(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    )
  }

  function addCustomNotify() {
    const total = (customDays * 24 * 60) + (customHours * 60) + customMinutes
    if (total > 0 && !notifyList.includes(total)) {
      setNotifyList(prev => [...prev, total])
    }
    setCustomDays(0)
    setCustomHours(0)
    setCustomMinutes(0)
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImage(file)
    setAnalyzing(true)

    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1]
      const res = await fetch('/api/reminders/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, mimeType: file.type }),
      })
      const data = await res.json()
      if (data.title) setTitle(data.title)
      if (data.date) setEventDate(data.date)
      if (data.description) setDescription(data.description)
      setAnalyzing(false)
    }
    reader.readAsDataURL(file)
  }

  async function handleSave() {
    if (!title || !eventDate) return
    setSaving(true)

    await fetch('/api/reminders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, eventDate, notifyBefore: notifyList }),
    })

    setSaving(false)
    setShowForm(false)
    setTitle('')
    setDescription('')
    setEventDate('')
    setNotifyList([24 * 60])
    setImage(null)
    await fetchReminders()
  }

  async function handleDelete(id: string) {
    await fetch(`/api/reminders/${id}`, { method: 'DELETE' })
    await fetchReminders()
  }

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

  const numStyle = {
    width: '60px',
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '6px',
    color: 'var(--text-1)',
    fontSize: '13px',
    textAlign: 'center' as const,
    outline: 'none',
    fontFamily: 'var(--font-geist)',
  }

  return (
    <div style={{ maxWidth: '800px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '40px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-geist-mono)', fontSize: '24px', fontWeight: 400, letterSpacing: '-0.02em', color: 'var(--text-1)' }}>
            الريمايندرات
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
            ذكّرني بالمناسبات والمواعيد المهمة
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            background: 'var(--text-1)', color: 'var(--bg)', border: 'none',
            borderRadius: 'var(--radius-md)', padding: '8px 16px',
            fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-geist)',
          }}
        >
          {showForm ? 'إلغاء' : '+ جديد'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '24px', marginBottom: '24px' }}>

          {/* Image Upload */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ color: 'var(--text-2)', fontSize: '12px', fontWeight: 500, display: 'block', marginBottom: '6px' }}>
              رفع صورة (اختياري) — AI يستخرج التفاصيل تلقائياً
            </label>
            <label style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)',
              padding: '12px 16px', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '13px',
            }}>
              <i className="ti ti-photo-ai" style={{ fontSize: '18px' }} />
              {analyzing ? '⏳ جاري تحليل الصورة...' : image ? image.name : 'اضغط لرفع صورة'}
              <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
            </label>
          </div>

          {/* Title */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ color: 'var(--text-2)', fontSize: '12px', fontWeight: 500, display: 'block', marginBottom: '6px' }}>العنوان *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="مثل: عرس محمد، اجتماع العمل..." style={inputStyle} />
          </div>

          {/* Description */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ color: 'var(--text-2)', fontSize: '12px', fontWeight: 500, display: 'block', marginBottom: '6px' }}>تفاصيل (اختياري)</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="أي تفاصيل إضافية..." rows={2} style={{ ...inputStyle, resize: 'none' }} />
          </div>

          {/* Date */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ color: 'var(--text-2)', fontSize: '12px', fontWeight: 500, display: 'block', marginBottom: '6px' }}>التاريخ والوقت *</label>
            <input type="datetime-local" value={eventDate} onChange={e => setEventDate(e.target.value)} style={{ ...inputStyle, direction: 'ltr' }} />
          </div>

          {/* Notify Before */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ color: 'var(--text-2)', fontSize: '12px', fontWeight: 500, display: 'block', marginBottom: '10px' }}>
              ذكّرني قبل (اختر أكثر من واحد)
            </label>

            {/* Quick Options */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
              {QUICK_NOTIFY.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleNotify(opt.value)}
                  style={{
                    padding: '5px 12px', borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    background: notifyList.includes(opt.value) ? 'var(--text-1)' : 'var(--bg)',
                    color: notifyList.includes(opt.value) ? 'var(--bg)' : 'var(--text-muted)',
                    fontSize: '12px', cursor: 'pointer', fontFamily: 'var(--font-geist)',
                    transition: 'all 0.15s',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Custom */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                <input type="number" min={0} max={30} value={customDays} onChange={e => setCustomDays(Number(e.target.value))} style={numStyle} />
                <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>يوم</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                <input type="number" min={0} max={23} value={customHours} onChange={e => setCustomHours(Number(e.target.value))} style={numStyle} />
                <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>ساعة</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                <input type="number" min={0} max={59} value={customMinutes} onChange={e => setCustomMinutes(Number(e.target.value))} style={numStyle} />
                <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>دقيقة</span>
              </div>
              <button
                type="button"
                onClick={addCustomNotify}
                style={{
                  padding: '6px 12px', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)', background: 'var(--bg)',
                  color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer',
                  fontFamily: 'var(--font-geist)', marginTop: '-12px',
                }}
              >
                + إضافة
              </button>
            </div>

            {/* Selected notifications */}
            {notifyList.length > 0 && (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' }}>
                {notifyList.map(m => (
                  <span key={m} style={{
                    display: 'flex', alignItems: 'center', gap: '4px',
                    background: '#1a3a1a', color: '#4ade80',
                    padding: '3px 8px', borderRadius: '9999px', fontSize: '11px',
                  }}>
                    {formatNotify(m)}
                    <button
                      onClick={() => setNotifyList(prev => prev.filter(v => v !== m))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4ade80', padding: 0, fontSize: '12px' }}
                    >×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Save */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={handleSave}
              disabled={!title || !eventDate || saving || analyzing}
              style={{
                background: 'var(--text-1)', color: 'var(--bg)', border: 'none',
                borderRadius: 'var(--radius-md)', padding: '8px 20px',
                fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                fontFamily: 'var(--font-geist)',
                opacity: !title || !eventDate || saving || analyzing ? 0.4 : 1,
              }}
            >
              {saving ? 'جاري الحفظ...' : 'حفظ'}
            </button>
          </div>
        </div>
      )}

      {/* Reminders List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {reminders.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '48px', color: 'var(--text-muted)', fontSize: '13px',
            border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
          }}>
            لا توجد ريمايندرات بعد
          </div>
        )}
        {reminders.map(reminder => (
          <div key={reminder.id} style={{
            background: 'var(--bg-surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)', padding: '16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--text-1)', fontSize: '14px', fontWeight: 500 }}>{reminder.title}</span>
                  <span style={{
                    background: new Date(reminder.event_date) < new Date() ? '#333' : '#1a3a1a',
                    color: new Date(reminder.event_date) < new Date() ? 'var(--text-muted)' : '#4ade80',
                    fontSize: '11px', padding: '2px 8px', borderRadius: '9999px',
                  }}>
                    {getDaysLeft(reminder.event_date)}
                  </span>
                </div>
                {reminder.description && (
                  <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '6px' }}>
                    {reminder.description}
                  </div>
                )}
                <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                  📅 {formatDate(reminder.event_date)}
                </div>
                {reminder.notify_before?.length > 0 && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                    {reminder.notify_before.map((m: number) => (
                      <span key={m} style={{
                        background: '#1a2a3a', color: '#60a5fa',
                        padding: '2px 8px', borderRadius: '9999px', fontSize: '11px',
                      }}>
                        🔔 قبل {formatNotify(m)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => handleDelete(reminder.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}
              >
                <i className="ti ti-trash" style={{ fontSize: '15px' }} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}