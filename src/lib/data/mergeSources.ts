import { Client } from 'pg'

export interface PrimarySourceConfig {
  sourceId: string
  connectionUrl: string
  type: 'table' | 'query'
  tableName?: string
  query?: string
}

export interface SecondarySourceConfig {
  alias: string
  sourceId: string
  connectionUrl: string
  type: 'table' | 'query'
  tableName?: string
  query?: string
  joinKey: string
}

export interface MergeSourcesOptions {
  primary: PrimarySourceConfig
  secondary: SecondarySourceConfig[]
}

/**
 * Fetches records from multiple data sources and merges them by join key.
 * Primary source drives the result set, secondary sources are looked up by join key.
 */
export async function mergeSources(
  options: MergeSourcesOptions,
  limit = 100
): Promise<Record<string, string>[]> {
  const { primary, secondary } = options

  // Fetch primary records
  const primaryRecords = await fetchRecords(primary.connectionUrl, primary, limit)

  if (secondary.length === 0) {
    return primaryRecords
  }

  // For each primary record, fetch and merge secondary data
  const mergedRecords: Record<string, string>[] = []

  for (const primaryRecord of primaryRecords) {
    const merged: Record<string, string> = { ...primaryRecord }

    // Fetch from each secondary source
    for (const sec of secondary) {
      const secRecords = await fetchRecordsByJoinKey(
        sec.connectionUrl,
        sec,
        primaryRecord[sec.joinKey]
      )

      if (secRecords.length > 0) {
        // Merge with alias prefix to avoid collisions
        const secRecord = secRecords[0]
        for (const [key, value] of Object.entries(secRecord)) {
          merged[`${sec.alias}.${key}`] = value
          // Also add without prefix if no collision
          if (!(key in merged)) {
            merged[key] = value
          }
        }
      }
    }

    mergedRecords.push(merged)
  }

  return mergedRecords
}

/**
 * Fetch records from a table or custom query
 */
async function fetchRecords(
  connectionUrl: string,
  config: PrimarySourceConfig,
  limit: number
): Promise<Record<string, string>[]> {
  const client = new Client({ connectionString: connectionUrl })
  await client.connect()

  try {
    let sql: string
    const params: unknown[] = [limit]

    if (config.type === 'query' && config.query) {
      sql = config.query
    } else if (config.type === 'table' && config.tableName) {
      const sanitizedTable = config.tableName.replace(/[^a-zA-Z0-9_-]/g, '')
      sql = `SELECT * FROM "${sanitizedTable}" LIMIT $1`
    } else {
      return []
    }

    const { rows } = await client.query(sql, params)
    return rows.map(row =>
      Object.fromEntries(Object.entries(row).map(([k, v]) => [k, String(v ?? '')]))
    )
  } finally {
    await client.end()
  }
}

/**
 * Fetch a single record from secondary source by join key value
 */
async function fetchRecordsByJoinKey(
  connectionUrl: string,
  config: SecondarySourceConfig,
  joinKeyValue: string
): Promise<Record<string, string>[]> {
  const client = new Client({ connectionString: connectionUrl })
  await client.connect()

  try {
    let sql: string
    const params: unknown[] = [joinKeyValue]

    if (config.type === 'query' && config.query) {
      // For custom queries, we wrap it to filter by join key
      // This assumes the query is a SELECT that can be wrapped
      sql = `SELECT * FROM (${config.query}) AS subq WHERE "${config.joinKey}" = $1`
    } else if (config.type === 'table' && config.tableName) {
      const sanitizedTable = config.tableName.replace(/[^a-zA-Z0-9_-]/g, '')
      sql = `SELECT * FROM "${sanitizedTable}" WHERE "${config.joinKey}" = $1`
    } else {
      return []
    }

    const { rows } = await client.query(sql, params)
    return rows.map(row =>
      Object.fromEntries(Object.entries(row).map(([k, v]) => [k, String(v ?? '')]))
    )
  } catch (err) {
    console.error(`Error fetching secondary record for ${config.alias}:`, err)
    return []
  } finally {
    await client.end()
  }
}

/**
 * Substitute placeholders in canvas JSON with merged record data.
 * Supports both flat fields ({{fullname}}) and aliased fields ({{check.status}}).
 */
export function substitutePlaceholders(
  canvasJson: Record<string, unknown>,
  record: Record<string, string>
): Record<string, unknown> {
  const RE = /\{\{([a-zA-Z_][\w.]*)\}\}/g

  return JSON.parse(
    JSON.stringify(canvasJson).replace(RE, (_, key) => {
      // Try exact key match first (e.g., "check.status")
      if (key in record) {
        return record[key] ?? ''
      }
      // Fallback to simple key (e.g., "fullname")
      if (key in record) {
        return record[key] ?? ''
      }
      return ''
    })
  )
}

/**
 * Extract all placeholder field names from canvas JSON.
 * Returns both flat fields and aliased fields.
 */
export function extractPlaceholders(canvasJson: Record<string, unknown>): string[] {
  const RE = /\{\{([a-zA-Z_][\w.]*)\}\}/g
  const found = new Set<string>()

  for (const m of JSON.stringify(canvasJson).matchAll(RE)) {
    found.add(m[1])
  }

  return Array.from(found)
}
