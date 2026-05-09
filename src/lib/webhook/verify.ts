import crypto from 'crypto'
import type { NextRequest } from 'next/server'

export function verifyBearerToken(req: NextRequest, expectedSecret: string): boolean {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/, '')
  const tokenBuf = Buffer.from(token)
  const secretBuf = Buffer.from(expectedSecret)
  if (tokenBuf.length === 0 || tokenBuf.length !== secretBuf.length) return false
  return crypto.timingSafeEqual(tokenBuf, secretBuf)
}
