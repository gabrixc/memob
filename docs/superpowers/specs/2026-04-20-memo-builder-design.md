# Memo Builder — Design Spec
**Date:** 2026-04-20

---

## Context

The user needs a web-based document design tool — similar in feel to Adobe Illustrator or Word — where memos can be designed visually on a canvas and linked to real data from a relational database. The primary use case is: design a memo template once, connect it to a PostgreSQL data source, pick a record, and instantly generate a filled, exportable memo (PDF, image, or Word). The tool is for a single admin user and must also support webhook integration for triggering memo generation from external systems.

---

## Architecture

**Approach:** Monolithic Next.js full-stack (App Router) — single deployment, no separate backend service.

```
Next.js App
├── /app                      React UI — canvas editor, toolbars
├── /app/api/templates        CRUD for memo templates (Fabric.js JSON)
├── /app/api/databases        Manage DB connections + schema introspection
├── /app/api/records          Query records from user-configured data source
├── /app/api/export           Generate PDF / Image / Word from template + record
├── /app/api/webhook          Inbound trigger + outbound delivery
└── /prisma                   MemoBuilder's own schema (templates, config, logs)
```

**Tech stack:**
| Layer | Choice |
|-------|--------|
| Framework | Next.js 14 (App Router) |
| Canvas engine | Fabric.js |
| ORM | Prisma |
| Database | PostgreSQL |
| PDF export | Puppeteer (headless Chrome) |
| Image export | Fabric.js `canvas.toDataURL()` |
| Word export | `docx` npm package |
| Auth | NextAuth.js — single admin account (username + password) |

---

## Database Schema (MemoBuilder's own DB)

```sql
templates
  id            uuid PK
  name          text
  canvas_json   jsonb       -- full Fabric.js canvas state
  page_size     text        -- "A4" | "Letter" | custom
  created_at    timestamp
  updated_at    timestamp

data_sources
  id            uuid PK
  name          text
  connection_url text       -- PostgreSQL connection string (AES-256 encrypted at rest using server-side key from env var)
  created_at    timestamp

webhook_configs
  id            uuid PK
  inbound_secret  text      -- Bearer token for inbound requests
  outbound_url    text      -- URL to POST on export.completed
  outbound_secret text      -- HMAC-SHA256 signing secret
  outbound_events text[]    -- e.g. ["export.completed"]

export_jobs
  id            uuid PK
  template_id   uuid FK
  record_id     text
  format        text        -- "pdf" | "image" | "word"
  status        text        -- "pending" | "done" | "failed"
  file_path     text
  triggered_by  text        -- "ui" | "webhook"
  created_at    timestamp
```

---

## UI Layout

Three-panel layout with a top bar and status bar.

### Top Bar
- App logo + name
- Menu: File, Edit, View, Export
- Action buttons: **Save Template**, **Preview with Data**, **Export**

### Left Toolbar (56px, light theme)
Icons for: Select, Text Box, Line, Table, Image Placeholder, Rectangle, Page Break, Copy, Cut, Paste, Grid toggle.  
Active tool highlighted in blue. Grid toggle shows ON/OFF state.

### Canvas (center, flex-fill)
- **Properties bar** — shows X, Y, W, H of selected object; font controls (family, size, bold, italic, align); snap grid size
- **Canvas area** — Fabric.js canvas, A4 page centered on dot-grid background
- Page renders as white A4 sheet with drop-shadow; grid overlay (8px default, configurable)
- Zoom controls (Ctrl+scroll or zoom buttons)

### Right Pane (200px)
- Header: "Data Fields"
- Search box to filter fields
- Fields listed grouped by DB table name (e.g. **employees**, **memos**)
- Each field shown as `{{field_name}}`, draggable onto canvas
- Bottom section: **Active Record** card showing current record display name + "Change Record…" button

### Status Bar
- Page count, zoom level, canvas size
- Object count, selected count, grid size, snap state

---

## Canvas Interactions

### Snap-to-Grid
- Default grid: 8px (user-configurable in settings)
- Yellow alignment guides appear when object edges or centers align with other objects
- Snap can be toggled off per-session via toolbar

### Anti-Ghosting Drag
- Fabric.js renders one solid object while dragging — no ghost trail
- Pointer offset from the object's origin is preserved (object doesn't jump to cursor centre)
- Drag from right pane creates a new `{{placeholder}}` text object at drop position, snapped to grid

### Selection
- Rubber-band drag-select or Shift+click for multi-select
- Selected group moves, resizes, and copies as a unit
- Resize handles on corners and edges

### Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| Ctrl+C/X/V | Copy / Cut / Paste |
| Delete | Remove selected object(s) |
| Ctrl+Z / Ctrl+Y | Undo / Redo |
| Arrow keys | Nudge by 1px (Shift+Arrow = 8px) |
| Ctrl+A | Select all |
| Ctrl+G | Group selection |

---

## Data Binding (Template Mode)

1. User connects a PostgreSQL data source via Settings → Data Sources
2. MemoBuilder introspects the schema and populates the right pane field browser
3. User drags `{{field_name}}` onto canvas — inserts as a Fabric.js `IText` object
4. Template JSON stores the literal string `{{field_name}}` as the object's text value
5. On **Preview with Data** or **Export**: user selects a record → API fetches the row → replaces all `{{field_name}}` occurrences with real values before rendering

---

## Export Pipeline

```
POST /api/export  { templateId, recordId, format }
  1. Load template canvas_json from DB
  2. Fetch record from user's data source
  3. Substitute all {{placeholders}} with record field values
  4. Split canvas at page-break elements into page segments
  5a. PDF   → Puppeteer renders HTML page → saves .pdf
  5b. Image → Fabric.js canvas.toDataURL() → saves .png
  5c. Word  → docx library builds .docx from element tree
  6. Store file at /exports/<job_id>.<ext>  (local filesystem; swap for S3/object storage in production)
  7. Return { download_url }
```

**Print:** Browser `window.print()` on a clean full-page preview (no toolbars). CSS `@media print` hides all UI chrome. No server involvement.

---

## Webhook API

### Inbound (trigger generation)
```
POST /api/webhook/trigger
Authorization: Bearer <inbound_secret>
Body: { "template_id": "uuid", "record_id": "42", "format": "pdf" }

Response: { "status": "ok", "download_url": "https://..." }
```

### Outbound (notify on completion)
```
POST <outbound_url>
Headers:
  X-MemoBuilder-Signature: sha256=<hmac>
Body: {
  "event": "export.completed",
  "template_id": "uuid",
  "record_id": "42",
  "format": "pdf",
  "download_url": "https://...",
  "timestamp": "2026-04-20T10:00:00Z"
}
```

Signature uses HMAC-SHA256 over the raw request body with `outbound_secret`. Receiving apps verify the header to confirm authenticity.

Webhook configuration is managed via a Settings page in the UI — no code required.

---

## Authentication

- Single admin account stored in DB (hashed password via bcrypt)
- Session managed by NextAuth.js (JWT strategy)
- All `/app/api/*` routes protected — unauthenticated requests return 401
- Inbound webhook endpoint authenticated separately via Bearer token (not session)

---

## Verification (End-to-End Test Plan)

1. **Login** — visit `/login`, sign in with admin credentials, confirm redirect to editor
2. **Data source** — add a PostgreSQL connection string in Settings, confirm tables appear in right pane
3. **Template design** — drag elements onto canvas, drag `{{field_name}}` from right pane, place a page-break, save template
4. **Preview** — click "Preview with Data", select a record, confirm placeholders are replaced correctly
5. **Export PDF** — export to PDF, open file, confirm layout and data match canvas
6. **Export Image** — export to PNG, confirm pixel output matches canvas
7. **Export Word** — export to .docx, open in Word/LibreOffice, confirm content and structure
8. **Print** — click Print, confirm clean preview with no UI chrome
9. **Inbound webhook** — POST to `/api/webhook/trigger` with a valid Bearer token, confirm PDF is generated and `download_url` is returned
10. **Outbound webhook** — configure an outbound URL (e.g. requestbin), trigger an export, confirm signed POST arrives with correct payload
