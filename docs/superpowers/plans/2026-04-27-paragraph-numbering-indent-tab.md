# Paragraph Numbering, Indent & Tab — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a floating paragraph toolbar to the canvas editor that configures numbering style, outline level, left indent, and tab stop — stored in the Fabric.js `data` property and exported correctly to Word (indent, hanging indent, tab stops, and Word abstract numbering).

**Architecture:** The toolbar is a pure React component (`ParagraphToolbar.tsx`) that receives props from `EditorClient.tsx`. When a paragraph Textbox is selected, EditorClient computes the toolbar position from the Fabric canvas bounding rect + object bounding rect and passes the current `data` values. Toolbar `onChange` writes directly back to the live Fabric object and calls `canvas.renderAll()`. The word exporter reads the new fields from the canvas JSON and emits Word numbering config + paragraph indent/tabStops.

**Tech Stack:** Next.js 14, React 18, Fabric.js 6.9.1, docx 9.6.1, TypeScript 5, Jest 29

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/lib/canvas/elements.ts` | Modify | Add numbering defaults to `addParagraph()` |
| `src/components/editor/ParagraphToolbar.tsx` | **Create** | Floating toolbar UI — pure React, no Fabric knowledge |
| `src/app/(editor)/EditorClient.tsx` | Modify | Show/hide/position toolbar; write changes to Fabric object |
| `src/lib/export/word.ts` | Modify | Extract new fields; emit numbering config + paragraph indent |
| `__tests__/lib/export/word.test.ts` | Modify | Tests for new export fields |
| `.claude/worktrees/hungry-raman-2c2e2b/__tests__/lib/export/word.test.ts` | Modify | Keep in sync with main tests |

---

## Task 1: Extend `addParagraph()` data defaults

**Files:**
- Modify: `src/lib/canvas/elements.ts`

- [ ] **Step 1: Add numbering fields to the `data` object in `addParagraph()`**

In `src/lib/canvas/elements.ts`, replace the existing `data` object inside `addParagraph`:

```ts
export function addParagraph(canvas: FabricCanvas, x = 48, y = 48) {
  const obj = new Textbox('Enter paragraph text here...', {
    left:       snapToGrid(x, G),
    top:        snapToGrid(y, G),
    width:      320,
    fontSize:   13,
    fontFamily: 'Inter, sans-serif',
    fill:       '#1e293b',
    textAlign:  'left',
    lineHeight: 1.4,
    data: {
      type:          'paragraph',
      textTransform: 'none',
      numbering:     'none',
      level:         1,
      indent:        0,
      tabStop:       0,
    },
  })
  canvas.add(obj)
  canvas.setActiveObject(obj)
  canvas.renderAll()
  return obj
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/canvas/elements.ts
git commit -m "feat(paragraph): add numbering/indent/tabStop defaults to addParagraph"
```

---

## Task 2: Extend word.ts — interfaces and field extraction

**Files:**
- Modify: `src/lib/export/word.ts`
- Modify: `__tests__/lib/export/word.test.ts`
- Modify: `.claude/worktrees/hungry-raman-2c2e2b/__tests__/lib/export/word.test.ts`

- [ ] **Step 1: Write the failing test**

In `__tests__/lib/export/word.test.ts`, add a new describe block after the existing ones:

```ts
describe('canvasJsonToDocElements – numbering/indent extraction', () => {
  it('extracts numbering fields from paragraph data', () => {
    const json = {
      objects: [
        {
          type: 'Textbox',
          text: 'a) First item',
          fontSize: 12,
          top: 0,
          left: 0,
          scaleX: 1,
          data: { type: 'paragraph', numbering: 'alpha', level: 2, indent: 72, tabStop: 36 },
        },
      ],
    }
    const elements = canvasJsonToDocElements(json)
    const row = elements.find(e => e.type === 'row') as Extract<typeof elements[0], { type: 'row' }>
    expect(row.items[0].numbering).toBe('alpha')
    expect(row.items[0].level).toBe(2)
    expect(row.items[0].indent).toBe(72)
    expect(row.items[0].tabStop).toBe(36)
  })

  it('defaults numbering fields when data is absent', () => {
    const json = {
      objects: [
        { type: 'IText', text: 'Hello', fontSize: 12, top: 0, left: 0, scaleX: 1 },
      ],
    }
    const elements = canvasJsonToDocElements(json)
    const row = elements.find(e => e.type === 'row') as Extract<typeof elements[0], { type: 'row' }>
    expect(row.items[0].numbering).toBe('none')
    expect(row.items[0].level).toBe(1)
    expect(row.items[0].indent).toBe(0)
    expect(row.items[0].tabStop).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /home/faizalamat/memo-builder && npm test -- --testPathPattern=word 2>&1 | tail -20
```

Expected: FAIL — `row.items[0].numbering` is `undefined`.

- [ ] **Step 3: Extend `CanvasObj` interface in `src/lib/export/word.ts`**

Extend the existing `data` field in `CanvasObj` to include the new fields:

```ts
interface CanvasObj {
  type?: unknown; text?: unknown; fontSize?: unknown; fontWeight?: unknown
  top?: unknown; left?: unknown; scaleX?: unknown; scaleY?: unknown
  width?: unknown; height?: unknown; src?: unknown
  fontFamily?: unknown; fill?: unknown; fontStyle?: unknown
  underline?: unknown; textAlign?: unknown; lineHeight?: unknown
  data?: {
    textTransform?: string
    numbering?: 'none' | 'alpha' | 'outline'
    level?: number
    indent?: number
    tabStop?: number
    [key: string]: unknown
  }
}
```

- [ ] **Step 4: Export `TextItem` interface with new fields**

Replace the existing `TextItem` interface (add `export` so tests can import it):

```ts
export interface TextItem {
  text: string; fontSize: number; bold: boolean; italic: boolean
  underline: boolean; color: string; fontFamily: string
  textAlign: string; lineHeight: number; left: number
  numbering: 'none' | 'alpha' | 'outline'
  level: number
  indent: number
  tabStop: number
}
```

- [ ] **Step 5: Extract new fields in `canvasJsonToDocElements`**

In the `.map(o => ({ ... }))` block inside `canvasJsonToDocElements`, add the four new fields after `left: Number(o.left ?? 0)`:

```ts
numbering: (o.data?.numbering ?? 'none') as 'none' | 'alpha' | 'outline',
level:     Number(o.data?.level   ?? 1),
indent:    Number(o.data?.indent  ?? 0),
tabStop:   Number(o.data?.tabStop ?? 0),
```

- [ ] **Step 6: Pass new fields through in the `items` map**

In the `row.map(o => ({ ... }))` block, add after `left: o.left`:

```ts
numbering: o.numbering,
level:     o.level,
indent:    o.indent,
tabStop:   o.tabStop,
```

- [ ] **Step 7: Run test to verify it passes**

```bash
cd /home/faizalamat/memo-builder && npm test -- --testPathPattern=word 2>&1 | tail -20
```

Expected: All tests PASS.

- [ ] **Step 8: Mirror the new tests into the worktree test file**

Copy the new `describe` block added in Step 1 into `.claude/worktrees/hungry-raman-2c2e2b/__tests__/lib/export/word.test.ts` (same content, same location at the end of the file).

- [ ] **Step 9: Commit**

```bash
git add src/lib/export/word.ts __tests__/lib/export/word.test.ts .claude/worktrees/hungry-raman-2c2e2b/__tests__/lib/export/word.test.ts
git commit -m "feat(word): extract numbering/indent/tabStop fields from canvas objects"
```

---

## Task 3: Word export — numbering config and paragraph output

**Files:**
- Modify: `src/lib/export/word.ts`
- Modify: `__tests__/lib/export/word.test.ts`

- [ ] **Step 1: Write the failing tests**

Update the import line in `__tests__/lib/export/word.test.ts` to include `TextItem` (already exported from Task 2):

```ts
import { buildDocx, canvasJsonToDocElements, DocElement, type TextItem } from '@/lib/export/word'
```

Add a new describe block at the end of the file:

```ts
describe('buildDocx – indent and tabStop', () => {
  const makeItem = (overrides: Partial<TextItem> = {}): TextItem => ({
    text: 'a) First item', fontSize: 12, bold: false, italic: false,
    underline: false, color: '', fontFamily: '', textAlign: 'left',
    lineHeight: 1.15, left: 0, numbering: 'none', level: 1,
    indent: 0, tabStop: 0, ...overrides,
  })

  it('produces a non-empty buffer with indent and tabStop set', async () => {
    const buf = await buildDocx([
      { type: 'row', items: [makeItem({ indent: 72, tabStop: 36 })] },
    ])
    expect(buf).toBeInstanceOf(Buffer)
    expect(buf.length).toBeGreaterThan(0)
  })

  it('produces a non-empty buffer with alpha numbering', async () => {
    const buf = await buildDocx([
      { type: 'row', items: [makeItem({ numbering: 'alpha', level: 1, indent: 36, tabStop: 36 })] },
    ])
    expect(buf).toBeInstanceOf(Buffer)
    expect(buf.length).toBeGreaterThan(0)
  })

  it('produces a non-empty buffer with outline numbering at level 2', async () => {
    const buf = await buildDocx([
      { type: 'row', items: [makeItem({ numbering: 'outline', level: 2, indent: 72, tabStop: 36 })] },
    ])
    expect(buf).toBeInstanceOf(Buffer)
    expect(buf.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /home/faizalamat/memo-builder && npm test -- --testPathPattern=word 2>&1 | tail -20
```

Expected: FAIL — `LevelFormat` not imported / `buildDocx` crashes when numbering is set.

- [ ] **Step 3: Add `LevelFormat` to the docx import in `word.ts`**

Replace the existing import line at the top of `src/lib/export/word.ts`:

```ts
import {
  Document, Paragraph, TextRun, Packer, PageBreak, TabStopType,
  ImageRun, HorizontalPositionRelativeFrom, VerticalPositionRelativeFrom, TextWrappingType,
  AlignmentType, LineRuleType, Break, LevelFormat,
} from 'docx'
```

- [ ] **Step 4: Add numbering config builder above `buildDocx`**

Add this function in `src/lib/export/word.ts` just before `buildDocx`:

```ts
function buildNumberingConfig(elements: DocElement[]) {
  const usesAlpha   = elements.some(el => el.type === 'row' && el.items.some(i => i.numbering === 'alpha'))
  const usesOutline = elements.some(el => el.type === 'row' && el.items.some(i => i.numbering === 'outline'))

  const config: { reference: string; levels: object[] }[] = []

  if (usesAlpha) {
    config.push({
      reference: 'alpha-list',
      levels: [0, 1, 2, 3].map(i => ({
        level: i,
        format: LevelFormat.LOWER_LETTER,
        text: '%1)',
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: (i + 1) * 720, hanging: 360 } } },
      })),
    })
  }

  if (usesOutline) {
    config.push({
      reference: 'outline-list',
      levels: [0, 1, 2, 3].map(i => ({
        level: i,
        format: LevelFormat.DECIMAL,
        text: Array.from({ length: i + 1 }, (_, j) => `%${j + 1}`).join('.'),
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: (i + 1) * 720, hanging: 360 } } },
      })),
    })
  }

  return config.length > 0 ? { config } : undefined
}
```

- [ ] **Step 5: Apply indent, tabStop and numbering in paragraph output**

In `buildDocx`, the `paraProps` helper currently returns `alignment` and `spacing`. Replace it with a version that also includes indent, tabStop, and numbering:

```ts
const paraProps = (item: TextItem) => ({
  alignment: alignmentMap[item.textAlign] ?? AlignmentType.LEFT,
  spacing:   { line: Math.round((item.lineHeight || 1.15) * 240), lineRule: LineRuleType.AUTO },
  indent: item.indent > 0 ? {
    left:    Math.round(item.indent  * 15),
    hanging: Math.round(item.tabStop * 15),
  } : undefined,
  tabStops: item.tabStop > 0 ? [
    { type: TabStopType.LEFT, position: Math.round(item.tabStop * 15) },
  ] : undefined,
  numbering: item.numbering !== 'none' ? {
    reference: item.numbering === 'alpha' ? 'alpha-list' : 'outline-list',
    level:     item.level - 1,
  } : undefined,
})
```

- [ ] **Step 6: Pass numbering config to the Document constructor**

At the bottom of `buildDocx`, replace the `new Document({ ... })` call:

```ts
const numberingConfig = buildNumberingConfig(elements)

const doc = new Document({
  ...(numberingConfig ? { numbering: numberingConfig } : {}),
  sections: [{
    properties: {
      page: { margin: { top: 720, bottom: 720, left: 1080, right: 720 } },
    },
    children: paragraphs,
  }],
})
return Buffer.from(await Packer.toBuffer(doc))
```

- [ ] **Step 7: Run tests to verify they pass**

```bash
cd /home/faizalamat/memo-builder && npm test -- --testPathPattern=word 2>&1 | tail -20
```

Expected: All tests PASS.

- [ ] **Step 8: Mirror updated tests into worktree test file**

Add the same `describe('buildDocx – indent and tabStop', ...)` block to `.claude/worktrees/hungry-raman-2c2e2b/__tests__/lib/export/word.test.ts`. Also update the import line to include `TextItem`.

- [ ] **Step 9: Commit**

```bash
git add src/lib/export/word.ts __tests__/lib/export/word.test.ts .claude/worktrees/hungry-raman-2c2e2b/__tests__/lib/export/word.test.ts
git commit -m "feat(word): emit numbering config, indent and tabStop in DOCX paragraphs"
```

---

## Task 4: Build `ParagraphToolbar.tsx`

**Files:**
- Create: `src/components/editor/ParagraphToolbar.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/editor/ParagraphToolbar.tsx`:

```tsx
'use client'

export interface ParagraphData {
  numbering: 'none' | 'alpha' | 'outline'
  level: 1 | 2 | 3 | 4
  indent: number
  tabStop: number
}

interface Props {
  visible: boolean
  top: number    // px — fixed position from viewport top
  left: number   // px — fixed position from viewport left
  data: ParagraphData
  onChange: (patch: Partial<ParagraphData>) => void
}

const PRESETS: Record<1 | 2 | 3 | 4, { indent: number; tabStop: number }> = {
  1: { indent: 36,  tabStop: 36 },
  2: { indent: 72,  tabStop: 36 },
  3: { indent: 108, tabStop: 36 },
  4: { indent: 144, tabStop: 36 },
}

const btn = (active: boolean) =>
  `px-2 py-1 text-xs rounded border ${active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`

export default function ParagraphToolbar({ visible, top, left, data, onChange }: Props) {
  if (!visible) return null

  function setNumbering(numbering: ParagraphData['numbering']) {
    if (numbering === 'none') {
      onChange({ numbering, level: 1, indent: 0, tabStop: 0 })
    } else {
      onChange({ numbering })
    }
  }

  function setLevel(level: 1 | 2 | 3 | 4) {
    onChange({ level, ...PRESETS[level] })
  }

  return (
    <div
      className="fixed z-50 flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 shadow-md"
      style={{ top, left }}
    >
      {/* Numbering style */}
      <div className="flex gap-1">
        <button className={btn(data.numbering === 'none')}  onClick={() => setNumbering('none')}>None</button>
        <button className={btn(data.numbering === 'alpha')} onClick={() => setNumbering('alpha')}>a) b) c)</button>
        <button className={btn(data.numbering === 'outline')} onClick={() => setNumbering('outline')}>1. 1.1</button>
      </div>

      <div className="h-4 w-px bg-slate-200" />

      {/* Level */}
      <div className="flex gap-1">
        {([1, 2, 3, 4] as const).map(l => (
          <button
            key={l}
            className={btn(data.level === l)}
            disabled={data.numbering === 'none'}
            onClick={() => setLevel(l)}
          >
            L{l}
          </button>
        ))}
      </div>

      <div className="h-4 w-px bg-slate-200" />

      {/* Indent */}
      <label className="flex items-center gap-1 text-xs text-slate-600">
        Indent
        <input
          type="number"
          min={0}
          step={4}
          value={data.indent}
          onChange={e => onChange({ indent: Math.max(0, Number(e.target.value)) })}
          className="w-14 rounded border border-slate-300 px-1 py-0.5 text-xs"
        />
        px
      </label>

      {/* Tab */}
      <label className="flex items-center gap-1 text-xs text-slate-600">
        Tab
        <input
          type="number"
          min={0}
          step={4}
          value={data.tabStop}
          onChange={e => onChange({ tabStop: Math.max(0, Number(e.target.value)) })}
          className="w-14 rounded border border-slate-300 px-1 py-0.5 text-xs"
        />
        px
      </label>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/editor/ParagraphToolbar.tsx
git commit -m "feat(editor): add ParagraphToolbar component"
```

---

## Task 5: Wire toolbar into `EditorClient.tsx`

**Files:**
- Modify: `src/app/(editor)/EditorClient.tsx`

- [ ] **Step 1: Add import and state**

At the top of `EditorClient.tsx`, add the import after the existing component imports:

```ts
import ParagraphToolbar, { type ParagraphData } from '@/components/editor/ParagraphToolbar'
```

Inside the `EditorClient` function body, after the existing `useState` declarations, add:

```ts
const [paragraphToolbar, setParagraphToolbar] = useState<{
  top: number; left: number; data: ParagraphData
} | null>(null)
```

- [ ] **Step 2: Compute toolbar position when selection changes**

Add a `useEffect` that watches `selectedObj` and updates `paragraphToolbar`. Place it after the existing `useEffect` hooks:

```ts
useEffect(() => {
  const obj = selectedObj
  const data = (obj as { data?: Record<string, unknown> } | null)?.data
  if (!obj || data?.type !== 'paragraph') {
    setParagraphToolbar(null)
    return
  }
  const canvas = fabricRef.current
  if (!canvas) return
  const canvasEl = canvas.getElement()
  const canvasRect = canvasEl.getBoundingClientRect()
  const objRect = obj.getBoundingRect()
  setParagraphToolbar({
    top:  canvasRect.top  + objRect.top  - 52,
    left: canvasRect.left + objRect.left,
    data: {
      numbering: (data.numbering as ParagraphData['numbering']) ?? 'none',
      level:     (data.level     as ParagraphData['level'])     ?? 1,
      indent:    (data.indent    as number)                     ?? 0,
      tabStop:   (data.tabStop   as number)                     ?? 0,
    },
  })
}, [selectedObj])
```

- [ ] **Step 3: Handle toolbar `onChange` — write back to Fabric object**

Add this handler inside `EditorClient`, after `setParagraphToolbar` is declared:

```ts
function handleParagraphChange(patch: Partial<ParagraphData>) {
  const canvas = fabricRef.current
  const obj = selectedObj
  if (!canvas || !obj) return

  const current = (obj as { data?: Record<string, unknown> }).data ?? {}
  const next = { ...current, ...patch }
  ;(obj as { data?: Record<string, unknown> }).data = next

  // Apply indent visually
  if ('indent' in patch) {
    ;(obj as { set: (k: string, v: unknown) => void }).set('padding', patch.indent)
  }

  canvas.renderAll()

  // Update toolbar state
  setParagraphToolbar(prev => prev ? { ...prev, data: { ...prev.data, ...patch } } : null)

  // Persist to history
  historyRef.current?.save()
}
```

- [ ] **Step 4: Render the toolbar**

Inside the JSX return of `EditorClient`, add `<ParagraphToolbar>` just before the closing `</div>` of the root container (after the `{showTableEditor && ...}` block):

```tsx
{paragraphToolbar && (
  <ParagraphToolbar
    visible
    top={paragraphToolbar.top}
    left={paragraphToolbar.left}
    data={paragraphToolbar.data}
    onChange={handleParagraphChange}
  />
)}
```

- [ ] **Step 5: Verify no TypeScript errors**

```bash
cd /home/faizalamat/memo-builder && npx tsc --noEmit 2>&1 | head -30
```

Expected: No errors. If errors appear, fix types before committing.

- [ ] **Step 6: Run all word tests to confirm nothing regressed**

```bash
cd /home/faizalamat/memo-builder && npm test -- --testPathPattern=word 2>&1 | tail -10
```

Expected: All tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/app/\(editor\)/EditorClient.tsx
git commit -m "feat(editor): wire ParagraphToolbar — show on paragraph selection, write back to Fabric"
```

---

## Manual Verification

1. Start dev server: `npm run dev`
2. Open editor, add a paragraph block via the left toolbar
3. Click the paragraph — the floating toolbar should appear above it
4. Select `a) b) c)` style, choose L2 — Indent input should auto-fill to 72, Tab to 36; the textbox should visually indent
5. Select `1. 1.1` style, choose L3 — Indent should auto-fill to 108
6. Set back to None — inputs should clear to 0, indent should reset
7. Type `a)\tFirst item` in the paragraph textbox, export as Word
8. Open the `.docx` — verify: hanging indent, tab stop at the tab character, and Word recognises it as an alphabetical list at level 2
9. Create a paragraph with `1. 1.1` style at L2, export — verify Word shows it as a decimal outline list
