# Data Fields: Accordion Tables + Custom SQL Queries

**Date:** 2026-04-21  
**Status:** Draft

---

## Context

The Data Fields pane (RightPane) currently lists all introspected tables from a connected PostgreSQL data source with all columns always visible. Two problems:

1. Internal system tables (`_prisma_migrations`, `data_sources`, `export_jobs`, `templates`, `webhook_configs`) clutter the field list — users never need to drag fields from these into templates.
2. Users need to query filtered or computed data from PostgreSQL functions or arbitrary SQL (e.g., `SELECT * FROM get_records WHERE status_akhir = 'approved' AND district = 'north'`) and map the result columns to template fields — currently impossible.

---

## Feature 1: Accordion Table List

### Behavior

- Every table header becomes a clickable toggle (accordion). Clicking expands or collapses its column list.
- On schema load, **system tables start collapsed** and all other tables start expanded.
- System table names (case-insensitive): `_prisma_migrations`, `data_sources`, `export_jobs`, `templates`, `webhook_configs`.
- Clicking a table header also triggers **record load** (existing behavior), but only if the table is being expanded (not when collapsing).
- State: `collapsedTables: Set<string>` in RightPane component state.
- Visual: a chevron (`›`/`˅`) rotates 90° when expanded.

### Files Changed

- `src/components/editor/RightPane.tsx` — add `collapsedTables` state, initialize with system table names on schema load, add toggle logic and chevron UI to table headers.

---

## Feature 2: Custom SQL Queries

### Overview

Users can write any `SELECT` statement (including PL/SQL function calls), name it, and save it per data source. Saved queries appear as virtual "tables" in the field list. Running a query treats its result columns as draggable fields.

### Backend

#### New Prisma Model

```prisma
model SavedQuery {
  id           String     @id @default(cuid())
  name         String
  sql          String
  dataSourceId String
  dataSource   DataSource @relation(fields: [dataSourceId], references: [id], onDelete: Cascade)
  createdAt    DateTime   @default(now())
}
```

Add the reverse relation to `DataSource`:
```prisma
savedQueries SavedQuery[]
```

Run migration: `npx prisma migrate dev --name add_saved_query`.

#### New API Routes

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/databases/[id]/queries` | List saved queries for a data source |
| `POST` | `/api/databases/[id]/queries` | Create a saved query `{ name, sql }` |
| `DELETE` | `/api/databases/[id]/queries/[queryId]` | Delete a saved query |
| `POST` | `/api/databases/[id]/query/run` | Execute a SELECT query `{ sql }` → rows |

**Security:** Before executing, validate that the SQL (trimmed, lowercased) starts with `select`. Return `400` if not.

**Record execution** reuses the existing `pg` client pattern from `src/lib/db/records.ts`.

#### Files Added

- `src/app/api/databases/[id]/queries/route.ts` — GET + POST
- `src/app/api/databases/[id]/queries/[queryId]/route.ts` — DELETE
- `src/app/api/databases/[id]/query/run/route.ts` — POST (execute)

### Frontend

#### RightPane Changes (`src/components/editor/RightPane.tsx`)

- On `sourceId` change: also fetch `GET /api/databases/${sourceId}/queries` → `savedQueries` state.
- Render a **"CUSTOM QUERIES"** section above the schema table list:
  - Each saved query row: `⚡ {name}` (clickable to load results) + `×` delete button.
  - Clicking the query name runs it and populates `records` + `schema` (columns from result).
  - A **"+ New Query"** button at the top of the pane opens `CustomQueryModal`.
- When a saved query is run (by clicking its name), its result columns are injected as a **synthetic accordion section** at the top of the schema table list. This means regular table fields remain visible alongside query fields — the user can drag from both. The synthetic section is labeled with the query name and has a `⚡` prefix. Only one custom query can be "active" at a time (running a second one replaces the first synthetic section).

#### New Component: `CustomQueryModal`

File: `src/components/editor/CustomQueryModal.tsx`

**UI layout:**
```
┌─────────────────────────────────────────┐
│ Custom SQL Query                    [×] │
├─────────────────────────────────────────┤
│ Query name: [___________________________]│
│                                         │
│ SQL:                                    │
│ ┌─────────────────────────────────────┐ │
│ │ SELECT * FROM get_records(...)      │ │
│ │ WHERE status_akhir = 'approved'     │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [Run Query]                             │
│                                         │
│ Preview (first 5 rows):                 │
│ ┌──────────┬──────────┬──────────────┐  │
│ │ col1     │ col2     │ col3         │  │
│ ├──────────┼──────────┼──────────────┤  │
│ │ ...      │ ...      │ ...          │  │
│ └──────────┴──────────┴──────────────┘  │
│                                         │
│        [Cancel]  [Save & Load]          │
└─────────────────────────────────────────┘
```

**Props:** `{ sourceId: string; onSaved: (query: SavedQuery) => void; onClose: () => void }`

**Behavior:**
- "Run Query": `POST /api/databases/{sourceId}/query/run` — shows preview table of first 5 rows, no save.
- "Save & Load": saves via `POST /api/databases/{sourceId}/queries`, then loads full results as active record set, closes modal.
- Validation: name non-empty, SQL non-empty and starts with `SELECT` (checked client-side before request).
- Error display inline below SQL textarea.

---

## Data Flow

```
User clicks "+ New Query"
  → CustomQueryModal opens
  → User writes SQL, clicks "Run"
  → POST /api/databases/{id}/query/run → pg executes SELECT → rows returned
  → Preview shown in modal
  → User names query, clicks "Save & Load"
  → POST /api/databases/{id}/queries → SavedQuery persisted
  → RightPane: savedQueries list updated, query results loaded as active table
  → Columns appear as draggable {{field}} items
```

---

## Verification

1. Start dev server: `npm run dev`
2. Open editor, connect a PostgreSQL data source.
3. **Accordion**: Confirm system tables are collapsed by default; click headers to toggle.
4. **Custom query**: Click "+ New Query", enter `SELECT * FROM pg_tables LIMIT 10`, run, verify preview.
5. Save with a name — confirm it appears in "CUSTOM QUERIES" section.
6. Reload page — confirm saved queries persist.
7. Drag a field from a custom query result into the canvas — confirm `{{columnName}}` is placed.
8. Delete a saved query via `×` — confirm it disappears.
9. Attempt a non-SELECT query (e.g. `DELETE FROM ...`) — confirm it's blocked with an error.
