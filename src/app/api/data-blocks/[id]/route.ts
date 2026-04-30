import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/data-blocks/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

  return NextResponse.json(dataBlock)
}

// PUT /api/data-blocks/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { name, primarySource, secondarySources } = body as {
    name?: string
    primarySource?: {
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

  const dataBlock = await prisma.dataBlock.update({
    where: { id: params.id },
    data: {
      ...(name ? { name } : {}),
      ...(primarySource
        ? {
            primarySource: {
              update: {
                sourceId: primarySource.sourceId,
                type: primarySource.type,
                tableName: primarySource.tableName,
                query: primarySource.query,
              },
            },
          }
        : {}),
      ...(secondarySources
        ? {
            secondarySources: {
              deleteMany: {},
              create: secondarySources.map(sec => ({
                alias: sec.alias,
                sourceId: sec.sourceId,
                type: sec.type,
                tableName: sec.tableName,
                query: sec.query,
                joinKey: sec.joinKey,
              })),
            },
          }
        : {}),
    },
    include: {
      primarySource: true,
      secondarySources: true,
    },
  })

  return NextResponse.json(dataBlock)
}

// DELETE /api/data-blocks/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await prisma.dataBlock.delete({
    where: { id: params.id },
  })

  return NextResponse.json({ success: true })
}
