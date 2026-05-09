import crypto from 'crypto'
import type { NextRequest } from 'next/server'

export function verifyBearerToken(req: NextRequest, expectedSecret: string): boolean {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/, '')
  if (!token || token.length !== expectedSecret.length) return false
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expectedSecret))
}
