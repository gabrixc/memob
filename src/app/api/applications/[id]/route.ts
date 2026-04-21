import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const app = await prisma.licenseApplication.findUnique({
    where: { id: params.id },
    include: { applicant: true },
  })
  if (!app) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(app)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { status, documents, remarks } = await req.json()
  try {
    const updated = await prisma.licenseApplication.update({
      where: { id: params.id },
      data: {
        ...(status !== undefined && { status }),
        ...(documents !== undefined && { documents }),
        ...(remarks !== undefined && { remarks }),
      },
      include: { applicant: true },
    })
    return NextResponse.json(updated)
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025')
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    throw e
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    await prisma.licenseApplication.delete({ where: { id: params.id } })
    return new NextResponse(null, { status: 204 })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025')
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    throw e
  }
}
