import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { image, mimeType } = await request.json()

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${image}` },
            },
            {
              type: 'text',
              text: `حلل هذه الصورة واستخرج المعلومات.
قواعد مهمة:
- التاريخ يجب أن يكون ميلادي دائماً حتى لو كان في الصورة هجري حوّله لميلادي
- صيغة التاريخ يجب أن تكون بالضبط: YYYY-MM-DDTHH:mm مثال: 2026-11-19T00:00
- إذا ما في وقت محدد استخدم 00:00
- إذا ما في تاريخ واضح اجعل date فارغاً ""
أجب فقط بـ JSON بهذا الشكل بدون أي نص إضافي خارج الـ JSON:
{
  "title": "عنوان مناسب ومختصر",
  "date": "YYYY-MM-DDTHH:mm",
  "description": "ملخص التفاصيل المهمة"
}`,
            },
          ],
        },
      ],
      max_tokens: 500,
    }),
  })

  const data = await response.json()
  try {
    const text = data.choices?.[0]?.message?.content || ''
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    if (parsed.date && parsed.date.length >= 10) {
      const d = new Date(parsed.date)
      if (!isNaN(d.getTime())) {
        const pad = (n: number) => String(n).padStart(2, '0')
        parsed.date = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
      } else {
        parsed.date = ''
      }
    }

    return NextResponse.json({
      title: parsed.title || '',
      date: parsed.date || '',
      description: parsed.description || '',
    })
  } catch {
    return NextResponse.json({ title: '', date: '', description: '' })
  }
}