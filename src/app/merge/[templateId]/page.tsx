import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/encrypt'
import { getRecords, runCustomQuery } from '@/lib/db/records'
import dynamic from 'next/dynamic'
import MergeSourcePicker from './MergeSourcePicker'

const MergeClient = dynamic(() => import('./MergeClient'), { ssr: false })

interface DataBlock {
  id: string; sourceId: string; sourceName: string
  type: 'table' | 'query'; table?: string; query?: string; queryName?: string
}

export default async function MergePage({
  params,
  searchParams,
}: {
  params: { templateId: string }
  searchParams: { sourceId?: string; table?: string; query?: string; limit?: string; blocks?: string }
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const template = await prisma.template.findUnique({ where: { id: params.templateId } })
  if (!template) return <div className="p-8 text-slate-500">Template not found</div>

  const raw = template.canvasJson as Record<string, unknown>
  const rawPages: Record<string, unknown>[] = Array.isArray(raw?.pages)
    ? (raw.pages as Record<string, unknown>[])
    : [raw]

  // Multi-block merge mode
  if (searchParams.blocks) {
    const blocks: DataBlock[] = JSON.parse(decodeURIComponent(searchParams.blocks))
    if (blocks.length === 0) {
      return (
        <div style={{ background: '#1e293b', minHeight: '100vh' }}>
          <MergeSourcePicker templateId={params.templateId} templateName={template.name} />
        </div>
      )
    }
    const primaryBlock = blocks[0]
    const staticBlocks = blocks.slice(1)
    const limit = Math.min(parseInt(searchParams.limit ?? '200', 10) || 200, 500)

    const primarySource = await prisma.dataSource.findUnique({ where: { id: primaryBlock.sourceId } })
    if (!primarySource) return <div className="p-8 text-slate-500">Data source not found</div>
    const primaryUrl = decrypt(primarySource.connectionUrl)
    const records = primaryBlock.type === 'query'
      ? await runCustomQuery(primaryUrl, primaryBlock.query!)
      : await getRecords(primaryUrl, primaryBlock.table!, limit)

    // Fetch first record from each static block
    const staticRecords = await Promise.all(staticBlocks.map(async (b) => {
      const src = await prisma.dataSource.findUnique({ where: { id: b.sourceId } })
      if (!src) return {}
      const url = decrypt(src.connectionUrl)
      const rows = b.type === 'query' ? await runCustomQuery(url, b.query!) : await getRecords(url, b.table!)
      return rows[0] ?? {}
    }))
    const staticRecord = Object.assign({}, ...staticRecords) as Record<string, string>

    return (
      <div style={{ background: '#94a3b8', minHeight: '100vh' }}>
        <MergeClient
          rawPages={rawPages}
          records={records}
          staticRecord={staticRecord}
          templateId={params.templateId}
          templateName={template.name}
          sourceId={primaryBlock.sourceId}
          table={primaryBlock.table ?? ''}
        />
      </div>
    )
  }

  if (!searchParams.sourceId || (!searchParams.table && !searchParams.query)) {
    return (
      <div style={{ background: '#1e293b', minHeight: '100vh' }}>
        <MergeSourcePicker
          templateId={params.templateId}
          templateName={template.name}
        />
      </div>
    )
  }

  const source = await prisma.dataSource.findUnique({ where: { id: searchParams.sourceId } })
  if (!source) return <div className="p-8 text-slate-500">Data source not found</div>

  const limit = Math.min(parseInt(searchParams.limit ?? '200', 10) || 200, 500)
  let records: Record<string, string>[] = []

  if (searchParams.query) {
    records = await runCustomQuery(decrypt(source.connectionUrl), searchParams.query)
  } else if (searchParams.table) {
    records = await getRecords(decrypt(source.connectionUrl), searchParams.table, limit)
  }

  return (
    <div style={{ background: '#94a3b8', minHeight: '100vh' }}>
      <MergeClient
        rawPages={rawPages}
        records={records}
        templateId={params.templateId}
        templateName={template.name}
        sourceId={searchParams.sourceId}
        table={searchParams.table}
      />
    </div>
  )
}
