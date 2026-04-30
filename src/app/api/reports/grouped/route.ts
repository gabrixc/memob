import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const groupBy = searchParams.get('groupBy') || 'business' // 'business' | 'owner'
  const status = searchParams.get('status')
  const type = searchParams.get('type')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  // Build where clause
  const where: Record<string, unknown> = {}
  if (status) where.status = status
  if (type) where.entertainmentType = type
  if (startDate || endDate) {
    where.createdAt = {}
    if (startDate) (where.createdAt as Record<string, string>).gte = new Date(startDate).toISOString()
    if (endDate) (where.createdAt as Record<string, string>).lte = new Date(endDate).toISOString()
  }

  // Fetch all applications with applicant data
  const applications = await prisma.licenseApplication.findMany({
    where,
    include: { applicant: true },
    orderBy: { createdAt: 'desc' },
  })

  // Group applications
  const grouped = new Map<string, {
    groupName: string
    ownerName: string
    nokp?: string
    location?: string
    phoneNumber?: string | null
    applications: typeof applications
    statusCounts: Record<string, number>
  }>()

  for (const app of applications) {
    const applicant = app.applicant
    const groupKey = groupBy === 'business' 
      ? applicant.namaPerniagaan.toLowerCase() 
      : applicant.fullname.toLowerCase()

    if (!grouped.has(groupKey)) {
      grouped.set(groupKey, {
        groupName: groupBy === 'business' ? applicant.namaPerniagaan : applicant.fullname,
        ownerName: applicant.fullname,
        nokp: applicant.nokp,
        location: applicant.lokasiPerniagaan,
        phoneNumber: applicant.phoneNumber,
        applications: [],
        statusCounts: {},
      })
    }

    const group = grouped.get(groupKey)!
    group.applications.push(app)

    // Count statuses
    const statusKey = app.status
    group.statusCounts[statusKey] = (group.statusCounts[statusKey] || 0) + 1
  }

  // Convert map to array and sort by total applications (descending)
  const result = Array.from(grouped.values())
    .sort((a, b) => b.applications.length - a.applications.length)

  return NextResponse.json(result)
}
