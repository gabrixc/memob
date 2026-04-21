import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const type = searchParams.get('type')
  const where: Prisma.LicenseApplicationWhereInput = {}
  if (status) where.status = status
  if (type) where.entertainmentType = type
  const applications = await prisma.licenseApplication.findMany({
    where,
    include: { applicant: true },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(applications)
}

export async function POST(req: NextRequest) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { applicantId, district, entertainmentType, documents } = await req.json()
  if (!applicantId || !district?.trim() || !entertainmentType?.trim()) {
    return NextResponse.json({ error: 'applicantId, district, and entertainmentType are required' }, { status: 400 })
  }
  const applicant = await prisma.licenseApplicant.findUnique({ where: { id: applicantId } })
  if (!applicant) return NextResponse.json({ error: 'Applicant not found' }, { status: 404 })
  const application = await prisma.licenseApplication.create({
    data: {
      applicantId,
      district: district.trim(),
      entertainmentType: entertainmentType.trim(),
      documents: documents ?? [],
      remarks: [],
    },
    include: { applicant: true },
  })
  return NextResponse.json(application, { status: 201 })
}
