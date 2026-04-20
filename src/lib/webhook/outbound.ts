import crypto from 'crypto'

interface WebhookConfig { outboundUrl: string | null; outboundSecret: string | null }

export async function deliverWebhook(
  config: WebhookConfig,
  payload: Record<string, unknown>
): Promise<void> {
  if (!config.outboundUrl) return
  const body = JSON.stringify(payload)
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (config.outboundSecret) {
    headers['X-MemoBuilder-Signature'] =
      'sha256=' + crypto.createHmac('sha256', config.outboundSecret).update(body).digest('hex')
  }
  await fetch(config.outboundUrl, { method: 'POST', headers, body })
}
