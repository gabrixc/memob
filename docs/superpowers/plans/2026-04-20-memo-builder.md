# Memo Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack web-based memo designer with a Fabric.js canvas editor, PostgreSQL data binding, multi-format export (PDF/image/Word), print support, and a webhook API for external integrations.

**Architecture:** Monolithic Next.js 14 (App Router) with Fabric.js for the canvas, Prisma + PostgreSQL for MemoBuilder's own data, NextAuth.js for single-admin auth, Puppeteer for PDF, and the `docx` package for Word export — all in a single Next.js deployment.

**Tech Stack:** Next.js 14, TypeScript, Fabric.js 6, Prisma, PostgreSQL, NextAuth.js v5, Puppeteer, docx, TailwindCSS, Jest, React Testing Library

---

## File Map

```
memo-builder/
├── app/
│   ├── (auth)/login/page.tsx                  # Login page
│   ├── (editor)/
│   │   ├── page.tsx                           # Editor page (auth guard, server)
│   │   └── EditorClient.tsx                   # Client-side editor shell
│   ├── settings/page.tsx                      # Settings (data sources, webhooks)
│   ├── preview/[templateId]/page.tsx          # Clean print/preview page
│   └── api/
│       ├── auth/[...nextauth]/route.ts        # NextAuth handler
│       ├── templates/route.ts                 # GET all, POST create
│       ├── templates/[id]/route.ts            # GET, PUT, DELETE
│       ├── databases/route.ts                 # GET all, POST create
│       ├── databases/[id]/route.ts            # DELETE
│       ├── databases/[id]/schema/route.ts     # GET tables+fields
│       ├── records/route.ts                   # GET records from user DB
│       ├── export/route.ts                    # POST generate export
│       ├── webhook/trigger/route.ts           # POST inbound webhook
│       └── webhook/config/route.ts            # GET/POST webhook settings
├── components/
│   ├── editor/
│   │   ├── Canvas.tsx                         # Fabric.js canvas wrapper
│   │   ├── LeftToolbar.tsx                    # Tool buttons
│   │   ├── RightPane.tsx                      # DB field browser + record selector
│   │   ├── PropertiesBar.tsx                  # X/Y/W/H + font + grid controls
│   │   ├── TopBar.tsx                         # App header + save/preview/export
│   │   └── StatusBar.tsx                      # Page/zoom/grid info
│   └── settings/
│       ├── DataSourceForm.tsx                 # Add/remove DB connections
│       └── WebhookConfigForm.tsx              # Inbound secret + outbound URL
├── lib/
│   ├── auth.ts                                # NextAuth config
│   ├── prisma.ts                              # Prisma client singleton
│   ├── encrypt.ts                             # AES-256-GCM encrypt/decrypt
│   ├── canvas/
│   │   ├── snap.ts                            # snapToGrid(value, gridSize)
│   │   ├── elements.ts                        # addTextBox, addLine, addTable, etc.
│   │   └── placeholders.ts                    # substitutePlaceholders, extractPlaceholders
│   ├── export/
│   │   ├── pdf.ts                             # generatePdf + canvasJsonToHtml
│   │   ├── image.ts                           # dataUrlToBuffer
│   │   └── word.ts                            # buildDocx + canvasJsonToDocElements
│   ├── db/
│   │   ├── introspect.ts                      # getTables(connectionUrl)
│   │   └── records.ts                         # getRecords(connectionUrl, table)
│   └── webhook/
│       ├── outbound.ts                        # deliverWebhook(config, payload)
│       └── verify.ts                          # verifyBearerToken(req, secret)
├── prisma/schema.prisma
├── middleware.ts
└── __tests__/
    ├── lib/canvas/snap.test.ts
    ├── lib/canvas/placeholders.test.ts
    ├── lib/export/word.test.ts
    └── api/
        ├── templates.test.ts
        └── webhook-trigger.test.ts
```

---

## Phase 1: Foundation

### Task 1: Project Bootstrap

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `next.config.ts`
- Create: `.env.local`, `jest.config.ts`, `jest.setup.ts`
- Create: `app/layout.tsx`, `app/globals.css`

- [ ] **Step 1: Scaffold Next.js project**

```bash
cd /home/faizalamat/memo-builder
npx create-next-app@14 . --typescript --tailwind --app --src-dir=no --import-alias="@/*" --yes
```

Expected: Next.js 14 project created with TypeScript and Tailwind.

- [ ] **Step 2: Install runtime dependencies**

```bash
npm install fabric@6 @prisma/client prisma next-auth@beta \
  puppeteer docx pg bcryptjs
npm install --save-dev @types/pg @types/bcryptjs \
  jest @testing-library/react @testing-library/jest-dom \
  @testing-library/user-event jest-environment-jsdom ts-jest @types/jest
```

- [ ] **Step 3: Create jest.config.ts**

```typescript
// jest.config.ts
import type { Config } from 'jest'

const config: Config = {
  testEnvironment: 'jsdom',
  setupFilesAfterFramework: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: { jsx: 'react-jsx' } }],
  },
  testPathPattern: ['__tests__'],
}

export default config
```

- [ ] **Step 4: Create jest.setup.ts**

```typescript
// jest.setup.ts
import '@testing-library/jest-dom'
```

- [ ] **Step 5: Create .env.local**

```bash
# .env.local
DATABASE_URL="postgresql://postgres:password@localhost:5432/memo_builder"
NEXTAUTH_SECRET="replace-with-32-char-random-string"
NEXTAUTH_URL="http://localhost:3000"
ADMIN_EMAIL="admin@memo.local"
ADMIN_PASSWORD_HASH=""
ENCRYPTION_KEY=""
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: bootstrap Next.js project with dependencies"
```

---

### Task 2: Prisma Schema + Database

**Files:**
- Create: `prisma/schema.prisma`
- Create: `lib/prisma.ts`

- [ ] **Step 1: Write prisma/schema.prisma**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Template {
  id         String   @id @default(uuid())
  name       String
  canvasJson Json     @map("canvas_json")
  pageSize   String   @default("A4") @map("page_size")
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")
  @@map("templates")
}

model DataSource {
  id            String   @id @default(uuid())
  name          String
  connectionUrl String   @map("connection_url")
  createdAt     DateTime @default(now()) @map("created_at")
  @@map("data_sources")
}

model WebhookConfig {
  id             String   @id @default(uuid())
  inboundSecret  String   @map("inbound_secret")
  outboundUrl    String?  @map("outbound_url")
  outboundSecret String?  @map("outbound_secret")
  outboundEvents String[] @map("outbound_events")
  @@map("webhook_configs")
}

model ExportJob {
  id          String   @id @default(uuid())
  templateId  String   @map("template_id")
  recordId    String   @map("record_id")
  format      String
  status      String   @default("pending")
  filePath    String?  @map("file_path")
  triggeredBy String   @default("ui") @map("triggered_by")
  createdAt   DateTime @default(now()) @map("created_at")
  @@map("export_jobs")
}
```

- [ ] **Step 2: Run migration**

```bash
npx prisma migrate dev --name init
```

Expected: Tables created in PostgreSQL. Prisma client generated.

- [ ] **Step 3: Create lib/prisma.ts**

```typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

- [ ] **Step 4: Commit**

```bash
git add prisma/ lib/prisma.ts
git commit -m "feat: add Prisma schema and database migration"
```

---

### Task 3: Admin Auth + Encryption

**Files:**
- Create: `lib/auth.ts`
- Create: `lib/encrypt.ts`
- Create: `app/api/auth/[...nextauth]/route.ts`
- Create: `app/(auth)/login/page.tsx`
- Create: `middleware.ts`

- [ ] **Step 1: Generate password hash and encryption key, write to .env.local**

```bash
node -e "
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
console.log('ADMIN_PASSWORD_HASH=' + bcrypt.hashSync('admin123', 10));
console.log('ENCRYPTION_KEY=' + crypto.randomBytes(32).toString('hex'));
"
```

Copy the two output lines into `.env.local`, replacing the empty values.

- [ ] **Step 2: Create lib/encrypt.ts**

```typescript
// lib/encrypt.ts
import crypto from 'crypto'

const ALG = 'aes-256-gcm'
const KEY = Buffer.from(process.env.ENCRYPTION_KEY ?? '', 'hex')

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALG, KEY, iv)
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv, tag, encrypted].map(b => b.toString('hex')).join(':')
}

export function decrypt(encoded: string): string {
  const [ivHex, tagHex, encHex] = encoded.split(':')
  const decipher = crypto.createDecipheriv(
    ALG, KEY, Buffer.from(ivHex, 'hex')
  )
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
  return decipher.update(Buffer.from(encHex, 'hex')) + decipher.final('utf8')
}
```

- [ ] **Step 3: Create lib/auth.ts**

```typescript
// lib/auth.ts
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email as string
        const password = credentials?.password as string
        if (
          email !== process.env.ADMIN_EMAIL ||
          !bcrypt.compareSync(password, process.env.ADMIN_PASSWORD_HASH ?? '')
        ) return null
        return { id: '1', email }
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
})
```

- [ ] **Step 4: Create app/api/auth/[...nextauth]/route.ts**

```typescript
// app/api/auth/[...nextauth]/route.ts
export { handlers as GET, handlers as POST } from '@/lib/auth'
```

- [ ] **Step 5: Create middleware.ts**

```typescript
// middleware.ts
export { auth as default } from '@/lib/auth'

export const config = {
  matcher: ['/((?!api/auth|login|_next|favicon.ico).*)'],
}
```

- [ ] **Step 6: Create app/(auth)/login/page.tsx**

```tsx
// app/(auth)/login/page.tsx
'use client'
import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const result = await signIn('credentials', {
      email: form.get('email'),
      password: form.get('password'),
      redirect: false,
    })
    if (result?.error) setError('Invalid email or password')
    else router.push('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <form onSubmit={handleSubmit}
        className="bg-white p-8 rounded-lg shadow w-80 space-y-4">
        <h1 className="text-xl font-bold text-slate-800">📄 MemoBuilder</h1>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <input name="email" type="email" placeholder="Email" required
          className="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
        <input name="password" type="password" placeholder="Password" required
          className="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
        <button type="submit"
          className="w-full bg-sky-500 text-white rounded px-3 py-2 text-sm font-medium">
          Sign In
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 7: Start dev server and verify auth flow**

```bash
npm run dev
```

Visit `http://localhost:3000` → confirm redirect to `/login` → sign in with `admin@memo.local` / `admin123` → confirm redirect to `/`.

- [ ] **Step 8: Commit**

```bash
git add lib/auth.ts lib/encrypt.ts app/api/auth/ app/(auth)/ middleware.ts
git commit -m "feat: add single-admin NextAuth authentication and AES-256 encryption"
```

---

### Task 4: App Shell Layout

**Files:**
- Create: `components/editor/TopBar.tsx`
- Create: `components/editor/StatusBar.tsx`
- Create: `app/(editor)/page.tsx`
- Create: `app/(editor)/EditorClient.tsx`

- [ ] **Step 1: Create components/editor/TopBar.tsx**

```tsx
// components/editor/TopBar.tsx
'use client'
import { signOut } from 'next-auth/react'

interface TopBarProps {
  templateName: string
  onSave: () => void
  onPreview: () => void
  onExport: (format: 'pdf' | 'image' | 'word') => void
}

export default function TopBar({ templateName, onSave, onPreview, onExport }: TopBarProps) {
  return (
    <header className="h-10 bg-slate-800 flex items-center justify-between px-4 text-sm text-slate-200 shrink-0">
      <div className="flex items-center gap-3">
        <span className="font-bold text-sky-400">📄 MemoBuilder</span>
        <span className="text-slate-400 text-xs truncate max-w-48">{templateName}</span>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onSave}
          className="bg-sky-500 hover:bg-sky-600 text-white px-3 py-1 rounded text-xs">
          Save
        </button>
        <button onClick={onPreview}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1 rounded text-xs">
          Preview
        </button>
        <div className="relative group">
          <button className="bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1 rounded text-xs">
            Export ▾
          </button>
          <div className="hidden group-hover:flex flex-col absolute right-0 top-7 bg-white border border-slate-200 rounded shadow-lg z-50 min-w-28">
            {(['pdf', 'image', 'word'] as const).map(f => (
              <button key={f} onClick={() => onExport(f)}
                className="px-4 py-2 text-xs text-slate-700 hover:bg-slate-100 text-left">
                {f === 'image' ? 'Image (PNG)' : f.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <button onClick={() => signOut()}
          className="text-slate-400 hover:text-white text-xs px-2">
          Sign out
        </button>
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Create components/editor/StatusBar.tsx**

```tsx
// components/editor/StatusBar.tsx
interface StatusBarProps {
  page: number
  totalPages: number
  zoom: number
  objectCount: number
  selectedCount: number
  gridSize: number
  snapEnabled: boolean
}

export default function StatusBar({
  page, totalPages, zoom, objectCount, selectedCount, gridSize, snapEnabled
}: StatusBarProps) {
  return (
    <footer className="h-6 bg-slate-800 flex items-center justify-between px-4 text-xs text-slate-400 shrink-0">
      <span>Page {page} of {totalPages} &nbsp;|&nbsp; Zoom: {zoom}% &nbsp;|&nbsp; Canvas: A4 (794×1123px)</span>
      <span>Objects: {objectCount} &nbsp; Selected: {selectedCount} &nbsp;|&nbsp; Grid: {gridSize}px &nbsp;|&nbsp; Snap: {snapEnabled ? 'ON' : 'OFF'}</span>
    </footer>
  )
}
```

- [ ] **Step 3: Create app/(editor)/page.tsx**

```tsx
// app/(editor)/page.tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import EditorClient from './EditorClient'

export default async function EditorPage() {
  const session = await auth()
  if (!session) redirect('/login')
  return <EditorClient />
}
```

- [ ] **Step 4: Create app/(editor)/EditorClient.tsx stub**

```tsx
// app/(editor)/EditorClient.tsx
'use client'
import TopBar from '@/components/editor/TopBar'
import StatusBar from '@/components/editor/StatusBar'

export default function EditorClient() {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TopBar
        templateName="Untitled Memo"
        onSave={() => {}}
        onPreview={() => {}}
        onExport={() => {}}
      />
      <div className="flex flex-1 overflow-hidden">
        <div className="w-14 bg-slate-50 border-r border-slate-200 shrink-0" />
        <div className="flex-1 bg-slate-500 flex items-center justify-center text-white text-sm">
          Canvas
        </div>
        <div className="w-52 bg-slate-50 border-l border-slate-200 shrink-0" />
      </div>
      <StatusBar
        page={1} totalPages={1} zoom={100}
        objectCount={0} selectedCount={0}
        gridSize={8} snapEnabled={true}
      />
    </div>
  )
}
```

- [ ] **Step 5: Verify shell renders**

```bash
npm run dev
```

Visit editor — confirm three-panel shell with top bar and status bar renders.

- [ ] **Step 6: Commit**

```bash
git add app/(editor)/ components/editor/TopBar.tsx components/editor/StatusBar.tsx
git commit -m "feat: add editor shell layout"
```

---

## Phase 2: Canvas Editor

### Task 5: Fabric.js Canvas + Snap-to-Grid

**Files:**
- Create: `lib/canvas/snap.ts`
- Create: `__tests__/lib/canvas/snap.test.ts`
- Create: `components/editor/Canvas.tsx`

- [ ] **Step 1: Write __tests__/lib/canvas/snap.test.ts**

```typescript
import { snapToGrid } from '@/lib/canvas/snap'

describe('snapToGrid', () => {
  it('snaps to nearest grid boundary', () => {
    expect(snapToGrid(13, 8)).toBe(16)
    expect(snapToGrid(11, 8)).toBe(8)
    expect(snapToGrid(0, 8)).toBe(0)
    expect(snapToGrid(8, 8)).toBe(8)
  })
  it('works with any grid size', () => {
    expect(snapToGrid(14, 10)).toBe(10)
    expect(snapToGrid(16, 10)).toBe(20)
  })
})
```

- [ ] **Step 2: Run test — confirm FAIL**

```bash
npx jest __tests__/lib/canvas/snap.test.ts
```

Expected: FAIL — `snapToGrid` not found.

- [ ] **Step 3: Implement lib/canvas/snap.ts**

```typescript
// lib/canvas/snap.ts
export function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize
}
```

- [ ] **Step 4: Run test — confirm PASS**

```bash
npx jest __tests__/lib/canvas/snap.test.ts
```

- [ ] **Step 5: Create components/editor/Canvas.tsx**

```tsx
// components/editor/Canvas.tsx
'use client'
import { useEffect, useRef } from 'react'
import { Canvas as FabricCanvas, type FabricObject } from 'fabric'
import { snapToGrid } from '@/lib/canvas/snap'

export const PAGE_WIDTH = 794
export const PAGE_HEIGHT = 1123

interface CanvasProps {
  gridSize?: number
  snapEnabled?: boolean
  onSelectionChange?: (objects: FabricObject[]) => void
  canvasRef: React.MutableRefObject<FabricCanvas | null>
  onDrop?: (field: string, x: number, y: number) => void
}

export default function Canvas({
  gridSize = 8,
  snapEnabled = true,
  onSelectionChange,
  canvasRef,
  onDrop,
}: CanvasProps) {
  const elRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!elRef.current) return
    const canvas = new FabricCanvas(elRef.current, {
      width: PAGE_WIDTH,
      height: PAGE_HEIGHT,
      backgroundColor: '#ffffff',
      selection: true,
    })
    canvasRef.current = canvas

    canvas.on('object:moving', ({ target }) => {
      if (!snapEnabled || !target) return
      target.set({
        left: snapToGrid(target.left ?? 0, gridSize),
        top: snapToGrid(target.top ?? 0, gridSize),
      })
    })

    canvas.on('selection:created', ({ selected }) => onSelectionChange?.(selected ?? []))
    canvas.on('selection:updated', ({ selected }) => onSelectionChange?.(selected ?? []))
    canvas.on('selection:cleared', () => onSelectionChange?.([]))

    return () => { canvas.dispose() }
  }, [])

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    const field = e.dataTransfer.getData('text/plain')
    if (!field || !onDrop) return
    const rect = e.currentTarget.getBoundingClientRect()
    onDrop(field, e.clientX - rect.left, e.clientY - rect.top)
  }

  return (
    <div
      className="flex-1 overflow-auto flex items-start justify-center p-5"
      style={{
        backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 7px,rgba(148,163,184,0.3) 8px),repeating-linear-gradient(90deg,transparent,transparent 7px,rgba(148,163,184,0.3) 8px)',
        backgroundSize: '8px 8px',
        backgroundColor: '#64748b',
      }}
      onDragOver={e => e.preventDefault()}
      onDrop={handleDrop}
    >
      <div className="shadow-2xl shrink-0">
        <canvas ref={elRef} />
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Wire Canvas into EditorClient**

Replace canvas placeholder in `app/(editor)/EditorClient.tsx`:

```tsx
// Add imports:
import { useRef, useState } from 'react'
import { type Canvas as FabricCanvas, type FabricObject } from 'fabric'
import Canvas from '@/components/editor/Canvas'

// Add inside EditorClient():
const fabricRef = useRef<FabricCanvas | null>(null)
const [selectedObjs, setSelectedObjs] = useState<FabricObject[]>([])

// Replace canvas placeholder div with:
<Canvas
  canvasRef={fabricRef}
  onSelectionChange={setSelectedObjs}
/>
```

- [ ] **Step 7: Verify canvas renders**

```bash
npm run dev
```

Visit editor — confirm white A4 page on dot-grid background.

- [ ] **Step 8: Commit**

```bash
git add lib/canvas/snap.ts __tests__/lib/canvas/snap.test.ts components/editor/Canvas.tsx app/(editor)/EditorClient.tsx
git commit -m "feat: integrate Fabric.js canvas with snap-to-grid"
```

---

### Task 6: Canvas Elements (Draw Tools)

**Files:**
- Create: `lib/canvas/elements.ts`
- Modify: `app/(editor)/EditorClient.tsx`

- [ ] **Step 1: Create lib/canvas/elements.ts**

```typescript
// lib/canvas/elements.ts
import { type Canvas as FabricCanvas, IText, Line, Rect, Group, FabricText } from 'fabric'
import { snapToGrid } from './snap'

const G = 8

export function addTextBox(canvas: FabricCanvas, x = 48, y = 48, text = '{{placeholder}}') {
  const obj = new IText(text, {
    left: snapToGrid(x, G), top: snapToGrid(y, G),
    fontSize: 14, fontFamily: 'Inter, sans-serif', fill: '#1e293b', width: 200,
  })
  canvas.add(obj)
  canvas.setActiveObject(obj)
  canvas.renderAll()
  return obj
}

export function addLine(canvas: FabricCanvas, x = 48, y = 48) {
  const obj = new Line([x, y, x + 200, y], {
    stroke: '#475569', strokeWidth: 1, selectable: true,
  })
  canvas.add(obj); canvas.renderAll(); return obj
}

export function addRect(canvas: FabricCanvas, x = 48, y = 48) {
  const obj = new Rect({
    left: snapToGrid(x, G), top: snapToGrid(y, G),
    width: 200, height: 80, fill: 'transparent', stroke: '#94a3b8', strokeWidth: 1,
  })
  canvas.add(obj); canvas.renderAll(); return obj
}

export function addImagePlaceholder(canvas: FabricCanvas, x = 48, y = 48) {
  const r = new Rect({
    width: 120, height: 80, fill: '#f1f5f9',
    stroke: '#94a3b8', strokeWidth: 2, strokeDashArray: [6, 4],
  })
  const t = new FabricText('🖼 Image', {
    fontSize: 11, fill: '#94a3b8', originX: 'center', originY: 'center',
    left: 60, top: 40, selectable: false, evented: false,
  })
  const g = new Group([r, t], {
    left: snapToGrid(x, G), top: snapToGrid(y, G),
    data: { type: 'imagePlaceholder' },
  })
  canvas.add(g); canvas.renderAll(); return g
}

export function addPageBreak(canvas: FabricCanvas, y = 300) {
  const obj = new Line([0, snapToGrid(y, G), 794, snapToGrid(y, G)], {
    stroke: '#94a3b8', strokeWidth: 1.5, strokeDashArray: [8, 6],
    lockMovementX: true, hasControls: false,
    data: { type: 'pagebreak' },
  })
  canvas.add(obj); canvas.renderAll(); return obj
}

export function addTable(canvas: FabricCanvas, x = 48, y = 48, cols = 3, rows = 2) {
  const cW = 80, cH = 28
  const objects: (Rect | IText)[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      objects.push(new Rect({
        left: c * cW, top: r * cH, width: cW, height: cH,
        fill: r === 0 ? '#f8fafc' : '#ffffff', stroke: '#e2e8f0', strokeWidth: 1,
        selectable: false, evented: false,
      }))
      objects.push(new IText(r === 0 ? `Col ${c + 1}` : `{{col${c + 1}}}`, {
        left: c * cW + 4, top: r * cH + 6,
        fontSize: 10, fontFamily: 'Inter, sans-serif', fill: '#475569',
        width: cW - 8, selectable: false, evented: false,
      }))
    }
  }
  const g = new Group(objects, {
    left: snapToGrid(x, G), top: snapToGrid(y, G),
    data: { type: 'table', cols, rows },
  })
  canvas.add(g); canvas.renderAll(); return g
}
```

- [ ] **Step 2: Wire draw tools into EditorClient**

```tsx
// In app/(editor)/EditorClient.tsx, add imports:
import { addTextBox, addLine, addRect, addImagePlaceholder, addPageBreak, addTable } from '@/lib/canvas/elements'

// Add handler (inside EditorClient component):
function handleCanvasToolClick(e: React.MouseEvent<HTMLDivElement>) {
  const canvas = fabricRef.current
  if (!canvas || activeTool === 'select') return
  const rect = e.currentTarget.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  switch (activeTool) {
    case 'text':      addTextBox(canvas, x, y); break
    case 'line':      addLine(canvas, x, y); break
    case 'rect':      addRect(canvas, x, y); break
    case 'image':     addImagePlaceholder(canvas, x, y); break
    case 'pagebreak': addPageBreak(canvas, y); break
    case 'table':     addTable(canvas, x, y); break
  }
  setActiveTool('select')
}
```

Wrap the `<Canvas>` component in a `<div onClick={handleCanvasToolClick}>`.

- [ ] **Step 3: Verify all tools place elements**

Start dev server, click each tool button, click on canvas — confirm correct element appears for each tool.

- [ ] **Step 4: Commit**

```bash
git add lib/canvas/elements.ts app/(editor)/EditorClient.tsx
git commit -m "feat: add canvas element creation for all toolbar tools"
```

---

### Task 7: Left Toolbar

**Files:**
- Create: `components/editor/LeftToolbar.tsx`
- Modify: `app/(editor)/EditorClient.tsx`

- [ ] **Step 1: Create components/editor/LeftToolbar.tsx**

```tsx
// components/editor/LeftToolbar.tsx
'use client'

export type Tool = 'select' | 'text' | 'line' | 'table' | 'image' | 'rect' | 'pagebreak'

const TOOLS: { tool: Tool; icon: string; title: string }[] = [
  { tool: 'select',    icon: '↖',  title: 'Select (V)' },
  { tool: 'text',      icon: 'T',  title: 'Text Box (T)' },
  { tool: 'line',      icon: '╱',  title: 'Line (L)' },
  { tool: 'table',     icon: '⊞',  title: 'Table' },
  { tool: 'image',     icon: '🖼',  title: 'Image Placeholder' },
  { tool: 'rect',      icon: '▭',  title: 'Rectangle (R)' },
  { tool: 'pagebreak', icon: '─',  title: 'Page Break' },
]

interface LeftToolbarProps {
  activeTool: Tool
  onToolChange: (tool: Tool) => void
  snapEnabled: boolean
  onSnapToggle: () => void
  onCopy: () => void
  onCut: () => void
  onPaste: () => void
}

export default function LeftToolbar({
  activeTool, onToolChange, snapEnabled, onSnapToggle,
  onCopy, onCut, onPaste,
}: LeftToolbarProps) {
  return (
    <div className="w-14 bg-slate-50 border-r border-slate-200 flex flex-col items-center py-2 gap-1 shrink-0">
      <span className="text-slate-400 text-[9px] uppercase tracking-widest mb-1">Tools</span>
      {TOOLS.map(({ tool, icon, title }) => (
        <button key={tool} title={title} onClick={() => onToolChange(tool)}
          className={`w-9 h-9 flex items-center justify-center rounded text-base
            ${activeTool === tool
              ? 'bg-sky-500 text-white'
              : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
            }`}>
          {icon}
        </button>
      ))}
      <div className="w-9 border-t border-slate-300 my-1" />
      {[
        { icon: '⎘', title: 'Copy (Ctrl+C)', action: onCopy },
        { icon: '✂', title: 'Cut (Ctrl+X)',  action: onCut },
        { icon: '📋', title: 'Paste (Ctrl+V)', action: onPaste },
      ].map(({ icon, title, action }) => (
        <button key={title} title={title} onClick={action}
          className="w-9 h-9 flex items-center justify-center rounded bg-slate-200 text-slate-600 hover:bg-slate-300 text-sm">
          {icon}
        </button>
      ))}
      <div className="mt-auto pb-1">
        <button onClick={onSnapToggle} className="text-[9px] text-slate-500 text-center leading-tight">
          Grid<br />
          <span className={snapEnabled ? 'text-sky-500' : 'text-slate-400'}>
            {snapEnabled ? 'ON' : 'OFF'}
          </span>
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Wire LeftToolbar into EditorClient**

```tsx
// In app/(editor)/EditorClient.tsx add:
import LeftToolbar, { type Tool } from '@/components/editor/LeftToolbar'
import { type IText } from 'fabric'

// Add state:
const [activeTool, setActiveTool] = useState<Tool>('select')
const [snapEnabled, setSnapEnabled] = useState(true)
const clipboard = useRef<FabricObject | null>(null)

function handleCopy() {
  clipboard.current = fabricRef.current?.getActiveObject() ?? null
}
function handleCut() {
  const canvas = fabricRef.current
  const obj = canvas?.getActiveObject()
  if (obj) { clipboard.current = obj; canvas?.remove(obj); canvas?.renderAll() }
}
async function handlePaste() {
  const canvas = fabricRef.current
  if (!clipboard.current || !canvas) return
  const clone = await clipboard.current.clone()
  clone.set({ left: (clone.left ?? 0) + 16, top: (clone.top ?? 0) + 16 })
  canvas.add(clone); canvas.setActiveObject(clone); canvas.renderAll()
}

// Replace left pane placeholder div with:
// <LeftToolbar activeTool={activeTool} onToolChange={setActiveTool}
//   snapEnabled={snapEnabled} onSnapToggle={() => setSnapEnabled(s => !s)}
//   onCopy={handleCopy} onCut={handleCut} onPaste={handlePaste} />
```

- [ ] **Step 3: Verify toolbar renders and active tool highlights in blue**

```bash
npm run dev
```

- [ ] **Step 4: Commit**

```bash
git add components/editor/LeftToolbar.tsx app/(editor)/EditorClient.tsx
git commit -m "feat: add left toolbar with tool selection and copy/cut/paste"
```

---

### Task 8: Properties Bar + Keyboard Shortcuts

**Files:**
- Create: `components/editor/PropertiesBar.tsx`
- Modify: `app/(editor)/EditorClient.tsx`

- [ ] **Step 1: Create components/editor/PropertiesBar.tsx**

```tsx
// components/editor/PropertiesBar.tsx
'use client'
import type { FabricObject } from 'fabric'

interface PropertiesBarProps {
  selected: FabricObject | null
  gridSize: number
  onGridSizeChange: (size: number) => void
}

export default function PropertiesBar({ selected, gridSize, onGridSizeChange }: PropertiesBarProps) {
  return (
    <div className="h-8 bg-slate-100 border-b border-slate-200 flex items-center px-3 gap-4 text-xs text-slate-600 shrink-0">
      <span>X: <b>{Math.round(selected?.left ?? 0)}</b></span>
      <span>Y: <b>{Math.round(selected?.top ?? 0)}</b></span>
      <span>W: <b>{Math.round((selected?.width ?? 0) * (selected?.scaleX ?? 1))}</b></span>
      <span>H: <b>{Math.round((selected?.height ?? 0) * (selected?.scaleY ?? 1))}</b></span>
      <div className="ml-auto flex items-center gap-2">
        <span className="text-slate-400">Grid:</span>
        <select value={gridSize} onChange={e => onGridSizeChange(Number(e.target.value))}
          className="border border-slate-300 rounded px-1 py-0.5 text-xs bg-white">
          {[4, 8, 16, 24, 32].map(s => <option key={s} value={s}>{s}px</option>)}
        </select>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add keyboard shortcut useEffect to EditorClient**

```tsx
// In app/(editor)/EditorClient.tsx add:
import { useEffect } from 'react'
import { ActiveSelection } from 'fabric'

useEffect(() => {
  function onKeyDown(e: KeyboardEvent) {
    const canvas = fabricRef.current
    if (!canvas) return
    const active = canvas.getActiveObject() as (FabricObject & { isEditing?: boolean }) | null

    if ((e.key === 'Delete' || e.key === 'Backspace') && active && !active.isEditing) {
      canvas.remove(active); canvas.renderAll()
      e.preventDefault()
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
      const sel = new ActiveSelection(canvas.getObjects(), { canvas })
      canvas.setActiveObject(sel); canvas.renderAll()
      e.preventDefault()
    }
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key) && active) {
      const d = e.shiftKey ? 8 : 1
      active.set({
        left: (active.left ?? 0) + (e.key === 'ArrowLeft' ? -d : e.key === 'ArrowRight' ? d : 0),
        top:  (active.top  ?? 0) + (e.key === 'ArrowUp'   ? -d : e.key === 'ArrowDown'  ? d : 0),
      })
      canvas.renderAll(); e.preventDefault()
    }
  }
  window.addEventListener('keydown', onKeyDown)
  return () => window.removeEventListener('keydown', onKeyDown)
}, [])
```

- [ ] **Step 3: Wire PropertiesBar into EditorClient**

```tsx
// Add state:
const [selectedObj, setSelectedObj] = useState<FabricObject | null>(null)
const [gridSize, setGridSize] = useState(8)

// Pass to Canvas: onSelectionChange={objs => setSelectedObj(objs[0] ?? null)}
// Add PropertiesBar between TopBar and the three-panel flex div:
// <PropertiesBar selected={selectedObj} gridSize={gridSize} onGridSizeChange={setGridSize} />
```

- [ ] **Step 4: Verify**

Select an object — X/Y/W/H update. Press Delete — object removed. Arrow keys nudge object.

- [ ] **Step 5: Commit**

```bash
git add components/editor/PropertiesBar.tsx app/(editor)/EditorClient.tsx
git commit -m "feat: add properties bar and keyboard shortcuts"
```

---

## Phase 3: Data Binding

### Task 9: Placeholder Substitution Engine

**Files:**
- Create: `lib/canvas/placeholders.ts`
- Create: `__tests__/lib/canvas/placeholders.test.ts`

- [ ] **Step 1: Write __tests__/lib/canvas/placeholders.test.ts**

```typescript
import { substitutePlaceholders, extractPlaceholders } from '@/lib/canvas/placeholders'

const sampleJson = {
  objects: [
    { type: 'i-text', text: 'Hello {{emp_name}}' },
    { type: 'i-text', text: '{{emp_dept}} Department' },
    { type: 'rect', fill: '#fff' },
  ]
}

describe('extractPlaceholders', () => {
  it('returns all unique placeholder names', () => {
    const result = extractPlaceholders(sampleJson)
    expect(result).toEqual(expect.arrayContaining(['emp_name', 'emp_dept']))
    expect(result).toHaveLength(2)
  })
})

describe('substitutePlaceholders', () => {
  it('replaces all placeholders with record values', () => {
    const result = substitutePlaceholders(sampleJson, { emp_name: 'Ahmad', emp_dept: 'Finance' })
    expect(result.objects[0].text).toBe('Hello Ahmad')
    expect(result.objects[1].text).toBe('Finance Department')
  })

  it('leaves unmatched placeholders as empty string', () => {
    const result = substitutePlaceholders(sampleJson, {})
    expect(result.objects[0].text).toBe('Hello ')
  })

  it('does not mutate the original JSON', () => {
    substitutePlaceholders(sampleJson, { emp_name: 'X' })
    expect(sampleJson.objects[0].text).toBe('Hello {{emp_name}}')
  })
})
```

- [ ] **Step 2: Run test — confirm FAIL**

```bash
npx jest __tests__/lib/canvas/placeholders.test.ts
```

- [ ] **Step 3: Implement lib/canvas/placeholders.ts**

```typescript
// lib/canvas/placeholders.ts
const RE = /\{\{(\w+)\}\}/g

export function extractPlaceholders(canvasJson: Record<string, unknown>): string[] {
  const found = new Set<string>()
  for (const m of JSON.stringify(canvasJson).matchAll(RE)) found.add(m[1])
  return Array.from(found)
}

export function substitutePlaceholders(
  canvasJson: Record<string, unknown>,
  record: Record<string, string>
): Record<string, unknown> {
  return JSON.parse(
    JSON.stringify(canvasJson).replace(RE, (_, key) => record[key] ?? '')
  )
}
```

- [ ] **Step 4: Run test — confirm PASS**

```bash
npx jest __tests__/lib/canvas/placeholders.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add lib/canvas/placeholders.ts __tests__/lib/canvas/placeholders.test.ts
git commit -m "feat: add placeholder substitution engine with tests"
```

---

### Task 10: Template CRUD API

**Files:**
- Create: `app/api/templates/route.ts`
- Create: `app/api/templates/[id]/route.ts`
- Create: `__tests__/api/templates.test.ts`

- [ ] **Step 1: Write __tests__/api/templates.test.ts**

```typescript
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
```

- [ ] **Step 2: Run test — confirm FAIL**

```bash
npx jest __tests__/api/templates.test.ts
```

- [ ] **Step 3: Implement app/api/templates/route.ts**

```typescript
// app/api/templates/route.ts
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json(
    await prisma.template.findMany({ orderBy: { updatedAt: 'desc' } })
  )
}

export async function POST(req: NextRequest) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { name, canvasJson, pageSize } = await req.json()
  const template = await prisma.template.create({
    data: { name, canvasJson, pageSize: pageSize ?? 'A4' },
  })
  return NextResponse.json(template, { status: 201 })
}
```

- [ ] **Step 4: Implement app/api/templates/[id]/route.ts**

```typescript
// app/api/templates/[id]/route.ts
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const t = await prisma.template.findUnique({ where: { id: params.id } })
  return t ? NextResponse.json(t) : NextResponse.json({ error: 'Not found' }, { status: 404 })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { name, canvasJson, pageSize } = await req.json()
  return NextResponse.json(
    await prisma.template.update({ where: { id: params.id }, data: { name, canvasJson, pageSize } })
  )
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await prisma.template.delete({ where: { id: params.id } })
  return new NextResponse(null, { status: 204 })
}
```

- [ ] **Step 5: Run tests — confirm PASS**

```bash
npx jest __tests__/api/templates.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add app/api/templates/ __tests__/api/templates.test.ts
git commit -m "feat: add template CRUD API with tests"
```

---

### Task 11: Data Source API + Schema Introspection

**Files:**
- Create: `lib/db/introspect.ts`
- Create: `lib/db/records.ts`
- Create: `app/api/databases/route.ts`
- Create: `app/api/databases/[id]/route.ts`
- Create: `app/api/databases/[id]/schema/route.ts`
- Create: `app/api/records/route.ts`

- [ ] **Step 1: Implement lib/db/introspect.ts**

```typescript
// lib/db/introspect.ts
import { Client } from 'pg'

export interface ColumnSchema { name: string; type: string }
export interface TableSchema { table: string; columns: ColumnSchema[] }

export async function getTables(connectionUrl: string): Promise<TableSchema[]> {
  const client = new Client({ connectionString: connectionUrl })
  await client.connect()
  try {
    const { rows } = await client.query(`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `)
    const map = new Map<string, ColumnSchema[]>()
    for (const row of rows) {
      if (!map.has(row.table_name)) map.set(row.table_name, [])
      map.get(row.table_name)!.push({ name: row.column_name, type: row.data_type })
    }
    return Array.from(map.entries()).map(([table, columns]) => ({ table, columns }))
  } finally {
    await client.end()
  }
}
```

- [ ] **Step 2: Implement lib/db/records.ts**

```typescript
// lib/db/records.ts
import { Client } from 'pg'

export async function getRecords(
  connectionUrl: string, table: string, limit = 100
): Promise<Record<string, string>[]> {
  const client = new Client({ connectionString: connectionUrl })
  await client.connect()
  try {
    const { rows } = await client.query(`SELECT * FROM "${table}" LIMIT $1`, [limit])
    return rows.map(row =>
      Object.fromEntries(Object.entries(row).map(([k, v]) => [k, String(v ?? '')]))
    )
  } finally {
    await client.end()
  }
}
```

- [ ] **Step 3: Implement app/api/databases/route.ts**

```typescript
// app/api/databases/route.ts
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { encrypt } from '@/lib/encrypt'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const sources = await prisma.dataSource.findMany()
  return NextResponse.json(sources.map(s => ({ id: s.id, name: s.name, createdAt: s.createdAt })))
}

export async function POST(req: NextRequest) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { name, connectionUrl } = await req.json()
  const source = await prisma.dataSource.create({
    data: { name, connectionUrl: encrypt(connectionUrl) },
  })
  return NextResponse.json({ id: source.id, name: source.name }, { status: 201 })
}
```

- [ ] **Step 4: Implement app/api/databases/[id]/route.ts**

```typescript
// app/api/databases/[id]/route.ts
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await prisma.dataSource.delete({ where: { id: params.id } })
  return new NextResponse(null, { status: 204 })
}
```

- [ ] **Step 5: Implement app/api/databases/[id]/schema/route.ts**

```typescript
// app/api/databases/[id]/schema/route.ts
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/encrypt'
import { getTables } from '@/lib/db/introspect'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const source = await prisma.dataSource.findUnique({ where: { id: params.id } })
  if (!source) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(await getTables(decrypt(source.connectionUrl)))
}
```

- [ ] **Step 6: Implement app/api/records/route.ts**

```typescript
// app/api/records/route.ts
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/encrypt'
import { getRecords } from '@/lib/db/records'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const sourceId = searchParams.get('sourceId')!
  const table = searchParams.get('table')!
  const source = await prisma.dataSource.findUnique({ where: { id: sourceId } })
  if (!source) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(await getRecords(decrypt(source.connectionUrl), table))
}
```

- [ ] **Step 7: Commit**

```bash
git add lib/db/ app/api/databases/ app/api/records/
git commit -m "feat: add data source management and schema introspection API"
```

---

### Task 12: Right Pane Field Browser

**Files:**
- Create: `components/editor/RightPane.tsx`
- Modify: `app/(editor)/EditorClient.tsx`

- [ ] **Step 1: Create components/editor/RightPane.tsx**

```tsx
// components/editor/RightPane.tsx
'use client'
import { useEffect, useState } from 'react'

interface Column { name: string; type: string }
interface TableSchema { table: string; columns: Column[] }

interface RightPaneProps {
  onFieldDrop: (field: string, x: number, y: number) => void
  onRecordChange: (record: Record<string, string>) => void
}

export default function RightPane({ onFieldDrop, onRecordChange }: RightPaneProps) {
  const [sources, setSources] = useState<{ id: string; name: string }[]>([])
  const [sourceId, setSourceId] = useState('')
  const [schema, setSchema] = useState<TableSchema[]>([])
  const [search, setSearch] = useState('')
  const [records, setRecords] = useState<Record<string, string>[]>([])
  const [activeRecord, setActiveRecord] = useState<Record<string, string> | null>(null)

  useEffect(() => {
    fetch('/api/databases').then(r => r.json()).then(setSources)
  }, [])

  useEffect(() => {
    if (!sourceId) return
    fetch(`/api/databases/${sourceId}/schema`).then(r => r.json()).then(setSchema)
  }, [sourceId])

  async function loadRecords(table: string) {
    if (!sourceId) return
    const rows: Record<string, string>[] = await fetch(
      `/api/records?sourceId=${sourceId}&table=${table}`
    ).then(r => r.json())
    setRecords(rows)
    if (rows[0]) { setActiveRecord(rows[0]); onRecordChange(rows[0]) }
  }

  const filtered = schema
    .map(t => ({ ...t, columns: t.columns.filter(c =>
      `${t.table}.${c.name}`.toLowerCase().includes(search.toLowerCase())
    )}))
    .filter(t => t.columns.length > 0)

  return (
    <div className="w-52 bg-slate-50 border-l border-slate-200 flex flex-col text-xs shrink-0">
      <div className="px-3 py-2 bg-slate-800 text-slate-200 font-semibold text-xs">📦 Data Fields</div>
      <div className="px-2 py-1 border-b border-slate-200">
        <select value={sourceId} onChange={e => setSourceId(e.target.value)}
          className="w-full border border-slate-300 rounded px-1 py-0.5 text-xs bg-white">
          <option value="">Select data source…</option>
          {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      <div className="px-2 py-1 border-b border-slate-200">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Search fields…"
          className="w-full border border-slate-300 rounded px-2 py-0.5 text-xs" />
      </div>
      <div className="flex-1 overflow-y-auto">
        {filtered.map(({ table, columns }) => (
          <div key={table}>
            <div className="px-2 py-0.5 bg-slate-200 text-slate-500 uppercase tracking-wide font-semibold text-[9px] cursor-pointer"
              onClick={() => loadRecords(table)}>
              {table}
            </div>
            {columns.map(col => (
              <div key={col.name}
                draggable
                onDragStart={e => e.dataTransfer.setData('text/plain', `{{${col.name}}}`)}
                className="px-3 py-0.5 text-sky-600 hover:bg-sky-50 cursor-grab active:cursor-grabbing">
                {`{{${col.name}}}`}
              </div>
            ))}
          </div>
        ))}
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
    </div>
  )
}
```

- [ ] **Step 2: Wire RightPane + field drop into EditorClient**

```tsx
// In app/(editor)/EditorClient.tsx:
import RightPane from '@/components/editor/RightPane'
import { addTextBox } from '@/lib/canvas/elements'
import { type IText } from 'fabric'

// Add state:
const [activeRecord, setActiveRecord] = useState<Record<string, string>>({})

// Add handler:
function handleFieldDrop(field: string, x: number, y: number) {
  const canvas = fabricRef.current
  if (!canvas) return
  const obj = addTextBox(canvas, x, y, field) as IText
  canvas.setActiveObject(obj)
  canvas.renderAll()
}

// Replace right pane placeholder div with:
// <RightPane onFieldDrop={handleFieldDrop} onRecordChange={setActiveRecord} />
```

- [ ] **Step 3: Verify field drag-and-drop**

Start dev server → go to Settings → add a data source → return to editor → right pane shows tables/fields → drag a field onto canvas → `{{field_name}}` text object appears.

- [ ] **Step 4: Commit**

```bash
git add components/editor/RightPane.tsx app/(editor)/EditorClient.tsx
git commit -m "feat: add right pane field browser with drag-to-canvas support"
```

---

### Task 13: Save & Load Templates in Editor

**Files:**
- Modify: `app/(editor)/EditorClient.tsx`

- [ ] **Step 1: Add save and load logic to EditorClient**

```tsx
// In app/(editor)/EditorClient.tsx:
import { useSearchParams, useRouter } from 'next/navigation'

const searchParams = useSearchParams()
const router = useRouter()
const [templateId, setTemplateId] = useState<string | null>(searchParams.get('id'))
const [templateName, setTemplateName] = useState('Untitled Memo')

// Load template on mount if id param present
useEffect(() => {
  if (!templateId) return
  fetch(`/api/templates/${templateId}`)
    .then(r => r.json())
    .then(t => {
      setTemplateName(t.name)
      const canvas = fabricRef.current
      if (canvas && t.canvasJson) canvas.loadFromJSON(t.canvasJson, () => canvas.renderAll())
    })
}, [templateId])

async function handleSave() {
  const canvas = fabricRef.current
  if (!canvas) return
  const canvasJson = canvas.toJSON()
  if (templateId) {
    await fetch(`/api/templates/${templateId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: templateName, canvasJson, pageSize: 'A4' }),
    })
  } else {
    const res = await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: templateName, canvasJson, pageSize: 'A4' }),
    })
    const t = await res.json()
    setTemplateId(t.id)
    router.replace(`/?id=${t.id}`)
  }
}
```

- [ ] **Step 2: Connect handleSave to TopBar onSave prop**

Pass `onSave={handleSave}` to `<TopBar>`.

- [ ] **Step 3: Verify save and reload**

Design a template → Save → note URL changes to `/?id=<uuid>` → refresh page → canvas restores.

- [ ] **Step 4: Commit**

```bash
git add app/(editor)/EditorClient.tsx
git commit -m "feat: add template save and load in editor"
```

---

## Phase 4: Export Pipeline

### Task 14: Word Export

**Files:**
- Create: `lib/export/word.ts`
- Create: `__tests__/lib/export/word.test.ts`

- [ ] **Step 1: Write __tests__/lib/export/word.test.ts**

```typescript
import { buildDocx, canvasJsonToDocElements } from '@/lib/export/word'

describe('canvasJsonToDocElements', () => {
  it('extracts text elements from canvas JSON', () => {
    const json = {
      objects: [
        { type: 'i-text', text: 'Hello World', fontSize: 14, fontWeight: 'normal' },
        { type: 'rect', fill: '#fff' },
      ]
    }
    const elements = canvasJsonToDocElements(json)
    expect(elements).toHaveLength(1)
    expect(elements[0].text).toBe('Hello World')
    expect(elements[0].fontSize).toBe(14)
  })
})

describe('buildDocx', () => {
  it('returns a non-empty Buffer', async () => {
    const buf = await buildDocx([{ type: 'text', text: 'Test', fontSize: 12, bold: false }])
    expect(buf).toBeInstanceOf(Buffer)
    expect(buf.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run test — confirm FAIL**

```bash
npx jest __tests__/lib/export/word.test.ts
```

- [ ] **Step 3: Implement lib/export/word.ts**

```typescript
// lib/export/word.ts
import { Document, Paragraph, TextRun, Packer } from 'docx'

export interface TextElement { type: 'text'; text: string; fontSize: number; bold: boolean }
export type DocElement = TextElement

export function canvasJsonToDocElements(canvasJson: Record<string, unknown>): DocElement[] {
  const objects = (canvasJson.objects as Record<string, unknown>[]) ?? []
  return objects
    .filter(o => o.type === 'i-text' || o.type === 'textbox')
    .map(o => ({
      type: 'text' as const,
      text: String(o.text ?? ''),
      fontSize: Number(o.fontSize ?? 12),
      bold: o.fontWeight === 'bold',
    }))
}

export async function buildDocx(elements: DocElement[]): Promise<Buffer> {
  const paragraphs = elements.map(el =>
    new Paragraph({
      children: [new TextRun({ text: el.text, size: el.fontSize * 2, bold: el.bold })],
    })
  )
  const doc = new Document({ sections: [{ children: paragraphs }] })
  return Buffer.from(await Packer.toBuffer(doc))
}
```

- [ ] **Step 4: Run test — confirm PASS**

```bash
npx jest __tests__/lib/export/word.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add lib/export/word.ts __tests__/lib/export/word.test.ts
git commit -m "feat: add Word export with tests"
```

---

### Task 15: PDF + Image Export + Export API

**Files:**
- Create: `lib/export/pdf.ts`
- Create: `lib/export/image.ts`
- Create: `app/api/export/route.ts`

- [ ] **Step 1: Implement lib/export/pdf.ts**

```typescript
// lib/export/pdf.ts
import puppeteer from 'puppeteer'

export function canvasJsonToHtml(canvasJson: Record<string, unknown>, pageWidth = 794): string {
  const objects = (canvasJson.objects as Record<string, unknown>[]) ?? []
  const elements = objects.map(obj => {
    const s = `position:absolute;left:${obj.left}px;top:${obj.top}px;`
    if (obj.type === 'i-text' || obj.type === 'textbox') {
      return `<div style="${s}font-size:${obj.fontSize}px;font-family:${obj.fontFamily ?? 'sans-serif'};color:${obj.fill};width:${obj.width}px;white-space:pre-wrap">${String(obj.text ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;')}</div>`
    }
    if (obj.type === 'rect') {
      return `<div style="${s}width:${obj.width}px;height:${obj.height}px;background:${obj.fill};border:${obj.strokeWidth}px solid ${obj.stroke}"></div>`
    }
    return ''
  }).join('')
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;width:${pageWidth}px;min-height:1123px;position:relative;">${elements}</body></html>`
}

export async function generatePdf(html: string): Promise<Buffer> {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] })
  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const pdf = await page.pdf({
      format: 'A4', printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    })
    return Buffer.from(pdf)
  } finally {
    await browser.close()
  }
}
```

- [ ] **Step 2: Implement lib/export/image.ts**

```typescript
// lib/export/image.ts
export function dataUrlToBuffer(dataUrl: string): Buffer {
  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '')
  return Buffer.from(base64, 'base64')
}
```

- [ ] **Step 3: Implement app/api/export/route.ts**

```typescript
// app/api/export/route.ts
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/encrypt'
import { getRecords } from '@/lib/db/records'
import { substitutePlaceholders } from '@/lib/canvas/placeholders'
import { generatePdf, canvasJsonToHtml } from '@/lib/export/pdf'
import { dataUrlToBuffer } from '@/lib/export/image'
import { buildDocx, canvasJsonToDocElements } from '@/lib/export/word'
import { deliverWebhook } from '@/lib/webhook/outbound'
import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'

const EXPORTS_DIR = path.join(process.cwd(), 'exports')

export async function POST(req: NextRequest) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { templateId, recordId, format, sourceId, table, canvasDataUrl } = await req.json()

  const template = await prisma.template.findUnique({ where: { id: templateId } })
  if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 })

  let record: Record<string, string> = {}
  if (sourceId && table) {
    const source = await prisma.dataSource.findUnique({ where: { id: sourceId } })
    if (source) {
      const rows = await getRecords(decrypt(source.connectionUrl), table)
      record = rows.find(r => Object.values(r)[0] === String(recordId)) ?? rows[0] ?? {}
    }
  }

  const filled = substitutePlaceholders(template.canvasJson as Record<string, unknown>, record)
  await fs.mkdir(EXPORTS_DIR, { recursive: true })

  const jobId = crypto.randomUUID()
  let buffer: Buffer
  let ext: string

  if (format === 'pdf') {
    buffer = await generatePdf(canvasJsonToHtml(filled)); ext = 'pdf'
  } else if (format === 'image') {
    buffer = dataUrlToBuffer(canvasDataUrl); ext = 'png'
  } else {
    buffer = await buildDocx(canvasJsonToDocElements(filled)); ext = 'docx'
  }

  const filePath = path.join(EXPORTS_DIR, `${jobId}.${ext}`)
  await fs.writeFile(filePath, buffer)

  await prisma.exportJob.create({
    data: { templateId, recordId: String(recordId ?? ''), format, status: 'done', filePath, triggeredBy: 'ui' },
  })

  const downloadUrl = `/api/export/${jobId}.${ext}`

  const webhookConfig = await prisma.webhookConfig.findFirst()
  if (webhookConfig?.outboundUrl && webhookConfig.outboundEvents.includes('export.completed')) {
    await deliverWebhook(webhookConfig, {
      event: 'export.completed', templateId, recordId: String(recordId ?? ''),
      format, downloadUrl, timestamp: new Date().toISOString(),
    })
  }

  return NextResponse.json({ downloadUrl })
}
```

- [ ] **Step 4: Add export file download route**

```typescript
// app/api/export/[filename]/route.ts
import { auth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

export async function GET(_: NextRequest, { params }: { params: { filename: string } }) {
  if (!await auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const filePath = path.join(process.cwd(), 'exports', params.filename)
  try {
    const file = await fs.readFile(filePath)
    const ext = path.extname(params.filename).slice(1)
    const mimeMap: Record<string, string> = {
      pdf: 'application/pdf',
      png: 'image/png',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    }
    return new NextResponse(file, {
      headers: {
        'Content-Type': mimeMap[ext] ?? 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${params.filename}"`,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
```

- [ ] **Step 5: Wire Export button in EditorClient**

```tsx
// In app/(editor)/EditorClient.tsx, implement handleExport:
async function handleExport(format: 'pdf' | 'image' | 'word') {
  const canvas = fabricRef.current
  if (!canvas || !templateId) { alert('Save the template first'); return }
  let canvasDataUrl: string | undefined
  if (format === 'image') canvasDataUrl = canvas.toDataURL({ format: 'png', multiplier: 1 })

  const res = await fetch('/api/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ templateId, format, canvasDataUrl }),
  })
  const { downloadUrl } = await res.json()
  window.open(downloadUrl, '_blank')
}
```

- [ ] **Step 6: Verify exports**

Save a template with a text box → Export PDF → file downloads. Export Image → PNG downloads. Export Word → DOCX downloads.

- [ ] **Step 7: Commit**

```bash
git add lib/export/pdf.ts lib/export/image.ts app/api/export/
git commit -m "feat: add PDF, image, and Word export pipeline"
```

---

### Task 16: Print Preview Page

**Files:**
- Create: `app/preview/[templateId]/page.tsx`
- Create: `app/preview/[templateId]/PreviewCanvas.tsx`

- [ ] **Step 1: Create app/preview/[templateId]/PreviewCanvas.tsx**

```tsx
// app/preview/[templateId]/PreviewCanvas.tsx
'use client'
import { useEffect, useRef } from 'react'
import { Canvas as FabricCanvas } from 'fabric'

export default function PreviewCanvas({ canvasJson }: { canvasJson: object }) {
  const elRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!elRef.current) return
    const canvas = new FabricCanvas(elRef.current, {
      width: 794, height: 1123, backgroundColor: '#ffffff',
      selection: false, interactive: false,
    })
    canvas.loadFromJSON(canvasJson, () => canvas.renderAll())
    return () => { canvas.dispose() }
  }, [])

  return <canvas ref={elRef} />
}
```

- [ ] **Step 2: Create app/preview/[templateId]/page.tsx**

```tsx
// app/preview/[templateId]/page.tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import PreviewCanvas from './PreviewCanvas'

export default async function PreviewPage({ params }: { params: { templateId: string } }) {
  const session = await auth()
  if (!session) redirect('/login')
  const template = await prisma.template.findUnique({ where: { id: params.templateId } })
  if (!template) return <div>Template not found</div>

  return (
    <>
      <style>{`@media print { .no-print { display: none !important; } body { margin: 0; } }`}</style>
      <div className="no-print fixed top-3 right-3 flex gap-2 z-50">
        <button onClick={() => window.print()}
          className="bg-indigo-500 text-white px-4 py-2 rounded text-sm shadow">
          🖨 Print
        </button>
        <button onClick={() => window.close()}
          className="bg-slate-500 text-white px-4 py-2 rounded text-sm shadow">
          Close
        </button>
      </div>
      <div className="w-[794px] mx-auto bg-white shadow-lg">
        <PreviewCanvas canvasJson={template.canvasJson as object} />
      </div>
    </>
  )
}
```

- [ ] **Step 3: Wire Preview button in EditorClient**

```tsx
// In app/(editor)/EditorClient.tsx:
function handlePreview() {
  if (!templateId) { alert('Save the template first'); return }
  window.open(`/preview/${templateId}`, '_blank')
}
// Pass to TopBar: onPreview={handlePreview}
```

- [ ] **Step 4: Verify print flow**

Save template → Preview → new tab opens with clean canvas → click Print → browser print dialog opens with no UI chrome.

- [ ] **Step 5: Commit**

```bash
git add app/preview/
git commit -m "feat: add print preview page with window.print() support"
```

---

## Phase 5: Webhook API

### Task 17: Webhook System

**Files:**
- Create: `lib/webhook/verify.ts`
- Create: `lib/webhook/outbound.ts`
- Create: `app/api/webhook/trigger/route.ts`
- Create: `__tests__/api/webhook-trigger.test.ts`

- [ ] **Step 1: Write __tests__/api/webhook-trigger.test.ts**

```typescript
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
```

- [ ] **Step 2: Run test — confirm FAIL**

```bash
npx jest __tests__/api/webhook-trigger.test.ts
```

- [ ] **Step 3: Implement lib/webhook/verify.ts**

```typescript
// lib/webhook/verify.ts
import type { NextRequest } from 'next/server'

export function verifyBearerToken(req: NextRequest, expectedSecret: string): boolean {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/, '')
  return token.length > 0 && token === expectedSecret
}
```

- [ ] **Step 4: Implement lib/webhook/outbound.ts**

```typescript
// lib/webhook/outbound.ts
import crypto from 'crypto'

interface WebhookConfig { outboundUrl: string | null; outboundSecret: string | null }

export async function deliverWebhook(
  config: WebhookConfig,
  payload: Record<string, unknown>
): Promise<void> {
  if (!config.outboundUrl) return
  const body = JSON.stringify(payload)
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (config.outboundSecret) {
    headers['X-MemoBuilder-Signature'] =
      'sha256=' + crypto.createHmac('sha256', config.outboundSecret).update(body).digest('hex')
  }
  await fetch(config.outboundUrl, { method: 'POST', headers, body })
}
```

- [ ] **Step 5: Implement app/api/webhook/trigger/route.ts**

```typescript
// app/api/webhook/trigger/route.ts
import { prisma } from '@/lib/prisma'
import { verifyBearerToken } from '@/lib/webhook/verify'
import { decrypt } from '@/lib/encrypt'
import { getRecords } from '@/lib/db/records'
import { substitutePlaceholders } from '@/lib/canvas/placeholders'
import { generatePdf, canvasJsonToHtml } from '@/lib/export/pdf'
import { buildDocx, canvasJsonToDocElements } from '@/lib/export/word'
import { deliverWebhook } from '@/lib/webhook/outbound'
import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'

const EXPORTS_DIR = path.join(process.cwd(), 'exports')

export async function POST(req: NextRequest) {
  const config = await prisma.webhookConfig.findFirst()
  if (!config || !verifyBearerToken(req, config.inboundSecret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { template_id, record_id, format = 'pdf', source_id, table } = await req.json()

  const template = await prisma.template.findUnique({ where: { id: template_id } })
  if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 })

  let record: Record<string, string> = {}
  if (source_id && table) {
    const source = await prisma.dataSource.findUnique({ where: { id: source_id } })
    if (source) {
      const rows = await getRecords(decrypt(source.connectionUrl), table)
      record = rows.find(r => Object.values(r)[0] === String(record_id)) ?? {}
    }
  }

  const filled = substitutePlaceholders(template.canvasJson as Record<string, unknown>, record)
  await fs.mkdir(EXPORTS_DIR, { recursive: true })
  const jobId = crypto.randomUUID()

  const buffer = format === 'word'
    ? await buildDocx(canvasJsonToDocElements(filled))
    : await generatePdf(canvasJsonToHtml(filled))
  const ext = format === 'word' ? 'docx' : 'pdf'

  await fs.writeFile(path.join(EXPORTS_DIR, `${jobId}.${ext}`), buffer)
  await prisma.exportJob.create({
    data: { templateId: template_id, recordId: String(record_id), format, status: 'done',
      filePath: path.join(EXPORTS_DIR, `${jobId}.${ext}`), triggeredBy: 'webhook' },
  })

  const downloadUrl = `/api/export/${jobId}.${ext}`
  if (config.outboundUrl && config.outboundEvents.includes('export.completed')) {
    await deliverWebhook(config, {
      event: 'export.completed', template_id, record_id, format, downloadUrl,
      timestamp: new Date().toISOString(),
    })
  }

  return NextResponse.json({ status: 'ok', download_url: downloadUrl })
}
```

- [ ] **Step 6: Run tests — confirm PASS**

```bash
npx jest __tests__/api/webhook-trigger.test.ts
```

- [ ] **Step 7: Commit**

```bash
git add lib/webhook/ app/api/webhook/trigger/ __tests__/api/webhook-trigger.test.ts
git commit -m "feat: add inbound webhook trigger and outbound HMAC-signed delivery"
```

---

## Phase 6: Settings Page

### Task 18: Settings UI

**Files:**
- Create: `components/settings/DataSourceForm.tsx`
- Create: `components/settings/WebhookConfigForm.tsx`
- Create: `app/api/webhook/config/route.ts`
- Create: `app/settings/page.tsx`

- [ ] **Step 1: Create components/settings/DataSourceForm.tsx**

```tsx
// components/settings/DataSourceForm.tsx
'use client'
import { useEffect, useState } from 'react'

interface DataSource { id: string; name: string }

export default function DataSourceForm() {
  const [sources, setSources] = useState<DataSource[]>([])
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')

  async function load() {
    setSources(await fetch('/api/databases').then(r => r.json()))
  }
  useEffect(() => { load() }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    await fetch('/api/databases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, connectionUrl: url }),
    })
    setName(''); setUrl(''); load()
  }

  async function handleDelete(id: string) {
    await fetch(`/api/databases/${id}`, { method: 'DELETE' }); load()
  }

  return (
    <section>
      <h2 className="font-semibold text-slate-700 mb-3">Data Sources</h2>
      <form onSubmit={handleAdd} className="flex gap-2 mb-4">
        <input value={name} onChange={e => setName(e.target.value)}
          placeholder="Name" required
          className="border border-slate-300 rounded px-2 py-1 text-sm w-28" />
        <input value={url} onChange={e => setUrl(e.target.value)}
          placeholder="postgresql://user:pass@host/db" required
          className="border border-slate-300 rounded px-2 py-1 text-sm flex-1" />
        <button type="submit"
          className="bg-sky-500 text-white rounded px-3 py-1 text-sm">Add</button>
      </form>
      <ul className="space-y-2">
        {sources.map(s => (
          <li key={s.id} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm">
            <span>{s.name}</span>
            <button onClick={() => handleDelete(s.id)}
              className="text-red-500 hover:text-red-700 text-xs">Remove</button>
          </li>
        ))}
      </ul>
    </section>
  )
}
```

- [ ] **Step 2: Create components/settings/WebhookConfigForm.tsx**

```tsx
// components/settings/WebhookConfigForm.tsx
'use client'
import { useEffect, useState } from 'react'

interface Config { inboundSecret: string; outboundUrl: string; outboundSecret: string }

export default function WebhookConfigForm() {
  const [cfg, setCfg] = useState<Config>({ inboundSecret: '', outboundUrl: '', outboundSecret: '' })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/webhook/config').then(r => r.json()).then(d => { if (d) setCfg(d) })
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    await fetch('/api/webhook/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cfg),
    })
    setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  return (
    <section>
      <h2 className="font-semibold text-slate-700 mb-3">Webhook Configuration</h2>
      <form onSubmit={handleSave} className="space-y-3 max-w-lg">
        {[
          { label: 'Inbound Bearer Secret', key: 'inboundSecret', placeholder: 'Token for POST /api/webhook/trigger', mono: true },
          { label: 'Outbound URL', key: 'outboundUrl', placeholder: 'https://your-app.com/webhook', mono: false },
          { label: 'Outbound Signing Secret (HMAC-SHA256)', key: 'outboundSecret', placeholder: 'Shared secret for X-MemoBuilder-Signature', mono: true },
        ].map(({ label, key, placeholder, mono }) => (
          <div key={key}>
            <label className="block text-xs text-slate-500 mb-1">{label}</label>
            <input value={cfg[key as keyof Config]}
              onChange={e => setCfg(c => ({ ...c, [key]: e.target.value }))}
              placeholder={placeholder}
              className={`w-full border border-slate-300 rounded px-2 py-1 text-sm ${mono ? 'font-mono' : ''}`} />
          </div>
        ))}
        <button type="submit"
          className="bg-indigo-500 text-white rounded px-4 py-1.5 text-sm">
          {saved ? '✓ Saved' : 'Save'}
        </button>
      </form>
    </section>
  )
}
```

- [ ] **Step 3: Create app/api/webhook/config/route.ts**

```typescript
// app/api/webhook/config/route.ts
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
```

- [ ] **Step 4: Create app/settings/page.tsx**

```tsx
// app/settings/page.tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import DataSourceForm from '@/components/settings/DataSourceForm'
import WebhookConfigForm from '@/components/settings/WebhookConfigForm'

export default async function SettingsPage() {
  if (!await auth()) redirect('/login')
  return (
    <div className="max-w-2xl mx-auto p-8 space-y-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
        <a href="/" className="text-sky-500 text-sm hover:underline">← Back to Editor</a>
      </div>
      <DataSourceForm />
      <hr className="border-slate-200" />
      <WebhookConfigForm />
    </div>
  )
}
```

- [ ] **Step 5: Add Settings link to TopBar**

```tsx
// In components/editor/TopBar.tsx, add before Sign out button:
<a href="/settings"
  className="text-slate-400 hover:text-white text-xs px-2">
  Settings
</a>
```

- [ ] **Step 6: Verify settings page**

Navigate to `/settings` → add a data source → confirm it appears in the list → configure webhook → save → confirm settings persist on reload.

- [ ] **Step 7: Commit**

```bash
git add components/settings/ app/api/webhook/config/ app/settings/ components/editor/TopBar.tsx
git commit -m "feat: add settings page for data sources and webhook configuration"
```

---

## Final Verification

- [ ] **Run all tests**

```bash
npx jest --coverage
```

Expected: All tests pass. No failing suites.

- [ ] **End-to-end smoke test**

```bash
npm run dev
```

Run through each scenario:

1. Visit `http://localhost:3000` → redirected to `/login`
2. Sign in → editor shell renders
3. Go to Settings → add a PostgreSQL connection string → tables appear
4. Return to editor → drag `{{field_name}}` from right pane → text object appears on canvas
5. Add text box, table, image placeholder, page break
6. Save template → URL updates to `/?id=<uuid>` → refresh → canvas restores
7. Click Preview → new tab opens with clean canvas render → Print button triggers browser dialog
8. Export PDF → file downloads, content matches canvas
9. Export Image → PNG downloads
10. Export Word → DOCX downloads, content readable in LibreOffice
11. POST to `/api/webhook/trigger` with correct Bearer token → `{ download_url }` returned
12. Configure outbound URL in Settings → trigger export via UI → POST received at target URL with `X-MemoBuilder-Signature` header

- [ ] **Final commit**

```bash
git add -A
git commit -m "feat: memo builder — complete implementation"
```
