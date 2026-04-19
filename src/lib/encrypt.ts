// src/lib/encrypt.ts
import crypto from 'crypto'

const ALG = 'aes-256-gcm'
const KEY = Buffer.from(process.env.ENCRYPTION_KEY ?? '', 'hex')

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALG, KEY, iv)
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv, tag, encrypted].map(b => b.toString('hex')).join(':')
}

export function decrypt(encoded: string): string {
  const [ivHex, tagHex, encHex] = encoded.split(':')
  const decipher = crypto.createDecipheriv(
    ALG, KEY, Buffer.from(ivHex, 'hex')
  )
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
  return decipher.update(Buffer.from(encHex, 'hex')) + decipher.final('utf8')
}
