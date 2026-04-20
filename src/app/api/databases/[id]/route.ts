import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await prisma.dataSource.delete({ where: { id: params.id } })
  return new NextResponse(null, { status: 204 })
}
