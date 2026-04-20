// middleware.ts
export { auth as default } from '@/lib/auth'

export const config = {
  matcher: ['/((?!api/auth|api/webhook/trigger|login|_next|favicon.ico).*)'],
}
