import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMegaStorage } from '@/lib/mega'
import { cookies } from 'next/headers'

async function getUserId() {
  const cookieStore = await cookies()
  return cookieStore.get('diwan_user_id')?.value
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const supabase = await createClient()
  const { data: file } = await supabase
    .from('files')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (!file) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // جيب الملف من Mega عبر الـ SDK
  const storage = await getMegaStorage()
  const root = storage.root

  const diwanFolder = root.children?.find((n: any) => n.name === 'diwan')
  if (!diwanFolder) return NextResponse.json({ error: 'Folder not found' }, { status: 404 })

  const megaFile = diwanFolder.children?.find((n: any) => n.name === file.name)
  if (!megaFile) return NextResponse.json({ error: 'File not found' }, { status: 404 })

  const chunks: Buffer[] = []
  await new Promise<void>((resolve, reject) => {
    const stream = megaFile.download()
    stream.on('data', (chunk: Buffer) => chunks.push(chunk))
    stream.on('end', resolve)
    stream.on('error', reject)
  })

  const buffer = Buffer.concat(chunks)

return new NextResponse(buffer, {
  headers: {
    'Content-Type': file.mime_type,
    'Content-Disposition': file.mime_type === 'application/pdf' 
      ? `inline; filename="${file.name}"` 
      : `attachment; filename="${file.name}"`,
  },
})
}