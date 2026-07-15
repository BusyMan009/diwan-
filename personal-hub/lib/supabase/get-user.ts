import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function getUserId(request?: Request): Promise<string | null> {
  if (request) {
    const apiKey = request.headers.get('x-api-key')
    console.log('API Key received:', apiKey)
    if (apiKey) {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('api_keys')
        .select('user_id')
        .eq('key', apiKey)
        .single()
      console.log('API Key lookup result:', data, error)
      if (data) return data.user_id
    }
  }

  try {
    const cookieStore = await cookies()
    const cookieUserId = cookieStore.get('diwan_user_id')?.value
    if (cookieUserId) return cookieUserId
  } catch {
    return null
  }

  return null
}