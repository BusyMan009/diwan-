import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies()
  const userId = cookieStore.get('diwan_user_id')?.value
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const supabase = await createClient()
  await supabase.from('files').delete().eq('id', id).eq('user_id', userId)

  return NextResponse.json({ success: true })
}