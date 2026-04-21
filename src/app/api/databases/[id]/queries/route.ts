import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const source = await prisma.dataSource.findUnique({ where: { id: params.id } })
  if (!source) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const queries = await prisma.savedQuery.findMany({
    where: { dataSourceId: params.id },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(queries)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const source = await prisma.dataSource.findUnique({ where: { id: params.id } })
  if (!source) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { name, sql } = await req.json()
  if (!name?.trim() || !sql?.trim()) {
    return NextResponse.json({ error: 'name and sql are required' }, { status: 400 })
  }
  const query = await prisma.savedQuery.create({
    data: { name: name.trim(), sql: sql.trim(), dataSourceId: params.id },
  })
  return NextResponse.json(query, { status: 201 })
}
