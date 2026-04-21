import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const q = new URL(req.url).searchParams.get('q')?.trim() ?? ''
  const where = q
    ? {
        OR: [
          { fullname: { contains: q, mode: 'insensitive' as const } },
          { nokp: { contains: q, mode: 'insensitive' as const } },
          { namaPerniagaan: { contains: q, mode: 'insensitive' as const } },
        ],
      }
    : {}
  const applicants = await prisma.licenseApplicant.findMany({
    where,
    orderBy: { namaPerniagaan: 'asc' },
  })
  return NextResponse.json(applicants)
}
