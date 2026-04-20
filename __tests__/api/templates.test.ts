/** @jest-environment node */
import { prisma } from '@/lib/prisma'
import { GET, POST } from '@/app/api/templates/route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    template: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
}))
jest.mock('@/lib/auth', () => ({
  auth: jest.fn().mockResolvedValue({ user: { email: 'admin@memo.local' } }),
}))

describe('GET /api/templates', () => {
  it('returns list of templates', async () => {
    ;(prisma.template.findMany as jest.Mock).mockResolvedValue([
      { id: '1', name: 'Test', canvasJson: {}, pageSize: 'A4',
        createdAt: new Date(), updatedAt: new Date() }
    ])
    const res = await GET()
    expect(await res.json()).toHaveLength(1)
  })
})

describe('POST /api/templates', () => {
  it('creates a template and returns 201', async () => {
    const body = { name: 'New', canvasJson: {}, pageSize: 'A4' }
    ;(prisma.template.create as jest.Mock).mockResolvedValue({
      id: 'abc', ...body, createdAt: new Date(), updatedAt: new Date()
    })
    const req = new NextRequest('http://localhost/api/templates', {
      method: 'POST', body: JSON.stringify(body),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
  })
})
