import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/encrypt'
import { getRecords } from '@/lib/db/records'
import { substitutePlaceholders } from '@/lib/canvas/placeholders'
import { generatePdf, canvasJsonToHtml } from '@/lib/export/pdf'
import { dataUrlToBuffer } from '@/lib/export/image'
import { buildDocx, canvasJsonToDocElements } from '@/lib/export/word'
import { deliverWebhook } from '@/lib/webhook/outbound'
import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'

const EXPORTS_DIR = path.join(process.cwd(), 'exports')

export async function POST(req: NextRequest) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { templateId, recordId, format, sourceId, table, canvasDataUrl } = await req.json()

  const template = await prisma.template.findUnique({ where: { id: templateId } })
  if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 })

  let record: Record<string, string> = {}
  if (sourceId && table) {
    const source = await prisma.dataSource.findUnique({ where: { id: sourceId } })
    if (source) {
      const rows = await getRecords(decrypt(source.connectionUrl), table)
      record = rows.find(r => Object.values(r)[0] === String(recordId)) ?? rows[0] ?? {}
    }
  }

  const filled = substitutePlaceholders(template.canvasJson as Record<string, unknown>, record)
  await fs.mkdir(EXPORTS_DIR, { recursive: true })

  const jobId = crypto.randomUUID()
  let buffer: Buffer
  let ext: string

  if (format === 'pdf') {
    buffer = await generatePdf(canvasJsonToHtml(filled)); ext = 'pdf'
  } else if (format === 'image') {
    buffer = dataUrlToBuffer(canvasDataUrl); ext = 'png'
  } else {
    buffer = await buildDocx(canvasJsonToDocElements(filled)); ext = 'docx'
  }

  const filePath = path.join(EXPORTS_DIR, `${jobId}.${ext}`)
  await fs.writeFile(filePath, buffer)

  await prisma.exportJob.create({
    data: { templateId, recordId: String(recordId ?? ''), format, status: 'done', filePath, triggeredBy: 'ui' },
  })

  const downloadUrl = `/api/export/${jobId}.${ext}`

  const webhookConfig = await prisma.webhookConfig.findFirst()
  if (webhookConfig?.outboundUrl && webhookConfig.outboundEvents.includes('export.completed')) {
    await deliverWebhook(webhookConfig, {
      event: 'export.completed', templateId, recordId: String(recordId ?? ''),
      format, downloadUrl, timestamp: new Date().toISOString(),
    })
  }

  return NextResponse.json({ downloadUrl })
}
