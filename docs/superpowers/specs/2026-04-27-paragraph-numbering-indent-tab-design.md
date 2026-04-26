# Paragraph Numbering, Indent & Tab — Design Spec

**Date:** 2026-04-27
**Status:** Approved

## Context

The memo builder's paragraph block (`addParagraph` → Fabric.js `Textbox`) has no way to configure indent, tab stops, or numbering style. Users type number prefixes like "3.1", "a)" manually, but the exported Word document loses the hanging indent and tab alignment, making the structure collapse. This feature adds a floating toolbar for paragraph configuration and wires the settings through to the Word exporter.

---

## Approach

Option 2 — Indent + tab + Word list registration. Numbers are typed manually in the canvas; the toolbar configures style metadata. The canvas applies visual indent via `padding.left`. The Word exporter registers `AbstractNumbering` definitions and applies `indent`, `tabStops`, and `numbering` references per paragraph.

---

## Scope — Files Changed

| File | Change |
|---|---|
| `src/lib/canvas/elements.ts` | Extend `addParagraph()` default `data` with new fields |
| `src/components/editor/ParagraphToolbar.tsx` | **New** — floating toolbar for paragraph configuration |
| `src/app/(editor)/EditorClient.tsx` | Wire Fabric selection events → show/hide/position toolbar |
| `src/lib/export/word.ts` | AbstractNumbering defs, extended interfaces, paragraph indent/tab/numbering |

No new element type. No schema changes. No API route changes.

---

## Data Model

Extended `data` on every paragraph Textbox:

```ts
data: {
  type: 'paragraph'
  textTransform: 'none' | 'uppercase' | 'lowercase' | 'capitalize'
  // NEW
  numbering: 'none' | 'alpha' | 'outline'
  level:    1 | 2 | 3 | 4
  indent:   number   // px from canvas left margin (default 0)
  tabStop:  number   // px — tab stop for text after number prefix (default 0)
}
```

**Defaults** in `addParagraph()`:
```ts
numbering: 'none', level: 1, indent: 0, tabStop: 0
```

**Canvas visual:** `padding.left = indent` px applied live to the Textbox on every toolbar change.

**Preset indent levels:**

| Level | indent | tabStop |
|---|---|---|
| L1 | 36 px | 36 px |
| L2 | 72 px | 36 px |
| L3 | 108 px | 36 px |
| L4 | 144 px | 36 px |

User may override both values with custom px inputs after selecting a preset.

---

## Toolbar UI — `ParagraphToolbar.tsx`

Floating `div` positioned `8px` above the selected Textbox's bounding rect. Shown only when `selection.data?.type === 'paragraph'`. Hidden on deselect or non-paragraph selection.

**Control layout (left → right):**
```
[ None | a) b) c) | 1. 1.1 ]   [ L1 | L2 | L3 | L4 ]   [ Indent: __px ]   [ Tab: __px ]
```

- **Numbering style** — 3-button toggle. Selecting `None` resets level to 1 and clears indent/tabStop inputs to 0.
- **Level** — 4-button toggle, disabled when numbering is `none`. Clicking a level fills Indent and Tab inputs with preset values; user can override.
- **Indent** — number input, min 0, step 4. Live-updates `data.indent` and `padding.left` on the Fabric object.
- **Tab stop** — number input, min 0, step 4. Live-updates `data.tabStop`.

**Positioning in `EditorClient.tsx`:**
- Listen to Fabric `selection:created` and `selection:updated`
- Check `activeObject.data?.type === 'paragraph'`
- Use `getBoundingRect()` + canvas zoom + viewport transform to compute screen position
- Listen to `selection:cleared` to hide the toolbar

---

## Word Export

### Numbering Config (docx v9 API)

Two entries in `Document.numbering.config`, added only when at least one paragraph uses them:

**Alpha (`a) b) c)`)** — reference `'alpha-list'`
```ts
{
  reference: 'alpha-list',
  levels: [0,1,2,3].map(i => ({
    level: i,
    format: LevelFormat.LOWER_LETTER,
    text: '%1)',
    alignment: AlignmentType.LEFT,
    style: { paragraph: { indent: { left: (i+1)*720, hanging: 360 } } },
  }))
}
```

**Outline (`1.` `1.1` `1.1.1`)** — reference `'outline-list'`
```ts
{
  reference: 'outline-list',
  levels: [0,1,2,3].map(i => ({
    level: i,
    format: LevelFormat.DECIMAL,
    text: Array.from({length: i+1}, (_, j) => `%${j+1}`).join('.'),
    alignment: AlignmentType.LEFT,
    style: { paragraph: { indent: { left: (i+1)*720, hanging: 360 } } },
  }))
}
```

Text patterns per level: `'%1'` → `'%1.%2'` → `'%1.%2.%3'` → `'%1.%2.%3.%4'`

### Extended Interfaces

```ts
// CanvasObj — additional data fields
data?: {
  textTransform?: string
  numbering?: 'none' | 'alpha' | 'outline'
  level?: number
  indent?: number
  tabStop?: number
}

// TextItem — carries all fields through to buildDocx
numbering: 'none' | 'alpha' | 'outline'
level: number
indent: number    // px
tabStop: number   // px
```

### Paragraph Output

```ts
new Paragraph({
  alignment: ...,
  spacing: ...,
  indent: item.indent > 0 ? {
    left:    Math.round(item.indent * 15),    // px → twips (1px = 15 twips at 96dpi)
    hanging: Math.round(item.tabStop * 15),
  } : undefined,
  tabStops: item.tabStop > 0 ? [
    { type: TabStopType.LEFT, position: Math.round(item.tabStop * 15) }
  ] : undefined,
  numbering: item.numbering !== 'none' ? {
    reference: item.numbering === 'alpha' ? 'alpha-list' : 'outline-list',
    level: item.level - 1,
  } : undefined,
  children: [...],
})
```

---

## Verification

1. Add a paragraph block, open the toolbar, select `a) b) c)` → L2 → verify canvas padding shifts right
2. Type `a)\tFirst item` in the paragraph — verify the tab aligns to the tab stop
3. Export as Word — open `.docx`, verify hanging indent and tab stop are correct
4. Repeat with `1. 1.1` style at L1, L2, L3
5. Export a document with no numbered paragraphs — verify no numbering definitions appear in the Word XML
6. Run tests: `npm test -- --testPathPattern=word`
