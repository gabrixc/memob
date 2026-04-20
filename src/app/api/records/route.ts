import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/encrypt'
import { getRecords } from '@/lib/db/records'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const sourceId = searchParams.get('sourceId')!
  const table = searchParams.get('table')!
  const source = await prisma.dataSource.findUnique({ where: { id: sourceId } })
  if (!source) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(await getRecords(decrypt(source.connectionUrl), table))
}
