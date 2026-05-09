import crypto from 'crypto'
import dns from 'dns'
import net from 'net'

interface WebhookConfig { outboundUrl: string | null; outboundSecret: string | null }

function isPrivateIp(addr: string): boolean {
  if (net.isIPv4(addr)) {
    const parts = addr.split('.').map(Number)
    const [a, b, c] = parts
    return (
      a === 10 ||
      a === 127 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 169 && b === 254) ||
      (a === 100 && b >= 64 && b <= 127) ||
      a === 0 ||
      (a === 192 && b === 0 && c === 0) ||
      (a === 198 && (b === 18 || b === 19)) ||
      (a === 198 && b === 51 && c === 100) ||
      (a === 203 && b === 0 && c === 113) ||
      a >= 240
    )
  }
  if (net.isIPv6(addr)) {
    const expanded = addr.toLowerCase()
    return (
      expanded === '::1' ||
      expanded === '::' ||
      expanded.startsWith('fc') ||
      expanded.startsWith('fd') ||
      expanded.startsWith('fe8') ||
      expanded.startsWith('fe9') ||
      expanded.startsWith('fea') ||
      expanded.startsWith('feb') ||
      expanded.startsWith('ff')
    )
  }
  return true // unrecognised — reject
}

export async function isSafeUrl(rawUrl: string): Promise<boolean> {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return false
  }
  if (url.protocol !== 'https:') return false

  const { hostname } = url
  const ipVersion = net.isIP(hostname) // 0 = not an IP, 4 or 6
  if (ipVersion !== 0) {
    return !isPrivateIp(hostname)
  }

  // Hostname: resolve all addresses and reject if any is private/reserved
  let addresses: dns.LookupAddress[]
  try {
    addresses = await dns.promises.lookup(hostname, { all: true })
  } catch {
    return false
  }
  return addresses.length > 0 && addresses.every(({ address }) => !isPrivateIp(address))
}

export async function deliverWebhook(
  config: WebhookConfig,
  payload: Record<string, unknown>
): Promise<void> {
  if (!config.outboundUrl) return
  if (!await isSafeUrl(config.outboundUrl)) return
  const body = JSON.stringify(payload)
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (config.outboundSecret) {
    headers['X-MemoBuilder-Signature'] =
      'sha256=' + crypto.createHmac('sha256', config.outboundSecret).update(body).digest('hex')
  }
  await fetch(config.outboundUrl, { method: 'POST', headers, body })
}
