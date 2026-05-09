import crypto from 'crypto'
import dns from 'dns'
import net from 'net'

interface WebhookConfig { outboundUrl: string | null; outboundSecret: string | null }

function isPrivateIP(addr: string): boolean {
  // Unwrap IPv4-mapped IPv6 (::ffff:a.b.c.d) and recurse
  if (net.isIPv6(addr)) {
    const v4mapped = addr.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i)
    if (v4mapped) return isPrivateIP(v4mapped[1])
    if (addr === '::1') return true                         // loopback
    if (/^fe[89ab][0-9a-f]:/i.test(addr)) return true      // fe80::/10 link-local
    if (/^f[cd][0-9a-f]{2}:/i.test(addr)) return true      // fc00::/7 unique-local
    return false
  }
  const parts = addr.split('.').map(Number)
  const [a, b] = parts
  return (
    a === 127 ||                               // loopback
    a === 10 ||                                // RFC 1918
    a === 0 ||                                 // unspecified
    (a === 172 && b >= 16 && b <= 31) ||       // RFC 1918
    (a === 192 && b === 168) ||                // RFC 1918
    (a === 169 && b === 254)                   // link-local / cloud metadata
  )
}

async function assertSafeUrl(rawUrl: string): Promise<void> {
  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    throw new Error('Invalid webhook URL')
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Webhook URL must use http or https')
  }

  // URL spec wraps IPv6 literals in brackets; strip them for net.isIPv6
  const hostname = parsed.hostname.replace(/^\[|\]$/g, '')

  if (net.isIPv4(hostname) || net.isIPv6(hostname)) {
    if (isPrivateIP(hostname)) throw new Error('Webhook URL targets a private/reserved address')
    return
  }

  // Resolve all addresses to guard against rebinding via short TTLs
  const results = await dns.promises.lookup(hostname, { all: true })
  for (const { address } of results) {
    if (isPrivateIP(address)) throw new Error('Webhook URL resolves to a private/reserved address')
  }
}

export async function deliverWebhook(
  config: WebhookConfig,
  payload: Record<string, unknown>
): Promise<void> {
  if (!config.outboundUrl) return
  await assertSafeUrl(config.outboundUrl)
  const body = JSON.stringify(payload)
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (config.outboundSecret) {
    headers['X-MemoBuilder-Signature'] =
      'sha256=' + crypto.createHmac('sha256', config.outboundSecret).update(body).digest('hex')
  }
  await fetch(config.outboundUrl, { method: 'POST', headers, body })
}
