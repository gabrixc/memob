import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const c = await prisma.webhookConfig.findFirst()
  if (!c) return NextResponse.json(null)
  return NextResponse.json({
    id: c.id,
    inboundSecret: c.inboundSecret,
    outboundUrl: c.outboundUrl ?? '',
    outboundSecret: c.outboundSecret ?? '',
  })
}

export async function POST(req: NextRequest) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { inboundSecret, outboundUrl, outboundSecret } = await req.json()
  const data = {
    inboundSecret,
    outboundUrl: outboundUrl || null,
    outboundSecret: outboundSecret || null,
    outboundEvents: ['export.completed'],
  }
  const existing = await prisma.webhookConfig.findFirst()
  const config = existing
    ? await prisma.webhookConfig.update({ where: { id: existing.id }, data })
    : await prisma.webhookConfig.create({ data })
  return NextResponse.json(config)
}
