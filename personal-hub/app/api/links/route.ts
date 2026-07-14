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
    .from('links')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  return NextResponse.json(data || [])
}

export async function POST(request: Request) {
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { url } = await request.json()
  const supabase = await createClient()

  // جلب معلومات الرابط
  let title = ''
  let description = ''
  let favicon = ''
  let og_image = ''

  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    const html = await res.text()

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    if (titleMatch) title = titleMatch[1].trim()

    const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i)
    if (ogTitleMatch) title = ogTitleMatch[1].trim()

    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)
    if (descMatch) description = descMatch[1].trim()

    const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i)
    if (ogDescMatch) description = ogDescMatch[1].trim()

    const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
    if (ogImageMatch) og_image = ogImageMatch[1].trim()

    const domain = new URL(url).hostname
    favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
    if (!title) title = domain
  } catch {
    try {
      const domain = new URL(url).hostname
      title = domain
      favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
    } catch {
      title = url
    }
  }

  const { data } = await supabase
    .from('links')
    .insert({ user_id: userId, url, title, description, favicon, og_image })
    .select()
    .single()

  return NextResponse.json(data)
}