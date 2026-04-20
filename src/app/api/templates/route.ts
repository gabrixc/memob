import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json(
    await prisma.template.findMany({ orderBy: { updatedAt: 'desc' } })
  )
}

export async function POST(req: NextRequest) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { name, canvasJson, pageSize } = await req.json()
  const template = await prisma.template.create({
    data: { name, canvasJson, pageSize: pageSize ?? 'A4' },
  })
  return NextResponse.json(template, { status: 201 })
}
