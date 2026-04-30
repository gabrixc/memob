import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/encrypt'
import { getRecords } from '@/lib/db/records'

// GET /api/debug/merge?sourceId=xxx&table=pendaftar&limit=5
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sourceId = searchParams.get('sourceId')
  const table = searchParams.get('table')
  const limit = parseInt(searchParams.get('limit') || '5')

  if (!sourceId || !table) {
    return NextResponse.json({ error: 'sourceId and table required' }, { status: 400 })
  }

  const source = await prisma.dataSource.findUnique({ where: { id: sourceId } })
  if (!source) {
    return NextResponse.json({ error: 'Data source not found' }, { status: 404 })
  }

  const records = await getRecords(decrypt(source.connectionUrl), table, limit)

  return NextResponse.json({
    sourceId,
    table,
    recordCount: records.length,
    sampleRecord: records[0],
    allRecords: records,
  })
}
