/**
 * Proxy - Menggantikan middleware.ts di Next.js 16+
 * Kerangka Auth untuk masa depan
 * Saat ini: meneruskan semua request tanpa pemeriksaan auth
 * TODO: Aktifkan auth check saat fitur login diimplementasikan
 */
import { type NextRequest, NextResponse } from 'next/server'

export function proxy(request: NextRequest) {
  // === FUTURE AUTH IMPLEMENTATION ===
  // Uncomment saat fitur auth diaktifkan:
  //
  // const supabase = createServerClient(...)
  // const { data: { user } } = await supabase.auth.getUser()
  // if (!user && !request.nextUrl.pathname.startsWith('/auth')) {
  //   return NextResponse.redirect(new URL('/auth/login', request.url))
  // }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
