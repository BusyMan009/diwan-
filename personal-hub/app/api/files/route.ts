import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMegaStorage } from '@/lib/mega'
import { cookies } from 'next/headers'

async function getUserId() {
  const cookieStore = await cookies()
  return cookieStore.get('diwan_user_id')?.value
}

export async function GET() {
  const userId = await getUserId()
  if (!userId) return NextResponse.json([])

  const supabase = await createClient()
  const { data } = await supabase
    .from('files')
    .select('*')
    .eq('user_id', userId)
    .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
    .order('created_at', { ascending: false })

  return NextResponse.json(data || [])
}

export async function POST(request: Request) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File
  const title = formData.get('title') as string | null
  const note = formData.get('note') as string | null
  const expiryValue = formData.get('expiry') as string | null

  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const storage = await getMegaStorage()
  const root = storage.root

  let diwanFolder = root.children?.find((n: any) => n.name === 'diwan')
  if (!diwanFolder) {
    diwanFolder = await root.mkdir('diwan')
  }

  const uploaded = await diwanFolder.upload({
    name: file.name,
    size: buffer.length,
  }, buffer).complete

  const url = await uploaded.link()

  const expiryMap: Record<string, number> = {
    '30m': 30 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
  }

  const expires_at = expiryValue && expiryMap[expiryValue]
    ? new Date(Date.now() + expiryMap[expiryValue]).toISOString()
    : null

  const supabase = await createClient()
  const { data } = await supabase
    .from('files')
    .insert({
      user_id: userId,
      name: file.name,
      title: title || null,
      note: note || null,
      url,
      size_bytes: buffer.length,
      mime_type: file.type,
      expires_at,
    })
    .select()
    .single()

  return NextResponse.json(data)
}