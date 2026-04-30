# Multi-Source Data Blocks

## Overview

The multi-source data block feature allows templates to pull data from **multiple tables or queries** simultaneously. This solves the problem where placeholders like `{{fullname}}` and `{{nokp}}` could only be populated from a single data source.

## Use Case Example

You have two tables:
- `LICENSE_APPLICANTS` - contains applicant info (fullname, nokp, business name)
- `CHECKS` - contains background check results (status, checkDate, nokp)

**Before:** You could only show data from ONE table per template.
**Now:** You can create a data block that merges both tables by `nokp` and display:
- `{{fullname}}` - from LICENSE_APPLICANTS
- `{{check.status}}` - from CHECKS
- `{{check.checkDate}}` - from CHECKS

## Architecture

### Database Schema

Three new tables were added:

1. **data_blocks** - Main configuration for multi-source data blocks
   - `id`, `template_id`, `name`, `primary_source_id`
   
2. **primary_sources** - Defines the primary data source (drives the record set)
   - `id`, `source_id`, `type`, `table_name`, `query`, `data_block_id`

3. **secondary_sources** - Defines secondary lookup sources (joined by key)
   - `id`, `alias`, `source_id`, `type`, `table_name`, `query`, `join_key`, `data_block_id`

### Placeholder Syntax

```
{{fieldname}}          → from primary source
{{alias.fieldname}}    → from secondary source with given alias
```

Example:
```
{{fullname}}           → LICENSE_APPLICANTS.fullname
{{nokp}}               → LICENSE_APPLICANTS.nokp
{{check.status}}       → CHECKS.status
{{check.checkDate}}    → CHECKS.checkDate
```

**Auto-merge behavior:** Fields from secondary sources are also available without prefix if there's no name collision.

## API Endpoints

### GET /api/data-blocks?templateId=xxx
Returns all data blocks configured for a template.

### POST /api/data-blocks
Create a new multi-source data block.

**Request body:**
```json
{
  "templateId": "template-123",
  "name": "Applicant Info with Check",
  "primarySource": {
    "sourceId": "datasource-abc",
    "type": "table",
    "tableName": "license_applicants"
  },
  "secondarySources": [
    {
      "alias": "check",
      "sourceId": "datasource-abc",
      "type": "table",
      "tableName": "checks",
      "joinKey": "nokp"
    }
  ]
}
```

### GET /api/data-blocks/[id]
Get a specific data block configuration.

### PUT /api/data-blocks/[id]
Update a data block configuration.

### DELETE /api/data-blocks/[id]
Delete a data block.

### POST /api/data-blocks/[id]/merge
Execute the multi-source merge and return merged records.

**Request body:**
```json
{
  "limit": 100
}
```

**Response:**
```json
{
  "records": [
    {
      "fullname": "Ahmad bin Ali",
      "nokp": "800101-01-1234",
      "check.status": "PASSED",
      "check.checkDate": "2024-01-15"
    }
  ],
  "dataBlock": { ... }
}
```

## How It Works

### 1. Primary Source Fetch
The primary source determines the main record set. If you select `license_applicants` as primary, you'll get one output record per applicant.

### 2. Secondary Source Lookup
For each primary record, secondary sources are queried using the `joinKey`:
```sql
SELECT * FROM checks WHERE nokp = '<primary_record.nokp>' LIMIT 1
```

### 3. Field Merging
Secondary source fields are merged with:
- **Aliased prefix:** `check.status`, `check.checkDate`
- **Direct merge:** `status`, `checkDate` (if no collision with primary fields)

### 4. Placeholder Substitution
The merged record is used to replace placeholders in the canvas JSON using the updated regex pattern that supports dot notation.

## UI Components

### DataBlockPicker Component
Located at `src/components/editor/DataBlockPicker.tsx`

Features:
- Select primary data source and table/query
- Add multiple secondary sources
- Configure join keys for each secondary source
- Support for saved queries

### Usage in Editor
To use multi-source data blocks in the editor:
1. Open the DataBlockPicker modal from the toolbar
2. Configure primary source (e.g., `license_applicants`)
3. Add secondary sources (e.g., `checks` with alias "check")
4. Set join key (e.g., `nokp`)
5. Click "Create Data Block"

## Merge Page Integration

The merge page (`/merge/[templateId]`) now supports a `dataBlockId` query parameter:

```
/merge/[templateId]?dataBlockId=block-123
```

When this parameter is present, the page:
1. Fetches the data block configuration
2. Executes the multi-source merge
3. Renders the merged records

## Code Examples

### Creating a Data Block Programmatically

```typescript
const response = await fetch('/api/data-blocks', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    templateId: 'my-template',
    name: 'Applicant + Check',
    primarySource: {
      sourceId: 'my-datasource',
      type: 'table',
      tableName: 'license_applicants'
    },
    secondarySources: [{
      alias: 'check',
      sourceId: 'my-datasource',
      type: 'table',
      tableName: 'checks',
      joinKey: 'nokp'
    }]
  })
})

const dataBlock = await response.json()
```

### Using mergeSources Utility

```typescript
import { mergeSources } from '@/lib/data/mergeSources'

const records = await mergeSources({
  primary: {
    sourceId: 'src1',
    connectionUrl: 'postgresql://...',
    type: 'table',
    tableName: 'license_applicants'
  },
  secondary: [{
    alias: 'check',
    sourceId: 'src1',
    connectionUrl: 'postgresql://...',
    type: 'table',
    tableName: 'checks',
    joinKey: 'nokp'
  }]
}, limit = 100)
```

## Files Modified/Created

### New Files
- `src/lib/data/mergeSources.ts` - Core merge logic
- `src/components/editor/DataBlockPicker.tsx` - UI for configuring data blocks
- `src/app/api/data-blocks/route.ts` - CRUD API
- `src/app/api/data-blocks/[id]/route.ts` - Single resource API
- `src/app/api/data-blocks/[id]/merge/route.ts` - Merge execution API
- `prisma/migrations/20260429000000_add_multi_source_data_blocks/migration.sql`

### Modified Files
- `prisma/schema.prisma` - Added DataBlock, PrimarySource, SecondarySource models
- `src/lib/canvas/placeholders.ts` - Updated regex to support dot notation
- `src/app/merge/[templateId]/page.tsx` - Added multi-source merge mode

## Testing

### Manual Test
1. Go to Settings → ensure you have a data source configured
2. Open a template in the editor
3. Click the Data Block button (if available) or navigate to `/merge/[templateId]`
4. Configure a data block with:
   - Primary: `license_applicants`
   - Secondary: Add another table with matching `nokp` field
5. Verify merged records appear with both primary and secondary fields

### Automated Test
Run the test script:
```bash
npx ts-node --esm scripts/test-multi-source.ts
```

## Limitations

1. **Single database connection:** All sources must come from the same PostgreSQL database (cross-database joins not supported yet)
2. **LEFT JOIN behavior:** Secondary sources are optional - if no match is found, the primary record still appears with empty secondary fields
3. **One-to-one mapping:** Only the first matching secondary record is used (LIMIT 1)
4. **No nested aliases:** Currently supports only one level (`{{alias.field}}`), not nested (`{{a.b.field}}`)

## Future Enhancements

- [ ] Support for multiple join keys (composite keys)
- [ ] INNER JOIN mode (require match for secondary sources)
- [ ] Cross-database source support
- [ ] Chained secondary sources (secondary → tertiary)
- [ ] Visual data flow diagram in DataBlockPicker
- [ ] Field preview before saving data block
