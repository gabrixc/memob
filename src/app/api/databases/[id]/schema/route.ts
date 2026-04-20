import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/encrypt'
import { getTables } from '@/lib/db/introspect'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const source = await prisma.dataSource.findUnique({ where: { id: params.id } })
  if (!source) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(await getTables(decrypt(source.connectionUrl)))
}
