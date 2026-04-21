/** @jest-environment node */
import { prisma } from '@/lib/prisma'
import { GET, POST } from '@/app/api/databases/[id]/queries/route'
import { DELETE } from '@/app/api/databases/[id]/queries/[queryId]/route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    dataSource: { findUnique: jest.fn() },
    savedQuery: {
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
  },
}))
jest.mock('@/lib/auth', () => ({
  auth: jest.fn().mockResolvedValue({ user: { email: 'admin@memo.local' } }),
}))

const params = { params: { id: 'src1' } }
const queryParams = { params: { id: 'src1', queryId: 'q1' } }

describe('GET /api/databases/[id]/queries', () => {
  it('returns saved queries for a data source', async () => {
    ;(prisma.dataSource.findUnique as jest.Mock).mockResolvedValue({ id: 'src1' })
    ;(prisma.savedQuery.findMany as jest.Mock).mockResolvedValue([
      { id: 'q1', name: 'My Query', sql: 'SELECT 1', dataSourceId: 'src1', createdAt: new Date() },
    ])
    const res = await GET(new NextRequest('http://localhost'), params)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body).toHaveLength(1)
    expect(body[0].name).toBe('My Query')
  })

  it('returns 404 if data source not found', async () => {
    ;(prisma.dataSource.findUnique as jest.Mock).mockResolvedValue(null)
    const res = await GET(new NextRequest('http://localhost'), params)
    expect(res.status).toBe(404)
  })
})

describe('POST /api/databases/[id]/queries', () => {
  it('creates and returns a saved query', async () => {
    ;(prisma.dataSource.findUnique as jest.Mock).mockResolvedValue({ id: 'src1' })
    const body = { name: 'Filter', sql: 'SELECT * FROM records WHERE status = \'active\'' }
    ;(prisma.savedQuery.create as jest.Mock).mockResolvedValue({
      id: 'q2', ...body, dataSourceId: 'src1', createdAt: new Date(),
    })
    const req = new NextRequest('http://localhost', { method: 'POST', body: JSON.stringify(body) })
    const res = await POST(req, params)
    expect(res.status).toBe(201)
    const saved = await res.json()
    expect(saved.name).toBe('Filter')
  })

  it('returns 400 if name or sql is missing', async () => {
    ;(prisma.dataSource.findUnique as jest.Mock).mockResolvedValue({ id: 'src1' })
    const req = new NextRequest('http://localhost', { method: 'POST', body: JSON.stringify({ name: '' }) })
    const res = await POST(req, params)
    expect(res.status).toBe(400)
  })
})

describe('DELETE /api/databases/[id]/queries/[queryId]', () => {
  it('deletes the query and returns 204', async () => {
    ;(prisma.savedQuery.delete as jest.Mock).mockResolvedValue({})
    const req = new NextRequest('http://localhost', { method: 'DELETE' })
    const res = await DELETE(req, queryParams)
    expect(res.status).toBe(204)
  })
})
