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
    .from('reminders')
    .select('*')
    .eq('user_id', userId)
    .order('event_date', { ascending: true })

  return NextResponse.json(data || [])
}

export async function POST(request: Request) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title, description, eventDate, notifyBefore } = await request.json()

  const supabase = await createClient()
  const { data } = await supabase
    .from('reminders')
    .insert({
      user_id: userId,
      title,
      description: description || null,
      event_date: new Date(eventDate).toISOString(),
      notify_before: notifyBefore,
    })
    .select()
    .single()

  return NextResponse.json(data)
}