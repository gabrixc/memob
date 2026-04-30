# Summary Report Template - Applications by Business

## Overview

This template generates a summary report for **ONE business** with ALL its applications. You have two options:

### Option A: Pivoted Query (Single Row, Multiple Columns) ✅ RECOMMENDED
- Returns **ONE row** per business
- Each application is a **separate column** (fullname_1, fullname_2, etc.)
- Best for templates with a **fixed table structure**
- Supports up to 5 applications per business

### Option B: Repeating Query (Multiple Rows)
- Returns **ONE row per application**
- All rows have the same business name
- Best for generating **one page per application**
- Unlimited applications supported

## Example Output

### Option A: Pivoted Query (Single Row with Multiple Columns)

```
┌─────────────────────────────────────────────────────────────┐
│ LAPORAN RUMASAN PERMOHONAN LESEN HIBURAN                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ NAMA PERNIAGAAN: AWAN TENANG SDN BHD                        │
│ Lokasi: Jalan Badai Kecil                                   │
│ Jumlah Permohonan: 2                                        │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Bil │ Pemilik    │ No KP        │ Daerah │ Jenis     │ │ │
│ ├─────────────────────────────────────────────────────────┤ │ │
│ │  1  │ faizalamat │ 770717017512 │ Kulai  │ billiard  │ │ │
│ │  2  │ faizalamat │ 770717017512 │ Muar   │ karaoke   │ │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Option B: Multiple Rows (One Page Per Application)

```
┌─────────────────────────────────────────────────────────────┐
│ NAMA PERNIAGAAN: AWAN TENANG SDN BHD                        │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Pemilik    │ No KP        │ Daerah │ Jenis    │ Status │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ faizalamat │ 770717017512 │ Kulai  │ billiard │ DALAM  │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ NAMA PERNIAGAAN: AWAN TENANG SDN BHD                        │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Pemilik    │ No KP        │ Daerah │ Jenis    │ Status │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ faizalamat │ 770717017512 │ Muar   │ karaoke  │ DALAM  │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Option A: Pivoted SQL Query (Single Row, Multiple Columns)

This query returns **one row** with applications as numbered columns.

### For "AWAN TENANG SDN BHD":

**Query Name:** `PIVOT - AWAN TENANG SDN BHD`

**SQL:**
```sql
WITH numbered_apps AS (
  SELECT 
    la.nama_perniagaan,
    la.lokasi_perniagaan,
    la.fullname,
    la.nokp,
    lap.district,
    lap.entertainment_type,
    lap.status,
    TO_CHAR(lap.created_at, 'DD/MM/YYYY') as application_date,
    ROW_NUMBER() OVER (ORDER BY lap.created_at DESC) as app_num
  FROM license_applicants la
  INNER JOIN license_applications lap ON la.id = lap.applicant_id
  WHERE LOWER(la.nama_perniagaan) = LOWER('Awan Tenang Sdn Bhd')
)
SELECT 
  MAX(nama_perniagaan) as nama_perniagaan,
  MAX(lokasi_perniagaan) as lokasi_perniagaan,
  MAX(CASE WHEN app_num = 1 THEN fullname END) as fullname_1,
  MAX(CASE WHEN app_num = 1 THEN nokp END) as nokp_1,
  MAX(CASE WHEN app_num = 1 THEN district END) as district_1,
  MAX(CASE WHEN app_num = 1 THEN entertainment_type END) as entertainment_type_1,
  MAX(CASE WHEN app_num = 1 THEN status END) as status_1,
  MAX(CASE WHEN app_num = 1 THEN application_date END) as application_date_1,
  MAX(CASE WHEN app_num = 2 THEN fullname END) as fullname_2,
  MAX(CASE WHEN app_num = 2 THEN nokp END) as nokp_2,
  MAX(CASE WHEN app_num = 2 THEN district END) as district_2,
  MAX(CASE WHEN app_num = 2 THEN entertainment_type END) as entertainment_type_2,
  MAX(CASE WHEN app_num = 2 THEN status END) as status_2,
  MAX(CASE WHEN app_num = 2 THEN application_date END) as application_date_2,
  MAX(CASE WHEN app_num = 3 THEN fullname END) as fullname_3,
  MAX(CASE WHEN app_num = 3 THEN nokp END) as nokp_3,
  MAX(CASE WHEN app_num = 3 THEN district END) as district_3,
  MAX(CASE WHEN app_num = 3 THEN entertainment_type END) as entertainment_type_3,
  MAX(CASE WHEN app_num = 3 THEN status END) as status_3,
  MAX(CASE WHEN app_num = 3 THEN application_date END) as application_date_3,
  MAX(CASE WHEN app_num = 4 THEN fullname END) as fullname_4,
  MAX(CASE WHEN app_num = 4 THEN nokp END) as nokp_4,
  MAX(CASE WHEN app_num = 4 THEN district END) as district_4,
  MAX(CASE WHEN app_num = 4 THEN entertainment_type END) as entertainment_type_4,
  MAX(CASE WHEN app_num = 4 THEN status END) as status_4,
  MAX(CASE WHEN app_num = 4 THEN application_date END) as application_date_4,
  MAX(CASE WHEN app_num = 5 THEN fullname END) as fullname_5,
  MAX(CASE WHEN app_num = 5 THEN nokp END) as nokp_5,
  MAX(CASE WHEN app_num = 5 THEN district END) as district_5,
  MAX(CASE WHEN app_num = 5 THEN entertainment_type END) as entertainment_type_5,
  MAX(CASE WHEN app_num = 5 THEN status END) as status_5,
  MAX(CASE WHEN app_num = 5 THEN application_date END) as application_date_5,
  COUNT(*) as total_applications
FROM numbered_apps
GROUP BY nama_perniagaan
```

**Result:** Returns ONE row with columns:
- `nama_perniagaan` = "Awan Tenang Sdn Bhd"
- `fullname_1`, `nokp_1`, `district_1`, `entertainment_type_1`, `status_1` (Application 1)
- `fullname_2`, `nokp_2`, `district_2`, `entertainment_type_2`, `status_2` (Application 2)
- `fullname_3`...`fullname_5` (null if no more applications)
- `total_applications` = 2

### Template Design for Pivoted Query

```
┌─────────────────────────────────────────────────────────────┐
│  LAPORAN RUMASAN PERMOHONAN LESEN HIBURAN                   │
├─────────────────────────────────────────────────────────────┤
│  NAMA PERNIAGAAN: {{nama_perniagaan}}                       │
│  Lokasi: {{lokasi_perniagaan}}                              │
│  Jumlah Permohonan: {{total_applications}}                  │
│                                                             │
│  ┌────┬────────────┬──────────────┬─────────┬───────────┐  │
│  │Bil │ Pemilik    │ No KP        │ Daerah  │ Jenis     │  │
│  ├────┼────────────┼──────────────┼─────────┼───────────┤  │
│  │ 1  │ {{fullname_1}} │ {{nokp_1}} │ {{district_1}} │ ... │  │
│  │ 2  │ {{fullname_2}} │ {{nokp_2}} │ {{district_2}} │ ... │  │
│  │ 3  │ {{fullname_3}} │ {{nokp_3}} │ {{district_3}} │ ... │  │
│  │ 4  │ {{fullname_4}} │ {{nokp_4}} │ {{district_4}} │ ... │  │
│  │ 5  │ {{fullname_5}} │ {{nokp_5}} │ {{district_5}} │ ... │  │
│  └────┴────────────┴──────────────┴─────────┴───────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**Note:** Rows 3-5 will show empty if there are fewer than 5 applications.

## Option B: Repeating Query with Grouped Mode (NEW! ✅)

This approach shows **all applications for one business in a single table on one page**.

### How It Works:

1. Use a query that returns **one row per application** (like `REPORT - AWAN TENANG SDN BHD`)
2. The merge system automatically **groups records** by `nama_perniagaan`
3. All applications for the same business appear in **one table on one page**
4. Placeholders are automatically numbered: `{{fullname_1}}`, `{{fullname_2}}`, etc.

### Query to Use:

**Query Name:** `REPORT - AWAN TENANG SDN BHD`

**SQL:**
```sql
SELECT 
  la.nama_perniagaan,
  la.fullname,
  la.nokp,
  lap.district,
  lap.entertainment_type,
  lap.status,
  TO_CHAR(lap.created_at, 'DD/MM/YYYY') as application_date
FROM license_applicants la
INNER JOIN license_applications lap ON la.id = lap.applicant_id
WHERE LOWER(la.nama_perniagaan) = LOWER('Awan Tenang Sdn Bhd')
ORDER BY lap.created_at DESC
```

### Template Design for Grouped Mode:

```
┌─────────────────────────────────────────────────────────────┐
│  LAPORAN RUMASAN PERMOHONAN LESEN HIBURAN                   │
├─────────────────────────────────────────────────────────────┤
│  NAMA PERNIAGAAN: {{nama_perniagaan}}                       │
│  Lokasi: {{lokasi_perniagaan}}                              │
│  Jumlah Permohonan: {{total_records}}                       │
│                                                             │
│  ┌────┬────────────┬──────────────┬─────────┬───────────┐  │
│  │Bil │ Pemilik    │ No KP        │ Daerah  │ Jenis     │  │
│  ├────┼────────────┼──────────────┼─────────┼───────────┤  │
│  │ 1  │ {{fullname_1}} │ {{nokp_1}} │ {{district_1}} │ ... │  │
│  │ 2  │ {{fullname_2}} │ {{nokp_2}} │ {{district_2}} │ ... │  │
│  │ 3  │ {{fullname_3}} │ {{nokp_3}} │ {{district_3}} │ ... │  │
│  │ 4  │ {{fullname_4}} │ {{nokp_4}} │ {{district_4}} │ ... │  │
│  │ 5  │ {{fullname_5}} │ {{nokp_5}} │ {{district_5}} │ ... │  │
│  └────┴────────────┴──────────────┴─────────┴───────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### How to Use Grouped Mode:

1. **Create the saved query** (already done: `REPORT - AWAN TENANG SDN BHD`)
2. **Design your template** with numbered placeholders (`{{fullname_1}}`, `{{fullname_2}}`, etc.)
3. **Go to Merge page** → Select your template
4. **Select saved query** → `REPORT - AWAN TENANG SDN BHD`
5. **Click Load Records** - The system automatically enables grouped mode!
6. **Preview** - You'll see one page with all applications in one table
7. **Print All** - Generates one PDF page per business

### Automatic Features:

- ✅ **Automatic grouping** by `nama_perniagaan`
- ✅ **Automatic numbering** of records (`{{fullname_1}}`, `{{fullname_2}}`, etc.)
- ✅ **`{{total_records}}`** field shows count of applications
- ✅ **One page per business** (not one page per application)
- ✅ **Supports unlimited applications** (placeholders 1-5 shown, rest available)

### Comparison with Pivoted Query:

| Feature | Grouped Mode (Option B) | Pivoted Query (Option A) |
|---------|------------------------|-------------------------|
| **SQL Query** | Simple SELECT | Complex WITH/PIVOT |
| **Placeholders** | `{{fullname_1}}`, `{{fullname_2}}`... | `{{fullname_1}}`, `{{fullname_2}}`... |
| **Grouping** | Automatic | Manual (one row returned) |
| **Applications** | Unlimited (dynamic) | Fixed (up to 5) |
| **Flexibility** | High (any query works) | Medium (needs pivoted SQL) |
| **Recommended** | ✅ YES - Easier to use | For custom SQL users |

**Recommendation:** Use **Grouped Mode (Option B)** - it's easier and more flexible!

### For "AWAN TENANG SDN BHD":

**Query Name:** `REPORT - AWAN TENANG SDN BHD`

**SQL:**
```sql
SELECT 
  la.nama_perniagaan,
  la.fullname,
  la.nokp,
  la.lokasi_perniagaan,
  lap.district,
  lap.entertainment_type,
  lap.status,
  TO_CHAR(lap.created_at, 'DD/MM/YYYY') as application_date
FROM license_applicants la
INNER JOIN license_applications lap ON la.id = lap.applicant_id
WHERE LOWER(la.nama_perniagaan) = LOWER('Awan Tenang Sdn Bhd')
ORDER BY lap.created_at DESC
```

**Result:** Returns MULTIPLE rows (one per application), all with the same `nama_perniagaan`.

### For "LUKER ENTERPRISE":

**Query Name:** `REPORT - LUKER ENTERPRISE`

**SQL:**
```sql
SELECT 
  la.nama_perniagaan,
  la.fullname,
  la.nokp,
  la.lokasi_perniagaan,
  lap.district,
  lap.entertainment_type,
  lap.status,
  TO_CHAR(lap.created_at, 'DD/MM/YYYY') as application_date
FROM license_applicants la
INNER JOIN license_applications lap ON la.id = lap.applicant_id
WHERE LOWER(la.nama_perniagaan) = LOWER('Luker Enterprise')
ORDER BY lap.created_at DESC
```

## How to Use

### For Option A (Pivoted Query - Recommended)

1. Go to **Editor** → Open your template
2. Click **+** next to **DATA FIELDS** → **Custom Query**
3. Enter:
   - **Query name**: `PIVOT - AWAN TENANG SDN BHD`
   - **SQL**: Paste the pivoted query above
4. Click **Save & Load**
5. Design your template with numbered placeholders:
   - `{{nama_perniagaan}}`, `{{lokasi_perniagaan}}`, `{{total_applications}}`
   - `{{fullname_1}}`, `{{nokp_1}}`, `{{district_1}}`, `{{entertainment_type_1}}`, `{{status_1}}`
   - `{{fullname_2}}`, `{{nokp_2}}`, `{{district_2}}`, `{{entertainment_type_2}}`, `{{status_2}}`
   - (up to `{{fullname_5}}`)
6. Go to **Merge** page → Select saved query `PIVOT - AWAN TENANG SDN BHD`
7. Click **Load Records** → **Print All**

### For Option B (Multiple Rows)

1. Go to **Editor** → Open your template
2. Click **+** next to **DATA FIELDS** → **Custom Query**
3. Enter:
   - **Query name**: `REPORT - AWAN TENANG SDN BHD`
   - **SQL**: Paste the repeating query above
4. Click **Save & Load**
5. Design your template with simple placeholders:
   - `{{nama_perniagaan}}`, `{{fullname}}`, `{{nokp}}`, `{{district}}`, `{{entertainment_type}}`, `{{status}}`
6. Go to **Merge** page → Select saved query `REPORT - AWAN TENANG SDN BHD`
7. Click **Load Records** → **Print All** (generates one page per application)

## Comparison

| Feature | Option A (Pivoted) | Option B (Repeating) |
|---------|-------------------|---------------------|
| **Output** | One page per business | One page per application |
| **Table** | Multiple rows in one table | Single row per page |
| **Applications** | Up to 5 (fixed) | Unlimited |
| **Placeholders** | `{{fullname_1}}`, `{{fullname_2}}`... | `{{fullname}}` |
| **Best For** | Summary reports | Individual application letters |

## Sample Data Output

### Option A (Pivoted) - One Row

| nama_perniagaan | fullname_1 | nokp_1 | district_1 | entertainment_type_1 | fullname_2 | nokp_2 | district_2 | entertainment_type_2 |
|-----------------|------------|--------|------------|---------------------|------------|--------|------------|---------------------|
| Awan Tenang Sdn Bhd | faizalamat | 770717017512 | Kulai | billiard | faizalamat | 770717017512 | Muar | karaoke |

### Option B (Repeating) - Multiple Rows

| nama_perniagaan | fullname | nokp | district | entertainment_type |
|-----------------|----------|------|----------|-------------------|
| Awan Tenang Sdn Bhd | faizalamat | 770717017512 | Kulai | billiard |
| Awan Tenang Sdn Bhd | faizalamat | 770717017512 | Muar | karaoke |

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  LAPORAN RUMASAN PERMOHONAN LESEN HIBURAN                   │
│  (Summary Report - Entertainment License Applications)      │
│                                                             │
│  Tarikh Cetak: {{print_date}}                               │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  NAMA PERNIAGAAN: {{nama_perniagaan}}                       │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Pemilik    │ No KP       │ Daerah │ Jenis │ Status  │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ {{fullname}}│ {{nokp}}   │ {{district}} | ...      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  NAMA PERNIAGAAN: {{next_nama_perniagaan}}                  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ ... (repeating for each application)                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Placeholder Fields

| Field | Description | Source |
|-------|-------------|--------|
| `{{nama_perniagaan}}` | Business name | license_applicants |
| `{{fullname}}` | Owner's full name | license_applicants |
| `{{nokp}}` | Owner's ID number | license_applicants |
| `{{lokasi_perniagaan}}` | Business location | license_applicants |
| `{{district}}` | District/Majlis | license_applications |
| `{{entertainment_type}}` | Entertainment type | license_applications |
| `{{status}}` | Application status | license_applications |
| `{{application_date}}` | Application date | license_applications |
| `{{print_date}}` | Report generation date | Add manually |

## Setup Instructions

### Step 1: Create the Saved Query

1. Go to **Editor** → Open any template
2. Click **+** button next to **DATA FIELDS**
3. Select your data source
4. Choose **Custom Query** mode
5. Enter:
   - **Query name**: `Summary Report by Business`
   - **SQL**: Paste the query above
6. Click **Run Query** to preview results
7. Click **Save & Load**

### Step 2: Create the Template

1. Go to **Templates** → **Create New Template**
2. Name it: `Summary Report - By Business`
3. Design the header:
   - Add title: "LAPORAN RUMASAN PERMOHONAN LESEN HIBURAN"
   - Add subtitle: "Summary Report - Entertainment License Applications"
   - Add print date placeholder: `{{print_date}}`

4. Design the business section:
   - Add label: "NAMA PERNIAGAAN:"
   - Add placeholder: `{{nama_perniagaan}}`
   - Add a table with headers:
     ```
     Pemilik | No KP | Daerah | Jenis Hiburan | Status
     ```
   - Add data row with placeholders:
     ```
     {{fullname}} | {{nokp}} | {{district}} | {{entertainment_type}} | {{status}}
     ```

5. Style the table:
   - Header row: Light grey background (`#f8fafc`)
   - Borders: Light grey (`#e2e8f0`)
   - Text: Dark (`#1e293b`)
   - Font size: 10-12px

### Step 3: Generate the Report

1. Go to `/templates`
2. Click **Merge** on your summary report template
3. Select your data source
4. Select the saved query `Summary Report by Business`
5. Preview the results
6. Click **Print All** to generate PDF for all records

## Sample Output

```
LAPORAN RUMASAN PERMOHONAN LESEN HIBURAN
Summary Report - Entertainment License Applications

Tarikh Cetak: 29/04/2026

────────────────────────────────────────────────────────

NAMA PERNIAGAAN: AWAN TENANG SDN BHD

┌─────────────────────────────────────────────────────────┐
│ Pemilik    │ No KP        │ Daerah    │ Jenis   │ Sta │
├─────────────────────────────────────────────────────────┤
│ faizalamat │ 770717017512 │ Kulai     │ billiard│ DAL │
│ faizalamat │ 770717017512 │ Muar      │ karaoke │ DAL │
└─────────────────────────────────────────────────────────┘

────────────────────────────────────────────────────────

NAMA PERNIAGAAN: LUKER ENTERPRISE

┌─────────────────────────────────────────────────────────┐
│ Pemilik    │ No KP        │ Daerah    │ Jenis   │ Sta │
├─────────────────────────────────────────────────────────┤
│ LukeMan    │ 990919160109 │ Tangkak   │ pool    │ DAL │
└─────────────────────────────────────────────────────────┘
```

## Enhanced Query Options

### With Application Count per Business

```sql
SELECT 
  la.nama_perniagaan,
  la.fullname,
  la.nokp,
  la.lokasi_perniagaan,
  lap.district,
  lap.entertainment_type,
  lap.status,
  TO_CHAR(lap.created_at, 'DD/MM/YYYY') as application_date,
  COUNT(lap.id) OVER (PARTITION BY la.nama_perniagaan) as business_app_count
FROM license_applicants la
INNER JOIN license_applications lap ON la.id = lap.applicant_id
ORDER BY la.nama_perniagaan ASC, lap.created_at DESC
```

This adds a `{{business_app_count}}` field showing total applications per business.

### With Status Summary

```sql
SELECT 
  la.nama_perniagaan,
  la.fullname,
  la.nokp,
  lap.district,
  lap.entertainment_type,
  lap.status,
  CASE 
    WHEN lap.status = 'DILULUSKAN' THEN '✓'
    WHEN lap.status = 'DALAM_PROSES' THEN '⏳'
    WHEN lap.status = 'DITOLAK' THEN '✗'
    ELSE lap.status
  END as status_icon
FROM license_applicants la
INNER JOIN license_applications lap ON la.id = lap.applicant_id
ORDER BY la.nama_perniagaan ASC, lap.created_at DESC
```

## Multi-Source Data Block Approach (Advanced)

For true grouping (one page per business with all applications listed), use the multi-source data block feature:

### Primary Source Query
```sql
SELECT DISTINCT nama_perniagaan, lokasi_perniagaan
FROM license_applicants
WHERE id IN (SELECT DISTINCT applicant_id FROM license_applications)
ORDER BY nama_perniagaan
```

### Secondary Source Query
```sql
SELECT 
  la.nama_perniagaan,
  la.fullname,
  la.nokp,
  lap.district,
  lap.entertainment_type,
  lap.status
FROM license_applicants la
INNER JOIN license_applications lap ON la.id = lap.applicant_id
WHERE la.nama_perniagaan = :nama_perniagaan
ORDER BY lap.created_at DESC
```

**Note:** This approach requires template support for repeating sections within a single page, which may need additional development.

## Tips

1. **Page Breaks**: Add page break placeholders between business sections if needed
2. **Styling**: Use consistent colors - header in blue/sky, alternating row colors in tables
3. **Filtering**: Add WHERE clauses to filter by date range, status, or district
4. **Export**: Use the Print All feature to export as PDF for distribution

## Related Documentation

- [Multi-Source Data Blocks](./multi-source-data-blocks.md)
- [Custom SQL Queries](./custom-queries.md)
- [Mail Merge Guide](./mail-merge.md)
