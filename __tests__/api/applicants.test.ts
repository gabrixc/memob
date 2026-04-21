/** @jest-environment node */
import { prisma } from '@/lib/prisma'
import { GET } from '@/app/api/applicants/route'
import { GET as GETOne, PATCH } from '@/app/api/applicants/[id]/route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    licenseApplicant: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}))
jest.mock('@/lib/auth', () => ({
  auth: jest.fn().mockResolvedValue({ user: { email: 'admin@memo.local' } }),
}))

const idParams = { params: { id: 'applicant-1' } }

const mockApplicant = {
  id: 'applicant-1',
  fullname: 'Ahmad bin Ali',
  nokp: '800101-01-1234',
  namaPerniagaan: 'Kedai Pool ABC',
  lokasiPerniagaan: 'No 1 Jalan Abc',
  phoneNumber: '0123456789',
  isActive: true,
  createdAt: new Date(),
}

describe('GET /api/applicants', () => {
  it('returns all active applicants when no query', async () => {
    ;(prisma.licenseApplicant.findMany as jest.Mock).mockResolvedValue([mockApplicant])
    const res = await GET(new NextRequest('http://localhost/api/applicants'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(1)
    expect(body[0].namaPerniagaan).toBe('Kedai Pool ABC')
  })

  it('searches by name when q param provided', async () => {
    ;(prisma.licenseApplicant.findMany as jest.Mock).mockResolvedValue([mockApplicant])
    const res = await GET(new NextRequest('http://localhost/api/applicants?q=Ahmad'))
    expect(res.status).toBe(200)
    expect(prisma.licenseApplicant.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ OR: expect.any(Array) }) })
    )
  })
})

describe('GET /api/applicants/[id]', () => {
  it('returns applicant by id', async () => {
    ;(prisma.licenseApplicant.findUnique as jest.Mock).mockResolvedValue(mockApplicant)
    const res = await GETOne(new NextRequest('http://localhost'), idParams)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBe('applicant-1')
  })

  it('returns 404 if not found', async () => {
    ;(prisma.licenseApplicant.findUnique as jest.Mock).mockResolvedValue(null)
    const res = await GETOne(new NextRequest('http://localhost'), idParams)
    expect(res.status).toBe(404)
  })
})

describe('PATCH /api/applicants/[id]', () => {
  it('updates phone number and isActive', async () => {
    ;(prisma.licenseApplicant.update as jest.Mock).mockResolvedValue({
      ...mockApplicant, phoneNumber: '0199999999', isActive: false,
    })
    const req = new NextRequest('http://localhost', {
      method: 'PATCH',
      body: JSON.stringify({ phoneNumber: '0199999999', isActive: false }),
    })
    const res = await PATCH(req, idParams)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.phoneNumber).toBe('0199999999')
  })
})
