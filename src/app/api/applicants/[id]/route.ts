import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const applicant = await prisma.licenseApplicant.findUnique({ where: { id: params.id } })
  if (!applicant) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(applicant)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { phoneNumber, isActive } = await req.json()
  if (phoneNumber === undefined && isActive === undefined) {
    return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 })
  }
  try {
    const updated = await prisma.licenseApplicant.update({
      where: { id: params.id },
      data: {
        ...(phoneNumber !== undefined && { phoneNumber }),
        ...(isActive !== undefined && { isActive }),
      },
    })
    return NextResponse.json(updated)
  } catch (e: any) {
    if (e?.code === 'P2025') return NextResponse.json({ error: 'Not found' }, { status: 404 })
    throw e
  }
}
