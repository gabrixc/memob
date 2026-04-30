import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/data-blocks?templateId=xxx
export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const templateId = searchParams.get('templateId')

  if (!templateId) {
    return NextResponse.json({ error: 'templateId required' }, { status: 400 })
  }

  const dataBlocks = await prisma.dataBlock.findMany({
    where: { templateId },
    include: {
      primarySource: true,
      secondarySources: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(dataBlocks)
}

// POST /api/data-blocks
export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { templateId, name, primarySource, secondarySources } = body as {
    templateId: string
    name: string
    primarySource: {
      sourceId: string
      type: 'table' | 'query'
      tableName?: string
      query?: string
    }
    secondarySources?: Array<{
      alias: string
      sourceId: string
      type: 'table' | 'query'
      tableName?: string
      query?: string
      joinKey: string
    }>
  }

  // Create data block with primary source
  const dataBlock = await prisma.dataBlock.create({
    data: {
      templateId,
      name,
      primarySource: {
        create: {
          sourceId: primarySource.sourceId,
          type: primarySource.type,
          tableName: primarySource.tableName,
          query: primarySource.query,
        },
      },
      secondarySources: secondarySources?.length
        ? {
            create: secondarySources.map(sec => ({
              alias: sec.alias,
              sourceId: sec.sourceId,
              type: sec.type,
              tableName: sec.tableName,
              query: sec.query,
              joinKey: sec.joinKey,
            })),
          }
        : undefined,
    },
    include: {
      primarySource: true,
      secondarySources: true,
    },
  })

  return NextResponse.json(dataBlock, { status: 201 })
}
