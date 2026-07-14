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
    const sentList: number[] = reminder.sent_notifications || []

    for (const minutes of notifyBefore) {
      if (sentList.includes(minutes)) continue

      const notifyTime = eventTime - minutes * 60 * 1000
      const diff = notifyTime - now.getTime()

      if (diff <= 0 && diff > -5 * 60 * 1000) {
        const label = minutes >= 24 * 60
          ? `${minutes / (24 * 60)} أيام`
          : minutes >= 60
          ? `${minutes / 60} ساعة`
          : `${minutes} دقيقة`

        const message = `⏰ تذكير: ${reminder.title}\nبعد ${label}\n📅 ${new Date(reminder.event_date).toLocaleString('ar-SA')}${reminder.description ? `\n📝 ${reminder.description}` : ''}`

        let res: Response

        if (reminder.image_url) {
          try {
            const imgBuffer = await fetch(reminder.image_url).then(r => r.arrayBuffer())
            const formData = new FormData()
            formData.append('chat_id', process.env.TELEGRAM_CHAT_ID!)
            formData.append('caption', message)
            formData.append('photo', new Blob([imgBuffer]), 'reminder.jpg')

            res = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendPhoto`, {
              method: 'POST',
              body: formData,
            })
          } catch {
            // لو فشل رفع الصورة، أرسل نص فقط
            res = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: process.env.TELEGRAM_CHAT_ID,
                text: message,
              }),
            })
          }
        } else {
          res = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: process.env.TELEGRAM_CHAT_ID,
              text: message,
            }),
          })
        }

        if (res.ok) {
          await supabase
            .from('reminders')
            .update({ sent_notifications: [...sentList, minutes] })
            .eq('id', reminder.id)

          sent++
        }
      }
    }
  }

  return NextResponse.json({ sent })
}