import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const now = new Date()

  const { data: reminders } = await supabase
    .from('reminders')
    .select('*')
    .gt('event_date', now.toISOString())

  if (!reminders) return NextResponse.json({ sent: 0 })

  let sent = 0

  for (const reminder of reminders) {
    const eventTime = new Date(reminder.event_date).getTime()
    const notifyBefore: number[] = reminder.notify_before || []

    for (const minutes of notifyBefore) {
      const notifyTime = eventTime - minutes * 60 * 1000
      const diff = Math.abs(notifyTime - now.getTime())

      if (diff < 60 * 1000) {
        const label = minutes >= 24 * 60
          ? `${minutes / (24 * 60)} أيام`
          : minutes >= 60
          ? `${minutes / 60} ساعة`
          : `${minutes} دقيقة`

        const message = `⏰ تذكير: ${reminder.title}\nبعد ${label}\n📅 ${new Date(reminder.event_date).toLocaleString('ar-SA')}`

        await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: process.env.TELEGRAM_CHAT_ID,
            text: message,
          }),
        })

        sent++
      }
    }
  }

  return NextResponse.json({ sent })
}