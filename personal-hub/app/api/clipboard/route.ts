import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserId } from '@/lib/supabase/get-user'

export async function GET(request: Request) {
  const userId = await getUserId(request)
  if (!userId) return NextResponse.json([])

  const supabase = await createClient()
  const { data } = await supabase
    .from('clipboard')
    .select('*')
    .eq('user_id', userId)
    .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
    .order('created_at', { ascending: false })

  return NextResponse.json(data || [])
}

export async function POST(request: Request) {
  const userId = await getUserId(request)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { content, expiry } = await request.json()
  const supabase = await createClient()

  const expires_at = expiry
    ? new Date(Date.now() + expiry * 60 * 1000).toISOString()
    : null

  const { data } = await supabase
    .from('clipboard')
    .insert({ user_id: userId, content, expires_at })
    .select()
    .single()

  return NextResponse.json(data)
}