import crypto from 'crypto'
import type { NextRequest } from 'next/server'

export function verifyBearerToken(req: NextRequest, expectedSecret: string): boolean {
  const match = /^Bearer\s+(.+)$/i.exec(req.headers.get('Authorization') ?? '')
  if (!match || !match[1]) return false
  const tokenBuf = Buffer.from(match[1])
  const secretBuf = Buffer.from(expectedSecret)
  if (tokenBuf.length !== secretBuf.length) return false
  return crypto.timingSafeEqual(tokenBuf, secretBuf)
}
