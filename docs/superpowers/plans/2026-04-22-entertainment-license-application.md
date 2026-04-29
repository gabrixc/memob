# Entertainment License Application System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a data entry and tracking portal inside Memo Builder where NSC Johor staff can record entertainment license applications from businesses (linked to `pendaftar` data), track their 5-stage workflow, and view status.

**Architecture:** New Prisma models (`LicenseApplicant` seeded from `pendaftar`, `LicenseApplication`), REST API routes at `/api/applicants` and `/api/applications`, and Next.js App Router pages at `/applicants` and `/applications`. Pages follow the existing settings-page pattern: Server Component auth guard + 'use client' data components. Timeline stages stored as JSON in the `remarks` column.

**Tech Stack:** Next.js 14 App Router, Prisma 5, PostgreSQL, React state hooks, Tailwind CSS, Jest + ts-jest

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `prisma/schema.prisma` | Add LicenseApplicant + LicenseApplication models |
| Create | `prisma/migrations/…/migration.sql` | Auto-generated tables + data seed from pendaftar |
| Create | `src/app/api/applicants/route.ts` | GET list (search) |
| Create | `src/app/api/applicants/[id]/route.ts` | GET single + PATCH |
| Create | `src/app/api/applications/route.ts` | GET list + POST create |
| Create | `src/app/api/applications/[id]/route.ts` | GET single + PATCH + DELETE |
| Create | `src/components/applications/StatusBadge.tsx` | Status colour badge |
| Create | `src/app/applications/page.tsx` | Server Component shell |
| Create | `src/app/applications/ApplicationsClient.tsx` | Client list + filters |
| Create | `src/app/applications/new/page.tsx` | Server Component shell |
| Create | `src/app/applications/new/NewApplicationClient.tsx` | 2-step form |
| Create | `src/app/applications/[id]/page.tsx` | Server Component shell |
| Create | `src/app/applications/[id]/ApplicationDetailClient.tsx` | Detail + timeline editor |
| Create | `src/app/applicants/page.tsx` | Server Component shell |
| Create | `src/app/applicants/ApplicantsClient.tsx` | Applicant list |
| Create | `src/app/applicants/[id]/edit/page.tsx` | Server Component shell |
| Create | `src/app/applicants/[id]/edit/EditApplicantClient.tsx` | Edit phone + is_active |
| Modify | `src/components/editor/TopBar.tsx` | Add "Permohonan" nav link |
| Create | `__tests__/api/applicants.test.ts` | Tests for applicants API |
| Create | `__tests__/api/applications.test.ts` | Tests for applications API |

---

## Task 1: Prisma Schema — LicenseApplicant + LicenseApplication

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add the two models**

Open `prisma/schema.prisma` and append after the last existing model:

```prisma
model LicenseApplicant {
  id               String               @id @default(uuid())
  fullname         String
  nokp             String               @unique
  namaPerniagaan   String               @map("nama_perniagaan")
  lokasiPerniagaan String               @map("lokasi_perniagaan")
  phoneNumber      String?              @map("phone_number")
  isActive         Boolean              @default(true) @map("is_active")
  createdAt        DateTime             @default(now()) @map("created_at")
  applications     LicenseApplication[]

  @@map("license_applicants")
}

model LicenseApplication {
  id                String           @id @default(uuid())
  applicantId       String           @map("applicant_id")
  applicant         LicenseApplicant @relation(fields: [applicantId], references: [id])
  district          String
  entertainmentType String           @map("entertainment_type")
  status            String           @default("DALAM_PROSES")
  documents         Json             @default("[]")
  remarks           Json             @default("[]")
  createdAt         DateTime         @default(now()) @map("created_at")
  updatedAt         DateTime         @updatedAt @map("updated_at")

  @@map("license_applications")
}
```

- [ ] **Step 2: Create the migration manually**

Create directory and file:

```bash
mkdir -p /home/faizalamat/memo-builder/prisma/migrations/20260422000001_add_license_tables
```

Create `prisma/migrations/20260422000001_add_license_tables/migration.sql`:

```sql
CREATE TABLE "license_applicants" (
    "id" UUID NOT NULL,
    "fullname" VARCHAR NOT NULL,
    "nokp" VARCHAR NOT NULL,
    "nama_perniagaan" VARCHAR NOT NULL,
    "lokasi_perniagaan" TEXT NOT NULL,
    "phone_number" VARCHAR,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "license_applicants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "license_applicants_nokp_key" ON "license_applicants"("nokp");

CREATE TABLE "license_applications" (
    "id" UUID NOT NULL,
    "applicant_id" UUID NOT NULL,
    "district" VARCHAR NOT NULL,
    "entertainment_type" VARCHAR NOT NULL,
    "status" VARCHAR NOT NULL DEFAULT 'DALAM_PROSES',
    "documents" JSONB NOT NULL DEFAULT '[]',
    "remarks" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "license_applications_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "license_applications"
    ADD CONSTRAINT "license_applications_applicant_id_fkey"
    FOREIGN KEY ("applicant_id") REFERENCES "license_applicants"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed from existing pendaftar table
INSERT INTO "license_applicants" ("id", "fullname", "nokp", "nama_perniagaan", "lokasi_perniagaan", "is_active", "created_at")
SELECT "id", "fullname", "nokp", "nama_perniagaan", "lokasi_perniagaan", true, "created_at"
FROM "pendaftar"
ON CONFLICT ("nokp") DO NOTHING;
```

- [ ] **Step 3: Apply migration**

```bash
cd /home/faizalamat/memo-builder
npx prisma migrate deploy
```

Expected: `1 migration applied` (the new migration only).

- [ ] **Step 4: Verify tables and seeded data**

```bash
node -e "
const { Client } = require('pg');
const c = new Client({ connectionString: 'postgresql://rbjen_user:rbjen_password@localhost:5432/memo_builder' });
c.connect().then(() => c.query('SELECT COUNT(*) FROM license_applicants')).then(r => { console.log('applicants:', r.rows[0].count); return c.query('SELECT COUNT(*) FROM license_applications'); }).then(r => { console.log('applications:', r.rows[0].count); c.end(); });
"
```

Expected: `applicants: 2` (matching pendaftar row count), `applications: 0`

- [ ] **Step 5: Regenerate Prisma client**

```bash
npx prisma generate
```

Expected: Client updated with `licenseApplicant` and `licenseApplication` properties.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add LicenseApplicant and LicenseApplication Prisma models"
```

---

## Task 2: Applicants API Routes + Tests

**Files:**
- Create: `src/app/api/applicants/route.ts`
- Create: `src/app/api/applicants/[id]/route.ts`
- Create: `__tests__/api/applicants.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/api/applicants.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /home/faizalamat/memo-builder
npx jest __tests__/api/applicants.test.ts --no-coverage
```

Expected: FAIL — routes not found.

- [ ] **Step 3: Create GET /api/applicants**

Create `src/app/api/applicants/route.ts`:

```typescript
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
```

- [ ] **Step 4: Create GET + PATCH /api/applicants/[id]**

Create `src/app/api/applicants/[id]/route.ts`:

```typescript
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
  const updated = await prisma.licenseApplicant.update({
    where: { id: params.id },
    data: {
      ...(phoneNumber !== undefined && { phoneNumber }),
      ...(isActive !== undefined && { isActive }),
    },
  })
  return NextResponse.json(updated)
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx jest __tests__/api/applicants.test.ts --no-coverage
```

Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add src/app/api/applicants/ __tests__/api/applicants.test.ts
git commit -m "feat: add applicants API routes"
```

---

## Task 3: Applications API Routes + Tests

**Files:**
- Create: `src/app/api/applications/route.ts`
- Create: `src/app/api/applications/[id]/route.ts`
- Create: `__tests__/api/applications.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/api/applications.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest __tests__/api/applications.test.ts --no-coverage
```

Expected: FAIL — routes not found.

- [ ] **Step 3: Create GET + POST /api/applications**

Create `src/app/api/applications/route.ts`:

```typescript
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const type = searchParams.get('type')
  const where: Record<string, string> = {}
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
```

- [ ] **Step 4: Create GET + PATCH + DELETE /api/applications/[id]**

Create `src/app/api/applications/[id]/route.ts`:

```typescript
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const app = await prisma.licenseApplication.findUnique({
    where: { id: params.id },
    include: { applicant: true },
  })
  if (!app) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(app)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { status, documents, remarks } = await req.json()
  const updated = await prisma.licenseApplication.update({
    where: { id: params.id },
    data: {
      ...(status !== undefined && { status }),
      ...(documents !== undefined && { documents }),
      ...(remarks !== undefined && { remarks }),
    },
    include: { applicant: true },
  })
  return NextResponse.json(updated)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await prisma.licenseApplication.delete({ where: { id: params.id } })
  return new NextResponse(null, { status: 204 })
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx jest __tests__/api/applications.test.ts --no-coverage
```

Expected: PASS (7 tests).

- [ ] **Step 6: Run all tests to verify no regressions**

```bash
npx jest --no-coverage
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/app/api/applications/ __tests__/api/applications.test.ts
git commit -m "feat: add applications API routes"
```

---

## Task 4: StatusBadge + Applications List Page

**Files:**
- Create: `src/components/applications/StatusBadge.tsx`
- Create: `src/app/applications/page.tsx`
- Create: `src/app/applications/ApplicationsClient.tsx`

- [ ] **Step 1: Create StatusBadge component**

Create `src/components/applications/StatusBadge.tsx`:

```typescript
const COLOURS: Record<string, string> = {
  DALAM_PROSES:      'bg-blue-100 text-blue-700',
  DISOKONG:          'bg-green-100 text-green-700',
  TIDAK_DISOKONG:    'bg-red-100 text-red-700',
  TANGGUH:           'bg-orange-100 text-orange-700',
  KIV:               'bg-yellow-100 text-yellow-700',
  TIADA_KEPUTUSAN:   'bg-slate-100 text-slate-600',
  TIDAK_DITERUSKAN:  'bg-slate-200 text-slate-500',
}

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${COLOURS[status] ?? 'bg-slate-100 text-slate-600'}`}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}
```

- [ ] **Step 2: Create applications list client component**

Create `src/app/applications/ApplicationsClient.tsx`:

```typescript
'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import StatusBadge from '@/components/applications/StatusBadge'

interface Applicant { id: string; namaPerniagaan: string; fullname: string }
interface Application {
  id: string; applicantId: string; applicant: Applicant
  district: string; entertainmentType: string; status: string; createdAt: string
}

const STATUSES = ['DALAM_PROSES','DISOKONG','TIDAK_DISOKONG','TANGGUH','KIV','TIADA_KEPUTUSAN','TIDAK_DITERUSKAN']
const TYPES = ['pool_table','billiard','snooker','live_band','karaoke','video_games','cinema']

export default function ApplicationsClient() {
  const [apps, setApps] = useState<Application[]>([])
  const [status, setStatus] = useState('')
  const [type, setType] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    if (type) params.set('type', type)
    setLoading(true)
    fetch(`/api/applications?${params}`).then(r => r.json()).then(data => {
      setApps(data)
      setLoading(false)
    })
  }, [status, type])

  return (
    <div>
      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <select value={status} onChange={e => setStatus(e.target.value)}
          className="border border-slate-300 rounded px-2 py-1.5 text-sm bg-white">
          <option value="">Semua Status</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
        <select value={type} onChange={e => setType(e.target.value)}
          className="border border-slate-300 rounded px-2 py-1.5 text-sm bg-white">
          <option value="">Semua Jenis</option>
          {TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
        </select>
        <Link href="/applications/new"
          className="ml-auto bg-sky-600 hover:bg-sky-700 text-white px-4 py-1.5 rounded text-sm">
          + Permohonan Baharu
        </Link>
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-slate-400 text-sm py-8 text-center">Memuatkan…</p>
      ) : apps.length === 0 ? (
        <p className="text-slate-400 text-sm py-8 text-center">Tiada permohonan ditemui.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500 uppercase tracking-wide">
                <th className="py-2 pr-4">Perniagaan</th>
                <th className="py-2 pr-4">Jenis Hiburan</th>
                <th className="py-2 pr-4">Daerah</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Tarikh</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {apps.map(app => (
                <tr key={app.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-2.5 pr-4">
                    <div className="font-medium text-slate-800">{app.applicant.namaPerniagaan}</div>
                    <div className="text-xs text-slate-400">{app.applicant.fullname}</div>
                  </td>
                  <td className="py-2.5 pr-4 text-slate-600">{app.entertainmentType.replace(/_/g, ' ')}</td>
                  <td className="py-2.5 pr-4 text-slate-600">{app.district}</td>
                  <td className="py-2.5 pr-4"><StatusBadge status={app.status} /></td>
                  <td className="py-2.5 pr-4 text-slate-400 text-xs">{new Date(app.createdAt).toLocaleDateString('ms-MY')}</td>
                  <td className="py-2.5">
                    <Link href={`/applications/${app.id}`}
                      className="text-sky-600 hover:text-sky-800 text-xs">
                      Butiran →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create applications list page (server shell)**

Create `src/app/applications/page.tsx`:

```typescript
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ApplicationsClient from './ApplicationsClient'

export const metadata = { title: 'Permohonan Lesen — Memo Builder' }

export default async function ApplicationsPage() {
  if (!await auth()) redirect('/login')
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Permohonan Lesen Hiburan</h1>
            <p className="text-sm text-slate-500 mt-0.5">Rekod permohonan lesen hiburan dari daerah</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/applicants" className="text-sm text-slate-500 hover:text-slate-700">Pemohon</Link>
            <a href="/" className="text-sm text-sky-600 hover:text-sky-700 font-medium">← Editor</a>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <ApplicationsClient />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Start dev server and verify page loads**

```bash
npm run dev
```

Open `http://localhost:3000/applications` — expect to see the page with empty table and filters.

- [ ] **Step 5: Commit**

```bash
git add src/components/applications/ src/app/applications/page.tsx src/app/applications/ApplicationsClient.tsx
git commit -m "feat: add applications list page with status/type filters"
```

---

## Task 5: New Application Form

**Files:**
- Create: `src/app/applications/new/page.tsx`
- Create: `src/app/applications/new/NewApplicationClient.tsx`

- [ ] **Step 1: Create the new application client component**

Create `src/app/applications/new/NewApplicationClient.tsx`:

```typescript
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Applicant {
  id: string; fullname: string; nokp: string
  namaPerniagaan: string; lokasiPerniagaan: string; isActive: boolean
}

interface Document { name: string; type: string; submitted_at: string }

const TYPES = ['pool_table','billiard','snooker','live_band','karaoke','video_games','cinema']

export default function NewApplicationClient() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2>(1)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Applicant[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<Applicant | null>(null)

  // Step 2 fields
  const [district, setDistrict] = useState('')
  const [entertainmentType, setEntertainmentType] = useState('')
  const [documents, setDocuments] = useState<Document[]>([])
  const [docName, setDocName] = useState('')
  const [docType, setDocType] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSearch() {
    if (!query.trim()) return
    setSearching(true)
    const data = await fetch(`/api/applicants?q=${encodeURIComponent(query)}`).then(r => r.json())
    setResults(data)
    setSearching(false)
  }

  function selectApplicant(a: Applicant) {
    setSelected(a)
    setStep(2)
  }

  function addDocument() {
    if (!docName.trim() || !docType.trim()) return
    const today = new Date().toISOString().split('T')[0]
    setDocuments(prev => [...prev, { name: docName.trim(), type: docType.trim(), submitted_at: today }])
    setDocName(''); setDocType('')
  }

  function removeDocument(i: number) {
    setDocuments(prev => prev.filter((_, idx) => idx !== i))
  }

  async function handleSubmit() {
    setError('')
    if (!selected || !district.trim() || !entertainmentType) {
      setError('Sila lengkapkan semua maklumat.')
      return
    }
    setSaving(true)
    const res = await fetch('/api/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicantId: selected.id, district, entertainmentType, documents }),
    })
    if (!res.ok) {
      const d = await res.json()
      setError(d.error ?? 'Gagal menyimpan.')
      setSaving(false)
      return
    }
    const app = await res.json()
    router.push(`/applications/${app.id}`)
  }

  if (step === 1) return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-700">Langkah 1: Cari Pemohon</h2>
      <div className="flex gap-2">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="Cari nama perniagaan, nama atau NoKP…"
          className="flex-1 border border-slate-300 rounded px-3 py-2 text-sm"
        />
        <button onClick={handleSearch} disabled={searching}
          className="bg-sky-600 text-white px-4 py-2 rounded text-sm hover:bg-sky-700 disabled:opacity-50">
          {searching ? 'Mencari…' : 'Cari'}
        </button>
      </div>
      {results.length > 0 && (
        <table className="w-full text-sm border border-slate-200 rounded">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left px-3 py-2 text-xs text-slate-500">Perniagaan</th>
              <th className="text-left px-3 py-2 text-xs text-slate-500">Pemilik</th>
              <th className="text-left px-3 py-2 text-xs text-slate-500">NoKP</th>
              <th className="text-left px-3 py-2 text-xs text-slate-500">Lokasi</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {results.map(a => (
              <tr key={a.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-3 py-2 font-medium">{a.namaPerniagaan}</td>
                <td className="px-3 py-2">{a.fullname}</td>
                <td className="px-3 py-2 font-mono text-xs">{a.nokp}</td>
                <td className="px-3 py-2 text-slate-400 text-xs">{a.lokasiPerniagaan}</td>
                <td className="px-3 py-2">
                  <button onClick={() => selectApplicant(a)}
                    className="text-sky-600 hover:text-sky-800 text-xs font-medium">
                    Pilih →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {results.length === 0 && query && !searching && (
        <p className="text-slate-400 text-sm">Tiada rekod ditemui.</p>
      )}
    </div>
  )

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-slate-700">Langkah 2: Butiran Permohonan</h2>

      {/* Selected applicant card */}
      <div className="bg-slate-50 border border-slate-200 rounded p-4 text-sm">
        <div className="font-semibold text-slate-800">{selected!.namaPerniagaan}</div>
        <div className="text-slate-500">{selected!.fullname} · {selected!.nokp}</div>
        <div className="text-slate-400 text-xs mt-0.5">{selected!.lokasiPerniagaan}</div>
        <button onClick={() => { setSelected(null); setStep(1) }}
          className="text-xs text-sky-600 hover:underline mt-2">← Tukar pemohon</button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Daerah / Majlis</label>
          <input value={district} onChange={e => setDistrict(e.target.value)}
            placeholder="cth. Majlis Perbandaran Batu Pahat"
            className="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Jenis Hiburan</label>
          <select value={entertainmentType} onChange={e => setEntertainmentType(e.target.value)}
            className="w-full border border-slate-300 rounded px-3 py-2 text-sm bg-white">
            <option value="">-- Pilih jenis --</option>
            {TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
      </div>

      {/* Documents */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-2">Dokumen Sokongan</label>
        {documents.length > 0 && (
          <ul className="mb-2 space-y-1">
            {documents.map((d, i) => (
              <li key={i} className="flex items-center justify-between text-sm bg-slate-50 border border-slate-200 rounded px-3 py-1.5">
                <span>{d.name} <span className="text-slate-400 text-xs">({d.type})</span></span>
                <button onClick={() => removeDocument(i)} className="text-red-400 hover:text-red-600 text-xs">Buang</button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-2">
          <input value={docName} onChange={e => setDocName(e.target.value)}
            placeholder="Nama dokumen"
            className="flex-1 border border-slate-300 rounded px-2 py-1.5 text-sm" />
          <input value={docType} onChange={e => setDocType(e.target.value)}
            placeholder="Jenis"
            className="w-32 border border-slate-300 rounded px-2 py-1.5 text-sm" />
          <button onClick={addDocument}
            className="border border-slate-300 rounded px-3 py-1.5 text-sm hover:bg-slate-50">+ Tambah</button>
        </div>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="flex justify-end gap-3">
        <button onClick={() => setStep(1)}
          className="border border-slate-300 rounded px-4 py-2 text-sm hover:bg-slate-50">Kembali</button>
        <button onClick={handleSubmit} disabled={saving}
          className="bg-sky-600 text-white rounded px-4 py-2 text-sm hover:bg-sky-700 disabled:opacity-50">
          {saving ? 'Menyimpan…' : 'Simpan Permohonan'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create new application page (server shell)**

Create `src/app/applications/new/page.tsx`:

```typescript
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import NewApplicationClient from './NewApplicationClient'

export const metadata = { title: 'Permohonan Baharu — Memo Builder' }

export default async function NewApplicationPage() {
  if (!await auth()) redirect('/login')
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Permohonan Baharu</h1>
            <p className="text-sm text-slate-500 mt-0.5">Daftar permohonan lesen hiburan</p>
          </div>
          <Link href="/applications" className="text-sm text-sky-600 hover:text-sky-700 font-medium">← Senarai</Link>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <NewApplicationClient />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Test the form in browser**

Visit `http://localhost:3000/applications/new`. Verify:
- Search field queries `/api/applicants?q=` and shows results
- Selecting a record advances to Step 2
- Saving redirects to `/applications/{id}`

- [ ] **Step 4: Commit**

```bash
git add src/app/applications/new/
git commit -m "feat: add new application 2-step form"
```

---

## Task 6: Application Detail + Timeline Editor

**Files:**
- Create: `src/app/applications/[id]/page.tsx`
- Create: `src/app/applications/[id]/ApplicationDetailClient.tsx`

- [ ] **Step 1: Create the detail client component**

Create `src/app/applications/[id]/ApplicationDetailClient.tsx`:

```typescript
'use client'
import { useEffect, useState } from 'react'
import StatusBadge from '@/components/applications/StatusBadge'

interface Applicant {
  id: string; fullname: string; nokp: string
  namaPerniagaan: string; lokasiPerniagaan: string; phoneNumber: string | null
}
interface Document { name: string; type: string; submitted_at: string }
interface RemarkEvent { event: string; [key: string]: string }
interface Application {
  id: string; district: string; entertainmentType: string; status: string
  applicant: Applicant; documents: Document[]; remarks: RemarkEvent[]
  createdAt: string; updatedAt: string
}

const STAGES = [
  { key: 'district_received', label: 'Surat Diterima dari Daerah',
    fields: [
      { name: 'date', label: 'Tarikh Surat', type: 'date' },
      { name: 'reference_no', label: 'No. Rujukan Surat', type: 'text' },
      { name: 'letter_title', label: 'Tajuk Surat', type: 'text' },
    ]},
  { key: 'jkkd_meeting', label: 'Mesyuarat JKKD (Daerah)',
    fields: [
      { name: 'date', label: 'Tarikh Mesyuarat', type: 'date' },
      { name: 'decision', label: 'Keputusan', type: 'select', options: ['DISOKONG','TIDAK_DISOKONG','KIV'] },
      { name: 'notes', label: 'Catatan', type: 'textarea' },
    ]},
  { key: 'nsc_file_opened', label: 'Fail Dibuka NSC Johor',
    fields: [
      { name: 'date', label: 'Tarikh Fail Dibuka', type: 'date' },
      { name: 'internal_ref', label: 'No. Rujukan NSC', type: 'text' },
    ]},
  { key: 'site_visit', label: 'Lawatan Tapak',
    fields: [
      { name: 'date', label: 'Tarikh Lawatan', type: 'date' },
      { name: 'notes', label: 'Pemerhatian / Catatan', type: 'textarea' },
    ]},
  { key: 'jkkn_meeting', label: 'Mesyuarat JKKN (Negeri)',
    fields: [
      { name: 'date', label: 'Tarikh Mesyuarat', type: 'date' },
      { name: 'decision', label: 'Keputusan', type: 'select', options: ['DISOKONG','TIDAK_DISOKONG','TANGGUH','KIV','TIADA_KEPUTUSAN','TIDAK_DITERUSKAN'] },
      { name: 'remarks', label: 'Ulasan / Endorsemen', type: 'textarea' },
    ]},
]

function StageCard({
  stage, event, onSave,
}: {
  stage: typeof STAGES[0]
  event: RemarkEvent | undefined
  onSave: (key: string, data: RemarkEvent) => void
}) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<RemarkEvent>({ event: stage.key, ...(event ?? {}) })

  function handleSave() {
    onSave(stage.key, form)
    setEditing(false)
  }

  const isFilled = !!event?.date

  return (
    <div className={`border rounded-lg p-4 ${isFilled ? 'border-green-200 bg-green-50' : 'border-slate-200 bg-white'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isFilled ? 'bg-green-500' : 'bg-slate-300'}`} />
          <span className="font-medium text-sm text-slate-700">{stage.label}</span>
        </div>
        <button onClick={() => setEditing(e => !e)}
          className="text-xs text-sky-600 hover:text-sky-800">
          {editing ? 'Tutup' : isFilled ? 'Kemaskini' : 'Isi'}
        </button>
      </div>

      {!editing && isFilled && (
        <div className="text-xs text-slate-600 space-y-0.5">
          {stage.fields.map(f => event[f.name] ? (
            <div key={f.name}><span className="text-slate-400">{f.label}: </span>{event[f.name]}</div>
          ) : null)}
        </div>
      )}

      {!editing && !isFilled && (
        <p className="text-xs text-slate-400 italic">Belum diisi</p>
      )}

      {editing && (
        <div className="space-y-2 mt-2">
          {stage.fields.map(f => (
            <div key={f.name}>
              <label className="block text-xs font-medium text-slate-500 mb-0.5">{f.label}</label>
              {f.type === 'textarea' ? (
                <textarea value={form[f.name] ?? ''} rows={3}
                  onChange={e => setForm(prev => ({ ...prev, [f.name]: e.target.value }))}
                  className="w-full border border-slate-300 rounded px-2 py-1 text-xs resize-y" />
              ) : f.type === 'select' ? (
                <select value={form[f.name] ?? ''} onChange={e => setForm(prev => ({ ...prev, [f.name]: e.target.value }))}
                  className="w-full border border-slate-300 rounded px-2 py-1 text-xs bg-white">
                  <option value="">-- Pilih --</option>
                  {f.options!.map(o => <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>)}
                </select>
              ) : (
                <input type={f.type} value={form[f.name] ?? ''}
                  onChange={e => setForm(prev => ({ ...prev, [f.name]: e.target.value }))}
                  className="w-full border border-slate-300 rounded px-2 py-1 text-xs" />
              )}
            </div>
          ))}
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => setEditing(false)}
              className="text-xs border border-slate-300 rounded px-3 py-1 hover:bg-slate-50">Batal</button>
            <button onClick={handleSave}
              className="text-xs bg-sky-600 text-white rounded px-3 py-1 hover:bg-sky-700">Simpan</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ApplicationDetailClient({ id }: { id: string }) {
  const [app, setApp] = useState<Application | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch(`/api/applications/${id}`).then(r => r.json()).then(setApp)
  }, [id])

  async function handleStageSave(stageKey: string, data: RemarkEvent) {
    if (!app) return
    setSaving(true)
    // Replace or append the event for this stage key
    const updated = app.remarks.filter(r => r.event !== stageKey)
    updated.push(data)

    const newStatus = stageKey === 'jkkn_meeting' && data.decision
      ? data.decision : app.status

    const res = await fetch(`/api/applications/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ remarks: updated, status: newStatus }),
    })
    if (res.ok) {
      const saved = await res.json()
      setApp(saved)
    }
    setSaving(false)
  }

  if (!app) return <p className="text-slate-400 text-sm py-8 text-center">Memuatkan…</p>

  const eventMap = Object.fromEntries(app.remarks.map(r => [r.event, r]))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">{app.applicant.namaPerniagaan}</h2>
          <p className="text-sm text-slate-500">{app.applicant.fullname} · {app.applicant.nokp}</p>
          <p className="text-xs text-slate-400 mt-0.5">{app.applicant.lokasiPerniagaan}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-sm text-slate-600">{app.entertainmentType.replace(/_/g, ' ')}</span>
            <span className="text-slate-300">·</span>
            <span className="text-sm text-slate-600">{app.district}</span>
          </div>
        </div>
        <div className="text-right">
          <StatusBadge status={app.status} />
          {saving && <p className="text-xs text-slate-400 mt-1">Menyimpan…</p>}
        </div>
      </div>

      {/* Documents */}
      {app.documents.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Dokumen Sokongan</h3>
          <ul className="space-y-1">
            {app.documents.map((d, i) => (
              <li key={i} className="text-sm text-slate-600">
                {d.name} <span className="text-slate-400 text-xs">({d.type}) — {d.submitted_at}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Timeline */}
      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Garis Masa Proses</h3>
        <div className="space-y-3">
          {STAGES.map(stage => (
            <StageCard
              key={stage.key}
              stage={stage}
              event={eventMap[stage.key]}
              onSave={handleStageSave}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create detail page server shell**

Create `src/app/applications/[id]/page.tsx`:

```typescript
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ApplicationDetailClient from './ApplicationDetailClient'

export default async function ApplicationDetailPage({ params }: { params: { id: string } }) {
  if (!await auth()) redirect('/login')
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <Link href="/applications" className="text-sm text-sky-600 hover:text-sky-700 font-medium">← Senarai Permohonan</Link>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <ApplicationDetailClient id={params.id} />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Test detail page in browser**

Create a test application via `/applications/new`, then open the detail page. Verify:
- Header shows business name, status badge
- All 5 stage cards appear with "Belum diisi"
- Filling Stage 1 and saving → card shows filled values with green dot
- Saving Stage 5 (JKKN) with decision "DISOKONG" → status badge at top updates to DISOKONG

- [ ] **Step 4: Commit**

```bash
git add src/app/applications/[id]/
git commit -m "feat: add application detail page with 5-stage timeline editor"
```

---

## Task 7: Applicants Management Pages

**Files:**
- Create: `src/app/applicants/page.tsx`
- Create: `src/app/applicants/ApplicantsClient.tsx`
- Create: `src/app/applicants/[id]/edit/page.tsx`
- Create: `src/app/applicants/[id]/edit/EditApplicantClient.tsx`

- [ ] **Step 1: Create applicants list client**

Create `src/app/applicants/ApplicantsClient.tsx`:

```typescript
'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Applicant {
  id: string; fullname: string; nokp: string
  namaPerniagaan: string; lokasiPerniagaan: string
  phoneNumber: string | null; isActive: boolean; createdAt: string
}

export default function ApplicantsClient() {
  const [applicants, setApplicants] = useState<Applicant[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const params = query ? `?q=${encodeURIComponent(query)}` : ''
    setLoading(true)
    fetch(`/api/applicants${params}`).then(r => r.json()).then(data => {
      setApplicants(data)
      setLoading(false)
    })
  }, [query])

  return (
    <div>
      <div className="mb-4">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Cari nama, NoKP atau perniagaan…"
          className="w-72 border border-slate-300 rounded px-3 py-1.5 text-sm"
        />
      </div>
      {loading ? (
        <p className="text-slate-400 text-sm py-8 text-center">Memuatkan…</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs text-slate-500 uppercase tracking-wide">
              <th className="py-2 pr-4">Perniagaan</th>
              <th className="py-2 pr-4">Pemilik</th>
              <th className="py-2 pr-4">NoKP</th>
              <th className="py-2 pr-4">Telefon</th>
              <th className="py-2 pr-4">Aktif</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {applicants.map(a => (
              <tr key={a.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-2.5 pr-4 font-medium text-slate-800">{a.namaPerniagaan}</td>
                <td className="py-2.5 pr-4">{a.fullname}</td>
                <td className="py-2.5 pr-4 font-mono text-xs">{a.nokp}</td>
                <td className="py-2.5 pr-4 text-slate-500">{a.phoneNumber ?? '—'}</td>
                <td className="py-2.5 pr-4">
                  <span className={`text-xs font-medium ${a.isActive ? 'text-green-600' : 'text-slate-400'}`}>
                    {a.isActive ? 'Aktif' : 'Tidak Aktif'}
                  </span>
                </td>
                <td className="py-2.5">
                  <Link href={`/applicants/${a.id}/edit`}
                    className="text-sky-600 hover:text-sky-800 text-xs">Edit</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create applicants list page**

Create `src/app/applicants/page.tsx`:

```typescript
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ApplicantsClient from './ApplicantsClient'

export const metadata = { title: 'Pemohon — Memo Builder' }

export default async function ApplicantsPage() {
  if (!await auth()) redirect('/login')
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Senarai Pemohon</h1>
            <p className="text-sm text-slate-500 mt-0.5">Rekod perniagaan yang berdaftar</p>
          </div>
          <Link href="/applications" className="text-sm text-sky-600 hover:text-sky-700 font-medium">← Permohonan</Link>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <ApplicantsClient />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create edit applicant client**

Create `src/app/applicants/[id]/edit/EditApplicantClient.tsx`:

```typescript
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Applicant {
  id: string; fullname: string; nokp: string
  namaPerniagaan: string; lokasiPerniagaan: string
  phoneNumber: string | null; isActive: boolean
}

export default function EditApplicantClient({ id }: { id: string }) {
  const router = useRouter()
  const [applicant, setApplicant] = useState<Applicant | null>(null)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/applicants/${id}`).then(r => r.json()).then((a: Applicant) => {
      setApplicant(a)
      setPhoneNumber(a.phoneNumber ?? '')
      setIsActive(a.isActive)
    })
  }, [id])

  async function handleSave() {
    setError('')
    setSaving(true)
    const res = await fetch(`/api/applicants/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: phoneNumber.trim() || null, isActive }),
    })
    if (!res.ok) {
      setError('Gagal menyimpan.')
      setSaving(false)
      return
    }
    router.push('/applicants')
  }

  if (!applicant) return <p className="text-slate-400 text-sm py-8 text-center">Memuatkan…</p>

  return (
    <div className="space-y-5">
      <div className="bg-slate-50 border border-slate-200 rounded p-4 text-sm">
        <div className="font-semibold text-slate-800">{applicant.namaPerniagaan}</div>
        <div className="text-slate-500">{applicant.fullname} · {applicant.nokp}</div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">No. Telefon</label>
          <input value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)}
            placeholder="cth. 0123456789"
            className="w-64 border border-slate-300 rounded px-3 py-2 text-sm" />
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-slate-700">Status Perniagaan</label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)}
              className="w-4 h-4 accent-sky-600" />
            <span className="text-sm text-slate-600">{isActive ? 'Aktif' : 'Tidak Aktif'}</span>
          </label>
        </div>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="flex gap-3">
        <button onClick={() => router.push('/applicants')}
          className="border border-slate-300 rounded px-4 py-2 text-sm hover:bg-slate-50">Batal</button>
        <button onClick={handleSave} disabled={saving}
          className="bg-sky-600 text-white rounded px-4 py-2 text-sm hover:bg-sky-700 disabled:opacity-50">
          {saving ? 'Menyimpan…' : 'Simpan'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create edit applicant page**

Create `src/app/applicants/[id]/edit/page.tsx`:

```typescript
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import EditApplicantClient from './EditApplicantClient'

export default async function EditApplicantPage({ params }: { params: { id: string } }) {
  if (!await auth()) redirect('/login')
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Kemaskini Pemohon</h1>
          <Link href="/applicants" className="text-sm text-sky-600 hover:text-sky-700 font-medium">← Senarai Pemohon</Link>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <EditApplicantClient id={params.id} />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/applicants/
git commit -m "feat: add applicants management pages"
```

---

## Task 8: TopBar Navigation Link + Final Tests

**Files:**
- Modify: `src/components/editor/TopBar.tsx`

- [ ] **Step 1: Add Permohonan link to TopBar**

In `src/components/editor/TopBar.tsx`, find the right-side nav links section (around line 102-108). After the `Templates` link and before `Settings`, add:

```typescript
<Link href="/applications"
  className="text-slate-400 hover:text-white text-xs px-2">
  Permohonan
</Link>
```

The right-side nav block should look like:

```typescript
<Link href="/templates"
  className="text-slate-400 hover:text-white text-xs px-2">
  Templates
</Link>
<Link href="/applications"
  className="text-slate-400 hover:text-white text-xs px-2">
  Permohonan
</Link>
<a href="/settings"
  className="text-slate-400 hover:text-white text-xs px-2">
  Settings
</a>
<button onClick={() => signOut()}
  className="text-slate-400 hover:text-white text-xs px-2">
  Sign out
</button>
```

- [ ] **Step 2: Run all tests to confirm no regressions**

```bash
npx jest --no-coverage
```

Expected: all tests pass (24+ tests).

- [ ] **Step 3: Verify full flow in browser**

1. Open editor → confirm "Permohonan" link in top nav
2. Click "Permohonan" → `/applications` list loads
3. Click "+ Permohonan Baharu" → search form
4. Search for a business, select it, fill district + type + documents, submit → redirected to detail page
5. Fill all 5 timeline stages → each card shows green dot when filled
6. Set JKKN decision to "DISOKONG" → status badge at top changes to DISOKONG
7. Go to `/applicants` → business list shows with phone number column
8. Click Edit → update phone number → saved and redirected back

- [ ] **Step 4: Final commit**

```bash
git add src/components/editor/TopBar.tsx
git commit -m "feat: add Permohonan nav link to TopBar"
```
