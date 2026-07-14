import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { hashPin } from '@/lib/supabase/auth'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  const { pin } = await request.json()
  const supabase = await createClient()
  const pinHash = hashPin(pin)

  // تحقق من الـ PIN الرئيسي
  const { data: userMain } = await supabase
    .from('users')
    .select('id')
    .eq('pin_hash', pinHash)
    .single()

  if (userMain) {
    // PIN رئيسي — يحفظ الجلسة للأبد
    const cookieStore = await cookies()
    cookieStore.set('diwan_user_id', userMain.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 365 * 10, // 10 سنوات
      path: '/',
    })
    return NextResponse.json({ success: true, type: 'permanent' })
  }

  // تحقق من الـ PIN المؤقت
  const { data: userTemp } = await supabase
    .from('users')
    .select('id')
    .eq('temp_pin_hash', pinHash)
    .single()

  if (userTemp) {
    // PIN مؤقت — Session Cookie تنتهي بإغلاق المتصفح
// PIN مؤقت — ينتهي بعد ساعة
const cookieStore = await cookies()
cookieStore.set('diwan_user_id', userTemp.id, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  maxAge: 60, // ساعة واحدة
  path: '/',
})
    return NextResponse.json({ success: true, type: 'temporary' })
  }

  return NextResponse.json({ success: false })
}