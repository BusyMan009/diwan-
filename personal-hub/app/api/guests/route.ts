import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserId } from '@/lib/supabase/get-user'

function generatePin() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function GET(request: Request) {
  const userId = await getUserId(request)
  if (!userId) return NextResponse.json([])

  const supabase = await createClient()
  const { data } = await supabase
    .from('guests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  return NextResponse.json(data || [])
}

export async function POST(request: Request) {
  const userId = await getUserId(request)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name } = await request.json()
  const supabase = await createClient()

  const pin = generatePin()

  const { data } = await supabase
    .from('guests')
    .insert({ user_id: userId, name, pin })
    .select()
    .single()

  return NextResponse.json(data)
}