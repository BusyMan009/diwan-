import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
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

if (!guest) return NextResponse.json({ error: 'guest not found', pin })
const { data: sharedRows } = await supabase
  .from('shared_files')
  .select('*')
  .eq('guest_id', guest.id)

if (!sharedRows || sharedRows.length === 0) return NextResponse.json([])

const fileIds = sharedRows.map(r => r.file_id)
const { data: files } = await supabase
  .from('files')
  .select('*')
  .in('id', fileIds)

const data = sharedRows.map(row => ({
  ...row,
  files: files?.find(f => f.id === row.file_id) || null
}))

    return NextResponse.json(data || [])
  }

  const userId = await getUserId()
  if (!userId) return NextResponse.json([])

  const { data } = await supabase
    .from('shared_files')
    .select('*, files!inner(*), guests!inner(name, user_id)')
    .eq('guests.user_id', userId)
    .order('created_at', { ascending: false })

  return NextResponse.json(data || [])
}

export async function POST(request: Request) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { file_id, guest_id } = await request.json()
  const supabase = await createClient()

  // تحقق إن الملف يخص المستخدم
  const { data: file } = await supabase
    .from('files')
    .select('id')
    .eq('id', file_id)
    .eq('user_id', userId)
    .single()

  if (!file) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // تحقق إن الضيف يخص المستخدم
  const { data: guest } = await supabase
    .from('guests')
    .select('id')
    .eq('id', guest_id)
    .eq('user_id', userId)
    .single()

  if (!guest) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: existing } = await supabase
    .from('shared_files')
    .select('id')
    .eq('file_id', file_id)
    .eq('guest_id', guest_id)
    .single()

  if (existing) {
    await supabase.from('shared_files').delete().eq('id', existing.id)
    return NextResponse.json({ shared: false })
  }

  const { data } = await supabase
    .from('shared_files')
    .insert({ file_id, guest_id })
    .select()
    .single()

  return NextResponse.json({ shared: true, data })
}