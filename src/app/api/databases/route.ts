import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { encrypt } from '@/lib/encrypt'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const sources = await prisma.dataSource.findMany()
  return NextResponse.json(sources.map(s => ({ id: s.id, name: s.name, createdAt: s.createdAt })))
}

export async function POST(req: NextRequest) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { name, connectionUrl } = await req.json()
  const source = await prisma.dataSource.create({
    data: { name, connectionUrl: encrypt(connectionUrl) },
  })
  return NextResponse.json({ id: source.id, name: source.name }, { status: 201 })
}
