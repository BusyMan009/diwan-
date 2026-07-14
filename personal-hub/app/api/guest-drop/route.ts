import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMegaStorage } from '@/lib/mega'
import { cookies } from 'next/headers'

async function getUserId() {
  const cookieStore = await cookies()
  return cookieStore.get('diwan_user_id')?.value
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const pin = searchParams.get('pin')
  const supabase = await createClient()

  if (pin) {
    const { data: guest } = await supabase
      .from('guests')
      .select('*')
      .eq('pin', pin)
      .eq('active', true)
      .single()

    return NextResponse.json(guest || null)
  }

  const userId = await getUserId()
  if (!userId) return NextResponse.json([])

  const { data } = await supabase
    .from('guest_drops')
    .select('*, guests!inner(name, pin, user_id)')
    .eq('guests.user_id', userId)
    .order('created_at', { ascending: false })

  return NextResponse.json(data || [])
}

export async function POST(request: Request) {
  const contentType = request.headers.get('content-type') || ''
  const supabase = await createClient()

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData()
    const pin = formData.get('pin') as string
    const senderName = formData.get('sender_name') as string
    const file = formData.get('file') as File
    const direction = (formData.get('direction') as string) || 'incoming'
    const expiry = formData.get('expiry') ? Number(formData.get('expiry')) : null
    const notifyTelegram = formData.get('notify_telegram') !== 'false'

    const { data: guest } = await supabase
      .from('guests')
      .select('*')
      .eq('pin', pin)
      .eq('active', true)
      .single()

    if (!guest) return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 })

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const storage = await getMegaStorage()
    const root = storage.root
    let folder = root.children?.find((n: any) => n.name === 'diwan-guest')
    if (!folder) folder = await root.mkdir('diwan-guest')

    const uploaded = await folder.upload({ name: file.name, size: buffer.length }, buffer).complete
    const url = await uploaded.link()

    const expires_at = expiry
      ? new Date(Date.now() + expiry * 60 * 1000).toISOString()
      : null

    const { data } = await supabase
      .from('guest_drops')
      .insert({
        guest_id: guest.id,
        sender_name: senderName,
        type: 'file',
        file_url: url,
        file_name: file.name,
        file_size: buffer.length,
        mime_type: file.type,
        direction,
        expires_at,
      })
      .select()
      .single()

    if (direction === 'incoming' && guest.telegram_notify && notifyTelegram) {
      await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: process.env.TELEGRAM_CHAT_ID,
          text: `ملف جديد من ${senderName} (${guest.name})\n${file.name}`,
        }),
      })
    }

    return NextResponse.json(data)
  } else {
    const { pin, sender_name, content, direction = 'incoming', expiry, notify_telegram = true } = await request.json()

    const { data: guest } = await supabase
      .from('guests')
      .select('*')
      .eq('pin', pin)
      .eq('active', true)
      .single()

    if (!guest) return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 })

    const expires_at = expiry
      ? new Date(Date.now() + expiry * 60 * 1000).toISOString()
      : null

    const { data } = await supabase
      .from('guest_drops')
      .insert({
        guest_id: guest.id,
        sender_name,
        type: 'text',
        content,
        direction,
        expires_at,
      })
      .select()
      .single()

    if (direction === 'incoming' && guest.telegram_notify && notify_telegram) {
      await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: process.env.TELEGRAM_CHAT_ID,
          text: `رسالة جديدة من ${sender_name} (${guest.name})\n\n${content}`,
        }),
      })
    }

    return NextResponse.json(data)
  }
}