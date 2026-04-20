// src/lib/encrypt.ts
import crypto from 'crypto'

if (!process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY.length !== 64) {
  throw new Error('ENCRYPTION_KEY must be a 64-character hex string (32 bytes)')
}
const ALG = 'aes-256-gcm'
const KEY = Buffer.from(process.env.ENCRYPTION_KEY, 'hex')

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALG, KEY, iv)
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv, tag, encrypted].map(b => b.toString('hex')).join(':')
}

export function decrypt(encoded: string): string {
  const parts = encoded.split(':')
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted value format')
  }
  const [ivHex, tagHex, encHex] = parts
  const decipher = crypto.createDecipheriv(ALG, KEY, Buffer.from(ivHex, 'hex')) as crypto.DecipherGCM
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
  const plain = Buffer.concat([
    decipher.update(Buffer.from(encHex, 'hex')),
    decipher.final(),
  ])
  return plain.toString('utf8')
}
