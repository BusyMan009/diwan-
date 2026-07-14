import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
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
    .from('notes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  return NextResponse.json(data || [])
}

export async function POST(request: Request) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title, content } = await request.json()
  const supabase = await createClient()

  const { data } = await supabase
    .from('notes')
    .insert({ user_id: userId, title, content })
    .select()
    .single()

  return NextResponse.json(data)
}

export async function PATCH(request: Request) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, title, content } = await request.json()
  const supabase = await createClient()

  const { data } = await supabase
    .from('notes')
    .update({ title, content })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single()

  return NextResponse.json(data)
}