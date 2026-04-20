import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const t = await prisma.template.findUnique({ where: { id: params.id } })
  return t ? NextResponse.json(t) : NextResponse.json({ error: 'Not found' }, { status: 404 })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { name, canvasJson, pageSize } = await req.json()
  return NextResponse.json(
    await prisma.template.update({ where: { id: params.id }, data: { name, canvasJson, pageSize } })
  )
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await prisma.template.delete({ where: { id: params.id } })
  return new NextResponse(null, { status: 204 })
}
