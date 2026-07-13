import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { hashPin } from '@/lib/supabase/auth'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  const { pin } = await request.json()
  const supabase = await createClient()

  const pinHash = hashPin(pin)

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('pin_hash', pinHash)
    .single()

  if (!user) {
    return NextResponse.json({ success: false })
  }

  const cookieStore = await cookies()
  cookieStore.set('diwan_user_id', user.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })

  return NextResponse.json({ success: true })
}




