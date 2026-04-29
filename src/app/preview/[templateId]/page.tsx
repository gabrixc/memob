import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/encrypt'
import { getRecords, runCustomQuery } from '@/lib/db/records'
import { substitutePlaceholders } from '@/lib/canvas/placeholders'
import PreviewCanvas from './PreviewCanvas'
import PreviewActions from './PreviewActions'

export default async function PreviewPage({
  params,
  searchParams,
}: {
  params: { templateId: string }
  searchParams: { sourceId?: string; table?: string; query?: string; limit?: string }
}) {
  const session = await auth()
  if (!session) redirect('/login')
  const template = await prisma.template.findUnique({ where: { id: params.templateId } })
  if (!template) return <div>Template not found</div>

  const raw = template.canvasJson as Record<string, unknown>
  const rawPages: Record<string, unknown>[] = Array.isArray(raw?.pages)
    ? (raw.pages as Record<string, unknown>[])
    : [raw]

  // Fetch sample record if data source is provided
  let sampleRecord: Record<string, string> = {}
  if (searchParams.sourceId && (searchParams.table || searchParams.query)) {
    const source = await prisma.dataSource.findUnique({ where: { id: searchParams.sourceId } })
    if (source) {
      const limit = Math.min(parseInt(searchParams.limit ?? '1', 10) || 1, 1)
      if (searchParams.query) {
        const records = await runCustomQuery(decrypt(source.connectionUrl), searchParams.query)
        sampleRecord = records[0] ?? {}
      } else if (searchParams.table) {
        const records = await getRecords(decrypt(source.connectionUrl), searchParams.table, limit)
        sampleRecord = records[0] ?? {}
      }
    }
  }

  // Substitute placeholders with sample data
  const renderedPages = rawPages.map(p => substitutePlaceholders(p as Record<string, unknown>, sampleRecord))

  return (
    <>
      <style>{`@media print { .no-print { display: none !important; } body { margin: 0; } }`}</style>
      <PreviewActions />
      <div className="w-[794px] mx-auto bg-white shadow-lg">
        {renderedPages.map((pageJson, i) => (
          <PreviewCanvas key={i} canvasJson={pageJson as object} />
        ))}
      </div>
    </>
  )
}
