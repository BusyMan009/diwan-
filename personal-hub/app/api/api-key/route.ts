import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

async function getUserId() {
  const cookieStore = await cookies()
  return cookieStore.get('diwan_user_id')?.value
}

export async function GET() {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createClient()
  const { data } = await supabase
    .from('api_keys')
    .select('key, created_at')
    .eq('user_id', userId)
    .single()

  return NextResponse.json(data || null)
}

export async function POST() {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createClient()

  // احذف القديم لو موجود
  await supabase.from('api_keys').delete().eq('user_id', userId)

  // ولّد جديد
  const { data } = await supabase
    .from('api_keys')
    .insert({ user_id: userId })
    .select('key, created_at')
    .single()

  return NextResponse.json(data)
}