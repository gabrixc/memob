import crypto from 'crypto'

interface WebhookConfig { outboundUrl: string | null; outboundSecret: string | null }

function isSafeUrl(raw: string): boolean {
  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:') return false
    const host = url.hostname
    if (/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.)/.test(host)) return false
    return true
  } catch { return false }
}

export async function deliverWebhook(
  config: WebhookConfig,
  payload: Record<string, unknown>
): Promise<void> {
  if (!config.outboundUrl) return
  if (!isSafeUrl(config.outboundUrl)) {
    throw new Error('Webhook URL is not allowed (must be HTTPS and not a private address)')
  }
  const body = JSON.stringify(payload)
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (config.outboundSecret) {
    headers['X-MemoBuilder-Signature'] =
      'sha256=' + crypto.createHmac('sha256', config.outboundSecret).update(body).digest('hex')
  }
  await fetch(config.outboundUrl, { method: 'POST', headers, body })
}
