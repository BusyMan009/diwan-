import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export default async function Home() {
  const cookieStore = await cookies()
  const userId = cookieStore.get('diwan_user_id')?.value

  if (userId) {
    redirect('/dashboard')
  } else {
    redirect('/login')
  }
}