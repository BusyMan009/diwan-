import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const userId = request.cookies.get('diwan_user_id')?.value
  const { pathname } = request.nextUrl

  // لو مسجل ويحاول يدخل login، وديه للداشبورد
  if (userId && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // لو مو مسجل ويحاول يدخل dashboard، وديه للـ login
  if (!userId && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
}