# Entertainment License Application System — Design Spec

**Date:** 2026-04-22
**Status:** Approved

---

## Context

Majlis Perbandaran Batu Pahat (and other District Municipals) receive entertainment license applications from registered businesses. Applications flow through two levels of governance:

1. **District level** — JKKD meeting decides to support or reject
2. **State level (NSC Johor)** — JKKN meeting gives final endorsement

NSC Johor staff currently tracks this manually. This system replaces that with a structured data entry portal built inside Memo Builder, with a JSON timeline in the `remarks` column capturing each stage of the workflow.

This is **Sub-project 1** covering: database schema, data migration, applicant management, application CRUD, and the 5-stage timeline form. Letter generation (Memo Builder template integration) is Sub-project 2.

---

## Entertainment Types

`pool_table` | `billiard` | `snooker` | `live_band` | `karaoke` | `video_games` | `cinema`

## Application Statuses

`DALAM_PROSES` | `DISOKONG` | `TIDAK_DISOKONG` | `TANGGUH` | `KIV` | `TIADA_KEPUTUSAN` | `TIDAK_DITERUSKAN`

---

## Database Schema

### New Table: `license_applicant`

Prisma-managed. Seeded by migrating all rows from the existing `pendaftar` table (same PostgreSQL database). Acts as the authoritative applicant registry going forward.

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
```

**Migration data seed:**
```sql
INSERT INTO license_applicants (id, fullname, nokp, nama_perniagaan, lokasi_perniagaan, is_active, created_at)
SELECT id, fullname, nokp, nama_perniagaan, lokasi_perniagaan, true, created_at
FROM pendaftar
ON CONFLICT (id) DO NOTHING;
```

> **Note:** The `nokp` column has a `UNIQUE` constraint. Verified that the existing `pendaftar` table has no duplicate `nokp` values (2 rows, 2 distinct), so migration is safe.

### New Table: `license_application`

```prisma
model LicenseApplication {
  id               String           @id @default(uuid())
  applicantId      String           @map("applicant_id")
  applicant        LicenseApplicant @relation(fields: [applicantId], references: [id])
  district         String
  entertainmentType String          @map("entertainment_type")
  status           String           @default("DALAM_PROSES")
  documents        Json             @default("[]")
  remarks          Json             @default("[]")
  createdAt        DateTime         @default(now()) @map("created_at")
  updatedAt        DateTime         @updatedAt @map("updated_at")

  @@map("license_applications")
}
```

---

## Remarks JSON Structure

The `remarks` column stores an ordered array of stage events. The client always sends the **full updated array** in a PATCH request — the server replaces the entire `remarks` value. The detail page UI maintains the current array in component state and merges/replaces the edited stage object before submitting. An application starts with `remarks: []`.

### Stage schemas

```json
// Stage 1: District sends letter to NSC Johor
{ "event": "district_received", "date": "YYYY-MM-DD", "reference_no": "MPPB/2024/001", "letter_title": "Permohonan Lesen Hiburan..." }

// Stage 2: JKKD meeting outcome (from the District's official letter)
{ "event": "jkkd_meeting", "date": "YYYY-MM-DD", "decision": "DISOKONG|TIDAK_DISOKONG|KIV", "notes": "..." }

// Stage 3: NSC Johor opens physical file
{ "event": "nsc_file_opened", "date": "YYYY-MM-DD", "internal_ref": "NSC.JHR/2024/001" }

// Stage 4: Site visit by NSC Johor
{ "event": "site_visit", "date": "YYYY-MM-DD", "notes": "Radius dari kawasan perumahan: 500m. Tiada hospital berdekatan." }

// Stage 5: JKKN meeting at state level — final determination
{ "event": "jkkn_meeting", "date": "YYYY-MM-DD", "decision": "DISOKONG|TIDAK_DISOKONG|TANGGUH|KIV|TIADA_KEPUTUSAN|TIDAK_DITERUSKAN", "remarks": "Full endorsement text with compliance notes..." }
```

When `jkkn_meeting` is saved, the application's top-level `status` column is automatically updated to match the JKKN `decision`.

---

## Documents JSON Structure

The `documents` column tracks supporting documents submitted with the application:

```json
[
  { "name": "Surat Permohonan", "type": "permohonan", "submitted_at": "2024-01-15" },
  { "name": "Pelan Lantai", "type": "pelan", "submitted_at": "2024-01-15" },
  { "name": "Lesen Perniagaan", "type": "lesen", "submitted_at": "2024-01-15" }
]
```

---

## Pages & Navigation

Add "Permohonan Lesen" link to the existing top navigation bar (TopBar).

| Route | Title | Purpose |
|-------|-------|---------|
| `/applications` | Senarai Permohonan | List all applications |
| `/applications/new` | Permohonan Baharu | 2-step form to create application |
| `/applications/[id]` | Butiran Permohonan | Detail view + 5-stage timeline editor |
| `/applicants` | Senarai Pemohon | Manage license_applicant records |
| `/applicants/[id]/edit` | Kemaskini Pemohon | Edit phone number / is_active |

---

## Page Designs

### `/applications` — List

- Table: Business Name | Entertainment Type | District | Status (badge) | Created | Actions
- Filter bar: status dropdown + entertainment type dropdown
- "Permohonan Baharu" button → `/applications/new`
- Status badge colors: DALAM_PROSES=blue, DISOKONG=green, TIDAK_DISOKONG=red, TANGGUH=orange, KIV=yellow, TIADA_KEPUTUSAN=gray, TIDAK_DITERUSKAN=slate

### `/applications/new` — 2-Step Form

**Step 1: Cari Pemohon**
- Search input (name or nokp)
- Results table showing: Nama Perniagaan, Pemilik, NoKP, Lokasi, Active status
- Click row to select → advance to Step 2

**Step 2: Butiran Permohonan**
- Selected applicant shown as read-only card
- District input (text)
- Entertainment type dropdown
- Documents list (add/remove rows: name + type + date)
- Submit → creates application with status DALAM_PROSES, remarks []

### `/applications/[id]` — Detail

**Header section:**
- Applicant name, business name, NoKP, district, entertainment type
- Status badge (large)
- Documents list

**Timeline section (5 stage cards, sequential):**
Each card shows:
- Stage name + icon
- "Belum diisi" placeholder if empty, or filled values
- Edit button → opens inline form or modal

Stage 1 — Surat Diterima dari Daerah: date, reference_no, letter_title
Stage 2 — Mesyuarat JKKD: date, decision (dropdown), notes
Stage 3 — Fail Dibuka NSC Johor: date, internal_ref
Stage 4 — Lawatan Tapak: date, notes (multi-line)
Stage 5 — Mesyuarat JKKN: date, decision (dropdown), remarks (multi-line)
→ Saving Stage 5 also updates top-level status

### `/applicants` — Manage Applicants

- Table: Nama Perniagaan, Pemilik, NoKP, Telefon, Aktif (toggle), Actions
- Search by name/nokp
- Edit button → `/applicants/[id]/edit` (phone_number + is_active only)

---

## API Routes

| Method | Path | Body / Params | Response |
|--------|------|---------------|----------|
| GET | `/api/applications` | `?status=&type=&page=` | Array of applications with applicant |
| POST | `/api/applications` | `{applicantId, district, entertainmentType, documents}` | 201 + created |
| GET | `/api/applications/[id]` | — | Full application + applicant |
| PATCH | `/api/applications/[id]` | `{status?, documents?, remarks?}` | Updated application |
| DELETE | `/api/applications/[id]` | — | 204 |
| GET | `/api/applicants` | `?q=&active=` | Array of applicants |
| GET | `/api/applicants/[id]` | — | Single applicant |
| PATCH | `/api/applicants/[id]` | `{phoneNumber?, isActive?}` | Updated applicant |

---

## Data Flow

```
NSC Johor staff:
  /applications/new
    → searches license_applicants by name/nokp
    → selects business → fills district + type + documents
    → POST /api/applications → creates row, status=DALAM_PROSES, remarks=[]

  /applications/[id]
    → fills Stage 1 form → PATCH /api/applications/[id] {remarks: [..., district_received]}
    → fills Stage 2 form → PATCH /api/applications/[id] {remarks: [..., jkkd_meeting]}
    → fills Stage 3 form → PATCH /api/applications/[id] {remarks: [..., nsc_file_opened]}
    → fills Stage 4 form → PATCH /api/applications/[id] {remarks: [..., site_visit]}
    → fills Stage 5 form → PATCH /api/applications/[id] {remarks: [..., jkkn_meeting], status: decision}
```

---

## Verification

1. Run `npx prisma migrate dev` → `license_applicants` and `license_applications` tables created
2. Verify pendaftar data migrated: `SELECT COUNT(*) FROM license_applicants` matches `SELECT COUNT(*) FROM pendaftar`
3. Create a new application via `/applications/new` — search finds pendaftar-seeded applicants
4. Fill all 5 timeline stages → saving Stage 5 updates status badge
5. Filter list by status=DISOKONG → shows only matching applications
6. Edit an applicant's phone number → persists correctly
