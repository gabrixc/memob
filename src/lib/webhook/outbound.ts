import crypto from 'crypto'
import dns from 'dns'
import http from 'http'
import https from 'https'
import net from 'net'

interface WebhookConfig { outboundUrl: string | null; outboundSecret: string | null }

// Expands the :: shorthand in an IPv6 address to its full 8-group form.
// Only called on addresses that don't contain dotted-quad suffixes.
function expandIPv6(addr: string): string {
  if (!addr.includes('::')) return addr
  const [left, right] = addr.split('::')
  const leftGroups = left ? left.split(':') : []
  const rightGroups = right ? right.split(':') : []
  const middle = Array(8 - leftGroups.length - rightGroups.length).fill('0')
  return [...leftGroups, ...middle, ...rightGroups].join(':')
}

function isPrivateIP(addr: string): boolean {
  if (net.isIPv6(addr)) {
    // Dotted-quad form: ::ffff:a.b.c.d
    const v4dotted = addr.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i)
    if (v4dotted) return isPrivateIP(v4dotted[1])

    // Hex form: ::ffff:xxxx:xxxx or 0:0:0:0:0:ffff:xxxx:xxxx — expand then check
    const expanded = expandIPv6(addr)
    const v4hex = expanded.match(/^(?:0{1,4}:){5}ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i)
    if (v4hex) {
      const h = parseInt(v4hex[1], 16), l = parseInt(v4hex[2], 16)
      return isPrivateIP(`${(h >> 8) & 0xff}.${h & 0xff}.${(l >> 8) & 0xff}.${l & 0xff}`)
    }

    if (addr === '::1') return true                         // loopback
    if (/^fe[89ab][0-9a-f]:/i.test(addr)) return true      // fe80::/10 link-local
    if (/^f[cd][0-9a-f]{2}:/i.test(addr)) return true      // fc00::/7 unique-local
    if (/^2001:db8:/i.test(addr)) return true               // documentation prefix
    return false
  }
  const parts = addr.split('.').map(Number)
  const [a, b] = parts
  return (
    a === 127 ||                               // loopback
    a === 10 ||                                // RFC 1918
    a === 0 ||                                 // unspecified
    addr === '255.255.255.255' ||              // broadcast
    (a === 100 && b >= 64 && b <= 127) ||      // RFC 6598 CGN
    (a === 172 && b >= 16 && b <= 31) ||       // RFC 1918
    (a === 192 && b === 168) ||                // RFC 1918
    (a === 169 && b === 254)                   // link-local / cloud metadata
  )
}

// Validates the URL and resolves the hostname to all IPs we may pin to.
// For IP literals, pinnedIPs contains the literal itself (no re-resolution risk).
async function resolveAndCheck(
  rawUrl: string
): Promise<{ parsed: URL; hostname: string; pinnedIPs: string[] }> {
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
    return { parsed, hostname, pinnedIPs: [hostname] }
  }

  // Resolve all addresses to guard against rebinding via short TTLs
  const results = await dns.promises.lookup(hostname, { all: true })
  const validatedIPs: string[] = []
  for (const { address } of results) {
    if (isPrivateIP(address)) throw new Error('Webhook URL resolves to a private/reserved address')
    validatedIPs.push(address)
  }

  return { parsed, hostname, pinnedIPs: validatedIPs }
}

const REQUEST_TIMEOUT_MS = 10_000

// Attempts the POST to a single pinned IP; resolves with the HTTP status code.
function tryOneIP(
  parsed: URL,
  hostname: string,
  pinnedIP: string,
  reqHeaders: Record<string, string>,
  body: string
): Promise<number> {
  return new Promise((resolve, reject) => {
    // Re-check at socket-creation time to close the TOCTOU window
    if (isPrivateIP(pinnedIP)) {
      reject(new Error('Webhook target resolved to a private/reserved address'))
      return
    }
    const isHttps = parsed.protocol === 'https:'
    const port = parsed.port ? Number(parsed.port) : (isHttps ? 443 : 80)
    const mod = isHttps ? https : http
    let settled = false
    const done = (err: Error | null, status?: number) => {
      if (settled) return
      settled = true
      if (err) {
        reject(err)
      } else {
        resolve(status!)
      }
    }
    const req = mod.request(
      {
        hostname: pinnedIP,
        port,
        path: parsed.pathname + parsed.search,
        method: 'POST',
        headers: { ...reqHeaders, Host: parsed.host },  // preserve port and IPv6 brackets
        ...(isHttps && { servername: hostname }),        // SNI → cert validates against hostname
      },
      (res) => {
        res.resume()  // drain body to free the socket
        done(null, res.statusCode ?? 0)
      }
    )
    req.setTimeout(REQUEST_TIMEOUT_MS, () => {
      req.destroy(new Error(`Webhook request timed out after ${REQUEST_TIMEOUT_MS}ms`))
    })
    req.on('error', (err) => done(err))
    req.write(body)
    req.end()
  })
}

// Sends the request to pinnedIPs directly, avoiding any re-resolution by the runtime.
// Retries across all validated addresses on connection failure.
// http/https.request does not follow redirects automatically; 3xx is returned as-is.
async function sendPinned(
  parsed: URL,
  hostname: string,
  pinnedIPs: string[],
  reqHeaders: Record<string, string>,
  body: string
): Promise<number> {
  let lastErr: Error | undefined
  for (const ip of pinnedIPs) {
    try {
      return await tryOneIP(parsed, hostname, ip, reqHeaders, body)
    } catch (err) {
      lastErr = err as Error
    }
  }
  throw lastErr ?? new Error('Webhook: no reachable addresses')
}

export async function deliverWebhook(
  config: WebhookConfig,
  payload: Record<string, unknown>
): Promise<void> {
  if (!config.outboundUrl) return
  const { parsed, hostname, pinnedIPs } = await resolveAndCheck(config.outboundUrl)
  const body = JSON.stringify(payload)
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (config.outboundSecret) {
    headers['X-MemoBuilder-Signature'] =
      'sha256=' + crypto.createHmac('sha256', config.outboundSecret).update(body).digest('hex')
  }
  const status = await sendPinned(parsed, hostname, pinnedIPs, headers, body)
  if (status >= 300 && status < 400) {
    throw new Error(`Webhook delivery rejected redirect (${status}) from ${config.outboundUrl}`)
  }
}
