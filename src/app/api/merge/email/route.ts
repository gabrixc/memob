import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/encrypt'
import { getRecords, runCustomQuery } from '@/lib/db/records'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { templateId, sourceId, table, query, recordIndex, toEmail } = body as {
    templateId?: string
    sourceId?: string
    table?: string
    query?: string
    recordIndex?: number
    toEmail?: string
  }

  if (!templateId || !toEmail) {
    return NextResponse.json({ error: 'Missing required fields: templateId, toEmail' }, { status: 400 })
  }

  const template = await prisma.template.findUnique({ where: { id: templateId } })
  if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 })

  let record: Record<string, string> = {}
  if (sourceId && query) {
    // Custom query mode
    const source = await prisma.dataSource.findUnique({ where: { id: sourceId } })
    if (source) {
      const rows = await runCustomQuery(decrypt(source.connectionUrl), query)
      record = rows[recordIndex ?? 0] ?? rows[0] ?? {}
    }
  } else if (sourceId && table) {
    // Table mode
    const source = await prisma.dataSource.findUnique({ where: { id: sourceId } })
    if (source) {
      const rows = await getRecords(decrypt(source.connectionUrl), table)
      record = rows[recordIndex ?? 0] ?? rows[0] ?? {}
    }
  }

  // STUB — wire real email delivery here when email infra is available:
  // const raw = template.canvasJson as Record<string, unknown>
  // const rawPages = Array.isArray(raw?.pages) ? raw.pages as object[] : [raw]
  // const mergedPages = rawPages.map(p => substitutePlaceholders(p as Record<string,unknown>, record))
  // const html = mergedPages.map(p => canvasJsonToHtml(p as Record<string,unknown>)).join('')
  // const pdfBuffer = await generatePdf(html)
  // await sendMemo(toEmail, template.name, pdfBuffer)  // implement in src/lib/email/send.ts

  console.log(
    `[merge/email stub] to=${toEmail} template="${template.name}" recordIndex=${recordIndex ?? 0}`,
    `recordKeys=[${Object.keys(record).join(', ')}]`
  )

  return NextResponse.json({
    status: 'stub',
    message: 'Email sending is not yet configured.',
  })
}
