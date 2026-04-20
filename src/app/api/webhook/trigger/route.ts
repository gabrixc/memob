import { prisma } from '@/lib/prisma'
import { verifyBearerToken } from '@/lib/webhook/verify'
import { decrypt } from '@/lib/encrypt'
import { getRecords } from '@/lib/db/records'
import { substitutePlaceholders } from '@/lib/canvas/placeholders'
import { generatePdf, canvasJsonToHtml } from '@/lib/export/pdf'
import { buildDocx, canvasJsonToDocElements } from '@/lib/export/word'
import { deliverWebhook } from '@/lib/webhook/outbound'
import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'

const EXPORTS_DIR = path.join(process.cwd(), 'exports')

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
  await fs.mkdir(EXPORTS_DIR, { recursive: true })
  const jobId = crypto.randomUUID()

  const buffer = format === 'word'
    ? await buildDocx(canvasJsonToDocElements(filled))
    : await generatePdf(canvasJsonToHtml(filled))
  const ext = format === 'word' ? 'docx' : 'pdf'

  await fs.writeFile(path.join(EXPORTS_DIR, `${jobId}.${ext}`), buffer)
  await prisma.exportJob.create({
    data: { templateId: template_id, recordId: String(record_id), format, status: 'done',
      filePath: path.join(EXPORTS_DIR, `${jobId}.${ext}`), triggeredBy: 'webhook' },
  })

  const downloadUrl = `/api/export/${jobId}.${ext}`
  if (config.outboundUrl && config.outboundEvents.includes('export.completed')) {
    await deliverWebhook(config, {
      event: 'export.completed', template_id, record_id, format, downloadUrl,
      timestamp: new Date().toISOString(),
    })
  }

  return NextResponse.json({ status: 'ok', download_url: downloadUrl })
}
