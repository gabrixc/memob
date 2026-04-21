/** @jest-environment node */
import { prisma } from '@/lib/prisma'
import { GET, POST } from '@/app/api/applications/route'
import { GET as GETOne, PATCH, DELETE } from '@/app/api/applications/[id]/route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    licenseApplication: {
      findMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    licenseApplicant: {
      findUnique: jest.fn(),
    },
  },
}))
jest.mock('@/lib/auth', () => ({
  auth: jest.fn().mockResolvedValue({ user: { email: 'admin@memo.local' } }),
}))

const idParams = { params: { id: 'app-1' } }

const mockApplicant = { id: 'appl-1', namaPerniagaan: 'Kedai Pool ABC', nokp: '800101-01-1234', fullname: 'Ahmad', lokasiPerniagaan: 'Jln ABC', phoneNumber: null, isActive: true, createdAt: new Date() }

const mockApp = {
  id: 'app-1',
  applicantId: 'appl-1',
  applicant: mockApplicant,
  district: 'MPPB',
  entertainmentType: 'pool_table',
  status: 'DALAM_PROSES',
  documents: [],
  remarks: [],
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('GET /api/applications', () => {
  it('returns list of applications', async () => {
    ;(prisma.licenseApplication.findMany as jest.Mock).mockResolvedValue([mockApp])
    const res = await GET(new NextRequest('http://localhost/api/applications'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(1)
    expect(body[0].district).toBe('MPPB')
  })

  it('filters by status when provided', async () => {
    ;(prisma.licenseApplication.findMany as jest.Mock).mockResolvedValue([])
    const res = await GET(new NextRequest('http://localhost/api/applications?status=DISOKONG'))
    expect(res.status).toBe(200)
    expect(prisma.licenseApplication.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: 'DISOKONG' }) })
    )
  })
})

describe('POST /api/applications', () => {
  it('creates an application and returns 201', async () => {
    ;(prisma.licenseApplicant.findUnique as jest.Mock).mockResolvedValue(mockApplicant)
    ;(prisma.licenseApplication.create as jest.Mock).mockResolvedValue(mockApp)
    const body = { applicantId: 'appl-1', district: 'MPPB', entertainmentType: 'pool_table', documents: [] }
    const req = new NextRequest('http://localhost', { method: 'POST', body: JSON.stringify(body) })
    const res = await POST(req)
    expect(res.status).toBe(201)
  })

  it('returns 404 if applicant not found', async () => {
    ;(prisma.licenseApplicant.findUnique as jest.Mock).mockResolvedValue(null)
    const req = new NextRequest('http://localhost', { method: 'POST', body: JSON.stringify({ applicantId: 'bad', district: 'X', entertainmentType: 'karaoke', documents: [] }) })
    const res = await POST(req)
    expect(res.status).toBe(404)
  })

  it('returns 400 if required fields missing', async () => {
    const req = new NextRequest('http://localhost', { method: 'POST', body: JSON.stringify({ applicantId: 'x' }) })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})

describe('GET /api/applications/[id]', () => {
  it('returns application with applicant', async () => {
    ;(prisma.licenseApplication.findUnique as jest.Mock).mockResolvedValue(mockApp)
    const res = await GETOne(new NextRequest('http://localhost'), idParams)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBe('app-1')
  })

  it('returns 404 if not found', async () => {
    ;(prisma.licenseApplication.findUnique as jest.Mock).mockResolvedValue(null)
    const res = await GETOne(new NextRequest('http://localhost'), idParams)
    expect(res.status).toBe(404)
  })
})

describe('PATCH /api/applications/[id]', () => {
  it('updates status and remarks', async () => {
    ;(prisma.licenseApplication.update as jest.Mock).mockResolvedValue({ ...mockApp, status: 'DISOKONG' })
    const req = new NextRequest('http://localhost', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'DISOKONG', remarks: [{ event: 'jkkn_meeting', date: '2024-03-01', decision: 'DISOKONG', remarks: '' }] }),
    })
    const res = await PATCH(req, idParams)
    expect(res.status).toBe(200)
  })
})

describe('DELETE /api/applications/[id]', () => {
  it('deletes application and returns 204', async () => {
    ;(prisma.licenseApplication.delete as jest.Mock).mockResolvedValue({})
    const res = await DELETE(new NextRequest('http://localhost'), idParams)
    expect(res.status).toBe(204)
  })
})
