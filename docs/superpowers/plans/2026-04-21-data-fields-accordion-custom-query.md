# Data Fields: Accordion Tables + Custom SQL Queries — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Data Fields pane accordion-style with system tables collapsed by default, and add a custom SQL query feature that lets users write, name, save, and reuse arbitrary SELECT queries as virtual table sources.

**Architecture:** Feature 1 is pure frontend state in `RightPane.tsx`. Feature 2 spans backend (new `SavedQuery` Prisma model, 3 API routes, a `runCustomQuery` lib function) and frontend (a new `CustomQueryModal` component + RightPane integration).

**Tech Stack:** Next.js App Router, Prisma 5 + PostgreSQL, `pg` client, React state hooks, Tailwind CSS, Jest + `@testing-library/react`

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `prisma/schema.prisma` | Add `SavedQuery` model + `DataSource.savedQueries` relation |
| Modify | `src/lib/db/records.ts` | Add `runCustomQuery(connectionUrl, sql)` |
| Create | `src/app/api/databases/[id]/queries/route.ts` | GET list + POST create saved query |
| Create | `src/app/api/databases/[id]/queries/[queryId]/route.ts` | DELETE saved query |
| Create | `src/app/api/databases/[id]/query/run/route.ts` | POST execute a SELECT query |
| Create | `src/components/editor/CustomQueryModal.tsx` | Modal UI for writing/testing/saving queries |
| Modify | `src/components/editor/RightPane.tsx` | Accordion + custom queries section |
| Create | `__tests__/api/saved-queries.test.ts` | Tests for CRUD + run API routes |
| Create | `__tests__/lib/db/custom-query.test.ts` | Unit test for `runCustomQuery` |

---

## Task 1: Prisma Schema — Add SavedQuery model

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add the model and relation**

Open `prisma/schema.prisma`. Add after the `DataSource` model:

```prisma
model SavedQuery {
  id           String     @id @default(uuid())
  name         String
  sql          String
  dataSourceId String     @map("data_source_id")
  dataSource   DataSource @relation(fields: [dataSourceId], references: [id], onDelete: Cascade)
  createdAt    DateTime   @default(now()) @map("created_at")

  @@map("saved_queries")
}
```

Also add `savedQueries SavedQuery[]` inside the `DataSource` model block (after the `connectionUrl` field):

```prisma
model DataSource {
  id            String       @id @default(uuid())
  name          String
  connectionUrl String       @map("connection_url")
  createdAt     DateTime     @default(now()) @map("created_at")
  savedQueries  SavedQuery[]

  @@map("data_sources")
}
```

- [ ] **Step 2: Run migration**

```bash
cd /home/faizalamat/memo-builder
npx prisma migrate dev --name add_saved_query
```

Expected: Migration applied successfully, `prisma/migrations/` gets a new timestamped folder.

- [ ] **Step 3: Regenerate client**

```bash
npx prisma generate
```

Expected: `@prisma/client` updated with `savedQuery` model.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add SavedQuery model for custom SQL queries"
```

---

## Task 2: Add `runCustomQuery` to lib/db/records.ts

**Files:**
- Modify: `src/lib/db/records.ts`
- Create: `__tests__/lib/db/custom-query.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/lib/db/custom-query.test.ts`:

```typescript
/** @jest-environment node */
import { runCustomQuery } from '@/lib/db/records'

jest.mock('pg', () => {
  const mClient = {
    connect: jest.fn(),
    query: jest.fn(),
    end: jest.fn(),
  }
  return { Client: jest.fn(() => mClient) }
})

const { Client } = require('pg')

describe('runCustomQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('executes a SELECT query and returns string-coerced rows', async () => {
    const mockClient = new Client()
    mockClient.query.mockResolvedValue({
      rows: [{ name: 'Alice', age: 30 }],
    })

    const rows = await runCustomQuery('postgresql://localhost/db', 'SELECT name, age FROM users')
    expect(rows).toEqual([{ name: 'Alice', age: '30' }])
    expect(mockClient.query).toHaveBeenCalledWith('SELECT name, age FROM users')
  })

  it('throws if sql does not start with SELECT', async () => {
    await expect(
      runCustomQuery('postgresql://localhost/db', 'DELETE FROM users')
    ).rejects.toThrow('Only SELECT queries are allowed')
  })

  it('is case-insensitive for SELECT check', async () => {
    const mockClient = new Client()
    mockClient.query.mockResolvedValue({ rows: [{ id: 1 }] })
    await expect(
      runCustomQuery('postgresql://localhost/db', 'select id from users')
    ).resolves.toBeDefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/faizalamat/memo-builder
npx jest __tests__/lib/db/custom-query.test.ts --no-coverage
```

Expected: FAIL — `runCustomQuery is not a function`

- [ ] **Step 3: Implement `runCustomQuery`**

Open `src/lib/db/records.ts` and append:

```typescript
export async function runCustomQuery(
  connectionUrl: string,
  sql: string
): Promise<Record<string, string>[]> {
  if (!sql.trimStart().toLowerCase().startsWith('select')) {
    throw new Error('Only SELECT queries are allowed')
  }
  const client = new Client({ connectionString: connectionUrl })
  await client.connect()
  try {
    const { rows } = await client.query(sql)
    return rows.map((row: Record<string, unknown>) =>
      Object.fromEntries(Object.entries(row).map(([k, v]) => [k, String(v ?? '')]))
    )
  } finally {
    await client.end()
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest __tests__/lib/db/custom-query.test.ts --no-coverage
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/records.ts __tests__/lib/db/custom-query.test.ts
git commit -m "feat: add runCustomQuery with SELECT-only guard"
```

---

## Task 3: API routes — Saved Queries CRUD

**Files:**
- Create: `src/app/api/databases/[id]/queries/route.ts`
- Create: `src/app/api/databases/[id]/queries/[queryId]/route.ts`
- Create: `__tests__/api/saved-queries.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/api/saved-queries.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest __tests__/api/saved-queries.test.ts --no-coverage
```

Expected: FAIL — routes not found

- [ ] **Step 3: Create GET + POST route**

Create `src/app/api/databases/[id]/queries/route.ts`:

```typescript
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const source = await prisma.dataSource.findUnique({ where: { id: params.id } })
  if (!source) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const queries = await prisma.savedQuery.findMany({
    where: { dataSourceId: params.id },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(queries)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const source = await prisma.dataSource.findUnique({ where: { id: params.id } })
  if (!source) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { name, sql } = await req.json()
  if (!name?.trim() || !sql?.trim()) {
    return NextResponse.json({ error: 'name and sql are required' }, { status: 400 })
  }
  const query = await prisma.savedQuery.create({
    data: { name: name.trim(), sql: sql.trim(), dataSourceId: params.id },
  })
  return NextResponse.json(query, { status: 201 })
}
```

- [ ] **Step 4: Create DELETE route**

Create `src/app/api/databases/[id]/queries/[queryId]/route.ts`:

```typescript
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(
  _: NextRequest,
  { params }: { params: { id: string; queryId: string } }
) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await prisma.savedQuery.delete({ where: { id: params.queryId } })
  return new NextResponse(null, { status: 204 })
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx jest __tests__/api/saved-queries.test.ts --no-coverage
```

Expected: PASS (5 tests)

- [ ] **Step 6: Commit**

```bash
git add src/app/api/databases/[id]/queries/ __tests__/api/saved-queries.test.ts
git commit -m "feat: add saved queries CRUD API routes"
```

---

## Task 4: API route — Execute Custom Query

**Files:**
- Create: `src/app/api/databases/[id]/query/run/route.ts`

- [ ] **Step 1: Write failing test** (append to `__tests__/api/saved-queries.test.ts`)

Add this import at the top of the file:
```typescript
import { POST as runQuery } from '@/app/api/databases/[id]/query/run/route'
```

Add this mock (in the existing `jest.mock('@/lib/prisma', ...)` block, add `savedQuery` — already there):

Add a new mock after the existing mocks:
```typescript
jest.mock('@/lib/db/records', () => ({
  runCustomQuery: jest.fn(),
}))
jest.mock('@/lib/encrypt', () => ({
  decrypt: jest.fn((x: string) => x),
}))
```

And add this describe block at the end of the file:
```typescript
describe('POST /api/databases/[id]/query/run', () => {
  it('executes the query and returns rows', async () => {
    ;(prisma.dataSource.findUnique as jest.Mock).mockResolvedValue({
      id: 'src1', connectionUrl: 'enc:pg://localhost/db'
    })
    const { runCustomQuery } = require('@/lib/db/records')
    ;(runCustomQuery as jest.Mock).mockResolvedValue([{ col: 'val' }])

    const req = new NextRequest('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ sql: 'SELECT col FROM tbl' }),
    })
    const res = await runQuery(req, params)
    expect(res.status).toBe(200)
    const rows = await res.json()
    expect(rows).toEqual([{ col: 'val' }])
  })

  it('returns 400 if query is not SELECT', async () => {
    ;(prisma.dataSource.findUnique as jest.Mock).mockResolvedValue({
      id: 'src1', connectionUrl: 'enc:pg://localhost/db'
    })
    const { runCustomQuery } = require('@/lib/db/records')
    ;(runCustomQuery as jest.Mock).mockRejectedValue(new Error('Only SELECT queries are allowed'))

    const req = new NextRequest('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ sql: 'DROP TABLE users' }),
    })
    const res = await runQuery(req, params)
    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 2: Run tests to verify new tests fail**

```bash
npx jest __tests__/api/saved-queries.test.ts --no-coverage
```

Expected: FAIL on the two new `runQuery` tests

- [ ] **Step 3: Create the run route**

Create `src/app/api/databases/[id]/query/run/route.ts`:

```typescript
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/encrypt'
import { runCustomQuery } from '@/lib/db/records'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const source = await prisma.dataSource.findUnique({ where: { id: params.id } })
  if (!source) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { sql } = await req.json()
  if (!sql?.trim()) return NextResponse.json({ error: 'sql is required' }, { status: 400 })
  try {
    const rows = await runCustomQuery(decrypt(source.connectionUrl), sql.trim())
    return NextResponse.json(rows)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Query failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
```

- [ ] **Step 4: Run all tests to verify they pass**

```bash
npx jest __tests__/api/saved-queries.test.ts --no-coverage
```

Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/app/api/databases/[id]/query/ __tests__/api/saved-queries.test.ts
git commit -m "feat: add custom query execution API route"
```

---

## Task 5: CustomQueryModal component

**Files:**
- Create: `src/components/editor/CustomQueryModal.tsx`

No unit test for this component — it's a UI-only modal; it will be covered by manual verification.

- [ ] **Step 1: Create the modal component**

Create `src/components/editor/CustomQueryModal.tsx`:

```typescript
'use client'
import { useState } from 'react'

interface SavedQuery {
  id: string
  name: string
  sql: string
  dataSourceId: string
  createdAt: string
}

interface PreviewRow {
  [col: string]: string
}

interface CustomQueryModalProps {
  sourceId: string
  onSaved: (query: SavedQuery) => void
  onClose: () => void
}

export default function CustomQueryModal({ sourceId, onSaved, onClose }: CustomQueryModalProps) {
  const [name, setName] = useState('')
  const [sql, setSql] = useState('')
  const [preview, setPreview] = useState<PreviewRow[] | null>(null)
  const [error, setError] = useState('')
  const [running, setRunning] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleRun() {
    setError('')
    setPreview(null)
    if (!sql.trim()) { setError('SQL cannot be empty'); return }
    setRunning(true)
    try {
      const res = await fetch(`/api/databases/${sourceId}/query/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Query failed'); return }
      setPreview(data.slice(0, 5))
    } catch {
      setError('Network error')
    } finally {
      setRunning(false)
    }
  }

  async function handleSave() {
    setError('')
    if (!name.trim()) { setError('Query name is required'); return }
    if (!sql.trim()) { setError('SQL cannot be empty'); return }
    setSaving(true)
    try {
      const res = await fetch(`/api/databases/${sourceId}/queries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, sql }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Save failed'); return }
      onSaved(data)
      onClose()
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  const previewCols = preview && preview.length > 0 ? Object.keys(preview[0]) : []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-[560px] max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <span className="font-semibold text-sm text-slate-700">Custom SQL Query</span>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg leading-none">×</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Query name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Active records by district"
              className="w-full border border-slate-300 rounded px-2 py-1 text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">SQL</label>
            <textarea
              value={sql}
              onChange={e => setSql(e.target.value)}
              rows={6}
              placeholder={"SELECT * FROM get_records('approved', 'north')"}
              className="w-full border border-slate-300 rounded px-2 py-1 text-xs font-mono resize-y"
            />
          </div>
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <button
            onClick={handleRun}
            disabled={running}
            className="px-3 py-1 bg-slate-700 text-white text-xs rounded hover:bg-slate-800 disabled:opacity-50"
          >
            {running ? 'Running…' : 'Run Query'}
          </button>
          {preview !== null && (
            <div>
              <p className="text-xs text-slate-500 mb-1">Preview (first {preview.length} row{preview.length !== 1 ? 's' : ''})</p>
              {preview.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No rows returned</p>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded">
                  <table className="text-[10px] w-full">
                    <thead className="bg-slate-100">
                      <tr>
                        {previewCols.map(col => (
                          <th key={col} className="px-2 py-1 text-left font-semibold text-slate-600 border-r border-slate-200 last:border-r-0">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row, i) => (
                        <tr key={i} className="border-t border-slate-200">
                          {previewCols.map(col => (
                            <td key={col} className="px-2 py-1 truncate max-w-[100px] border-r border-slate-200 last:border-r-0">{row[col]}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-slate-200">
          <button onClick={onClose} className="px-3 py-1 text-xs border border-slate-300 rounded hover:bg-slate-50">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1 text-xs bg-sky-600 text-white rounded hover:bg-sky-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save & Load'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/editor/CustomQueryModal.tsx
git commit -m "feat: add CustomQueryModal component"
```

---

## Task 6: RightPane — Accordion feature

**Files:**
- Modify: `src/components/editor/RightPane.tsx`

- [ ] **Step 1: Add accordion state and system table detection**

Replace the full content of `src/components/editor/RightPane.tsx` with:

```typescript
'use client'
import { useEffect, useState } from 'react'
import CustomQueryModal from './CustomQueryModal'

interface Column { name: string; type: string }
interface TableSchema { table: string; columns: Column[] }
interface SavedQuery { id: string; name: string; sql: string; dataSourceId: string; createdAt: string }

interface RightPaneProps {
  onFieldDrop: (field: string, x: number, y: number) => void
  onRecordChange: (record: Record<string, string>) => void
  onSourceTableChange?: (sourceId: string, table: string) => void
}

const SYSTEM_TABLES = new Set([
  '_prisma_migrations', 'data_sources', 'export_jobs', 'templates', 'webhook_configs',
])

export default function RightPane({ onFieldDrop, onRecordChange, onSourceTableChange }: RightPaneProps) {
  const [sources, setSources] = useState<{ id: string; name: string }[]>([])
  const [sourceId, setSourceId] = useState('')
  const [schema, setSchema] = useState<TableSchema[]>([])
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([])
  const [activeQuerySchema, setActiveQuerySchema] = useState<TableSchema | null>(null)
  const [search, setSearch] = useState('')
  const [records, setRecords] = useState<Record<string, string>[]>([])
  const [activeRecord, setActiveRecord] = useState<Record<string, string> | null>(null)
  const [collapsedTables, setCollapsedTables] = useState<Set<string>>(new Set())
  const [showQueryModal, setShowQueryModal] = useState(false)

  useEffect(() => {
    fetch('/api/databases').then(r => r.json()).then(setSources)
  }, [])

  useEffect(() => {
    if (!sourceId) { setSchema([]); setSavedQueries([]); setActiveQuerySchema(null); return }
    fetch(`/api/databases/${sourceId}/schema`).then(r => r.json()).then((tables: TableSchema[]) => {
      setSchema(tables)
      setCollapsedTables(new Set(tables.map(t => t.table).filter(t => SYSTEM_TABLES.has(t))))
    })
    fetch(`/api/databases/${sourceId}/queries`).then(r => r.json()).then(setSavedQueries)
  }, [sourceId])

  function toggleTable(table: string) {
    setCollapsedTables(prev => {
      const next = new Set(prev)
      if (next.has(table)) { next.delete(table) } else { next.add(table) }
      return next
    })
  }

  async function loadRecords(table: string) {
    if (!sourceId) return
    const rows: Record<string, string>[] = await fetch(
      `/api/records?sourceId=${sourceId}&table=${table}`
    ).then(r => r.json())
    setRecords(rows)
    if (rows[0]) { setActiveRecord(rows[0]); onRecordChange(rows[0]) }
    onSourceTableChange?.(sourceId, table)
  }

  async function loadQueryRecords(query: SavedQuery) {
    const res = await fetch(`/api/databases/${sourceId}/query/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql: query.sql }),
    })
    if (!res.ok) return
    const rows: Record<string, string>[] = await res.json()
    setRecords(rows)
    if (rows[0]) { setActiveRecord(rows[0]); onRecordChange(rows[0]) }
    const columns = rows[0] ? Object.keys(rows[0]).map(name => ({ name, type: 'text' })) : []
    setActiveQuerySchema({ table: query.name, columns })
    onSourceTableChange?.(sourceId, query.name)
  }

  async function deleteQuery(queryId: string) {
    await fetch(`/api/databases/${sourceId}/queries/${queryId}`, { method: 'DELETE' })
    setSavedQueries(prev => prev.filter(q => q.id !== queryId))
    if (activeQuerySchema) setActiveQuerySchema(null)
  }

  function handleQuerySaved(query: SavedQuery) {
    setSavedQueries(prev => [...prev, query])
    loadQueryRecords(query)
  }

  const allSchema: TableSchema[] = activeQuerySchema
    ? [activeQuerySchema, ...schema]
    : schema

  const filtered = allSchema
    .map(t => ({ ...t, columns: t.columns.filter(c =>
      `${t.table}.${c.name}`.toLowerCase().includes(search.toLowerCase())
    )}))
    .filter(t => t.columns.length > 0)

  return (
    <div className="w-52 bg-slate-50 border-l border-slate-200 flex flex-col text-xs shrink-0">
      <div className="px-3 py-2 bg-slate-800 text-slate-200 font-semibold text-xs flex items-center justify-between">
        <span>Data Fields</span>
        {sourceId && (
          <button
            onClick={() => setShowQueryModal(true)}
            title="New custom query"
            className="text-slate-400 hover:text-slate-100 text-sm leading-none"
          >+</button>
        )}
      </div>
      <div className="px-2 py-1 border-b border-slate-200">
        <select value={sourceId} onChange={e => setSourceId(e.target.value)}
          className="w-full border border-slate-300 rounded px-1 py-0.5 text-xs bg-white">
          <option value="">Select data source…</option>
          {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      {savedQueries.length > 0 && (
        <div className="border-b border-slate-200">
          <div className="px-2 py-0.5 bg-amber-100 text-amber-700 uppercase tracking-wide font-semibold text-[9px]">
            Custom Queries
          </div>
          {savedQueries.map(q => (
            <div key={q.id} className="flex items-center px-2 py-0.5 hover:bg-amber-50 group">
              <button
                onClick={() => loadQueryRecords(q)}
                className="flex-1 text-left text-amber-700 text-[10px] truncate"
                title={q.sql}
              >
                ⚡ {q.name}
              </button>
              <button
                onClick={() => deleteQuery(q.id)}
                className="text-slate-300 group-hover:text-slate-500 hover:text-red-500 ml-1 shrink-0"
                title="Delete query"
              >×</button>
            </div>
          ))}
        </div>
      )}
      <div className="px-2 py-1 border-b border-slate-200">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search fields…"
          className="w-full border border-slate-300 rounded px-2 py-0.5 text-xs" />
      </div>
      <div className="flex-1 overflow-y-auto">
        {filtered.map(({ table, columns }) => {
          const isCollapsed = collapsedTables.has(table)
          const isQueryResult = activeQuerySchema?.table === table
          return (
            <div key={table}>
              <div
                className={`px-2 py-0.5 flex items-center justify-between cursor-pointer select-none font-semibold text-[9px] uppercase tracking-wide ${isQueryResult ? 'bg-amber-200 text-amber-700' : 'bg-slate-200 text-slate-500'}`}
                onClick={() => {
                  if (!isCollapsed) {
                    toggleTable(table)
                  } else {
                    toggleTable(table)
                    if (!isQueryResult) loadRecords(table)
                  }
                }}
              >
                <span>{isQueryResult ? `⚡ ${table}` : table}</span>
                <span className="ml-1 text-[8px]">{isCollapsed ? '›' : '˅'}</span>
              </div>
              {!isCollapsed && columns.map(col => (
                <div key={col.name}
                  draggable
                  onDragStart={e => e.dataTransfer.setData('text/plain', `{{${col.name}}}`)}
                  className="px-3 py-0.5 text-sky-600 hover:bg-sky-50 cursor-grab active:cursor-grabbing">
                  {`{{${col.name}}}`}
                </div>
              ))}
            </div>
          )
        })}
      </div>
      <div className="border-t border-slate-200 p-2">
        {activeRecord ? (
          <div className="bg-slate-100 border border-slate-200 rounded p-2">
            <div className="font-semibold text-slate-500 mb-1">Active Record</div>
            <div className="text-sky-600 truncate text-[10px]">{Object.values(activeRecord)[0]}</div>
            {records.length > 1 && (
              <select className="mt-1 w-full border border-slate-300 rounded px-1 py-0.5 text-[10px] bg-white"
                onChange={e => {
                  const rec = records[Number(e.target.value)]
                  setActiveRecord(rec); onRecordChange(rec)
                }}>
                {records.map((r, i) => (
                  <option key={i} value={i}>{Object.values(r)[0]}</option>
                ))}
              </select>
            )}
          </div>
        ) : (
          <p className="text-slate-400 text-center py-2 text-[10px]">Click a table to load records</p>
        )}
      </div>
      {showQueryModal && (
        <CustomQueryModal
          sourceId={sourceId}
          onSaved={handleQuerySaved}
          onClose={() => setShowQueryModal(false)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Run all tests to make sure nothing is broken**

```bash
npx jest --no-coverage
```

Expected: All existing tests pass (no regressions from RightPane change)

- [ ] **Step 3: Commit**

```bash
git add src/components/editor/RightPane.tsx
git commit -m "feat: accordion tables and custom query integration in RightPane"
```

---

## Task 7: End-to-end Verification

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

Open `http://localhost:3000` in browser.

- [ ] **Step 2: Verify accordion behavior**
  1. Open the editor page
  2. Select a PostgreSQL data source
  3. Confirm `_prisma_migrations`, `data_sources`, `export_jobs`, `templates`, `webhook_configs` are collapsed (only headers visible)
  4. Confirm other user tables are expanded by default
  5. Click a system table header → columns appear; click again → collapse

- [ ] **Step 3: Verify custom queries — create and run**
  1. With a data source selected, click the `+` button in the "Data Fields" header
  2. In the modal: enter name `"Test Query"`, SQL `SELECT table_name FROM information_schema.tables LIMIT 5`
  3. Click "Run Query" → preview table shows up to 5 rows
  4. Click "Save & Load" → modal closes, "CUSTOM QUERIES" section shows `⚡ Test Query`
  5. The `⚡ Test Query` accordion section appears at top of field list with draggable `{{table_name}}` field

- [ ] **Step 4: Verify persistence**
  1. Reload the page, re-select the same data source
  2. Confirm "CUSTOM QUERIES" section still shows `⚡ Test Query`

- [ ] **Step 5: Verify drag-to-canvas works**
  1. Drag `{{table_name}}` from the custom query section onto the canvas
  2. Confirm a text element with `{{table_name}}` is created at the drop position

- [ ] **Step 6: Verify DELETE**
  1. Click `×` next to `⚡ Test Query`
  2. Confirm it disappears from the list

- [ ] **Step 7: Verify non-SELECT is blocked**
  1. Open `+` modal, enter SQL `DROP TABLE users`
  2. Click "Run Query" → error message appears: "Only SELECT queries are allowed"

- [ ] **Step 8: Final commit**

```bash
git add -p  # review any remaining unstaged changes
git commit -m "chore: verify end-to-end accordion and custom query features"
```
