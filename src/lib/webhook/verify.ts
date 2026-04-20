import type { NextRequest } from 'next/server'

export function verifyBearerToken(req: NextRequest, expectedSecret: string): boolean {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/, '')
  return token.length > 0 && token === expectedSecret
}
