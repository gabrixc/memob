// middleware.ts
export { auth as default } from '@/lib/auth'

export const config = {
  matcher: ['/((?!api/auth|login|_next|favicon.ico).*)'],
}
