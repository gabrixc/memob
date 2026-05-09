import { prisma } from '@/lib/prisma'
import { verifyBearerToken } from '@/lib/webhook/verify'
import { decrypt } from '@/lib/encrypt'
import { getRecords } from '@/lib/db/records'
import { substitutePlaceholders } from '@/lib/canvas/placeholders'
import { deliverWebhook } from '@/lib/webhook/outbound'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const config = await prisma.webhookConfig.findFirst()
  if (!config || !verifyBearerToken(req, config.inboundSecret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { template_id, record_id, format = 'pdf', source_id, table } = await req.json()

  const template = await prisma.template.findUnique({ where: { id: template_id } })
  if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 })

  let record: Record<string, string> = {}
  if (source_id && table) {
    const source = await prisma.dataSource.findUnique({ where: { id: source_id } })
    if (source) {
      const rows = await getRecords(decrypt(source.connectionUrl), table)
      record = rows.find(r => Object.values(r)[0] === String(record_id)) ?? {}
    }
  }

  const filled = substitutePlaceholders(template.canvasJson as Record<string, unknown>, record)

  // Export functionality has been removed
  return NextResponse.json({ status: 'error', message: 'Export functionality is currently unavailable' }, { status: 501 })
}
