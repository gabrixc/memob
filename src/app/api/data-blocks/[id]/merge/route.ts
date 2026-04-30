import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/encrypt'
import { mergeSources } from '@/lib/data/mergeSources'

// POST /api/data-blocks/[id]/merge
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { limit = 100 } = body as { limit?: number }

  // Fetch data block configuration
  const dataBlock = await prisma.dataBlock.findUnique({
    where: { id: params.id },
    include: {
      primarySource: true,
      secondarySources: true,
    },
  })

  if (!dataBlock) {
    return NextResponse.json({ error: 'Data block not found' }, { status: 404 })
  }

  // Fetch data source connections
  const primarySource = await prisma.dataSource.findUnique({
    where: { id: dataBlock.primarySource.sourceId },
  })

  if (!primarySource) {
    return NextResponse.json({ error: 'Primary data source not found' }, { status: 404 })
  }

  // Build merge options
  const mergeOptions = {
    primary: {
      sourceId: dataBlock.primarySource.sourceId,
      connectionUrl: decrypt(primarySource.connectionUrl),
      type: dataBlock.primarySource.type as 'table' | 'query',
      table: dataBlock.primarySource.table ?? undefined,
      query: dataBlock.primarySource.query ?? undefined,
    },
    secondary: await Promise.all(
      dataBlock.secondarySources.map(async (sec) => {
        const source = await prisma.dataSource.findUnique({
          where: { id: sec.sourceId },
        })
        if (!source) {
          throw new Error(`Secondary source ${sec.alias} not found`)
        }
        return {
          alias: sec.alias,
          sourceId: sec.sourceId,
          connectionUrl: decrypt(source.connectionUrl),
          type: sec.type as 'table' | 'query',
          table: sec.table ?? undefined,
          query: sec.query ?? undefined,
          joinKey: sec.joinKey,
        }
      })
    ),
  }

  // Execute merge
  try {
    const records = await mergeSources(mergeOptions, limit)
    return NextResponse.json({ records, dataBlock })
  } catch (err) {
    console.error('Merge error:', err)
    return NextResponse.json(
      { error: 'Failed to merge sources', details: String(err) },
      { status: 500 }
    )
  }
}
