import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ pin: string }> }
) {
  const { pin } = await params
  const supabase = await createClient()

  const { data: guest } = await supabase
    .from('guests')
    .select('*')
    .eq('pin', pin)
    .eq('active', true)
    .single()

  if (!guest) return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 })

  // الملفات المشاركة
  const { data: sharedRows } = await supabase
    .from('shared_files')
    .select('*')
    .eq('guest_id', guest.id)

  const fileIds = sharedRows?.map(r => r.file_id) || []
  let files: any[] = []
  if (fileIds.length > 0) {
    const { data } = await supabase.from('files').select('*').in('id', fileIds)
    files = data || []
  }

  // الرسائل والملفات من وإلى الضيف
  const { data: drops } = await supabase
    .from('guest_drops')
    .select('*')
    .eq('guest_id', guest.id)
    .order('created_at', { ascending: false })

  return NextResponse.json({ guest, files, drops: drops || [] })
}