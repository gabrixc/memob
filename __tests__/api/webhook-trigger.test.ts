/** @jest-environment node */
import { POST } from '@/app/api/webhook/trigger/route'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    webhookConfig: { findFirst: jest.fn() },
    template: { findUnique: jest.fn() },
    dataSource: { findUnique: jest.fn() },
    exportJob: { create: jest.fn() },
  },
}))
jest.mock('@/lib/encrypt', () => ({
  encrypt: jest.fn((s: string) => s),
  decrypt: jest.fn((s: string) => s),
}))
jest.mock('@/lib/export/pdf', () => ({
  generatePdf: jest.fn().mockResolvedValue(Buffer.from('fake-pdf')),
  canvasJsonToHtml: jest.fn().mockReturnValue('<html></html>'),
}))
jest.mock('fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
}))

describe('POST /api/webhook/trigger', () => {
  it('returns 401 if bearer token is wrong', async () => {
    ;(prisma.webhookConfig.findFirst as jest.Mock).mockResolvedValue({
      inboundSecret: 'correct', outboundUrl: null, outboundEvents: [],
    })
    const req = new NextRequest('http://localhost/api/webhook/trigger', {
      method: 'POST',
      headers: { Authorization: 'Bearer wrong' },
      body: JSON.stringify({ template_id: '1', record_id: '1', format: 'pdf' }),
    })
    expect((await POST(req)).status).toBe(401)
  })

  it('returns 401 if no webhook config exists', async () => {
    ;(prisma.webhookConfig.findFirst as jest.Mock).mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/webhook/trigger', {
      method: 'POST',
      headers: { Authorization: 'Bearer anything' },
      body: JSON.stringify({ template_id: '1', record_id: '1', format: 'pdf' }),
    })
    expect((await POST(req)).status).toBe(401)
  })
})
