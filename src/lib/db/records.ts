import { Client } from 'pg'

export async function getRecords(
  connectionUrl: string, table: string, limit = 100
): Promise<Record<string, string>[]> {
  const client = new Client({ connectionString: connectionUrl })
  await client.connect()
  try {
    // Sanitize table name - only allow alphanumeric, underscore, and hyphen
    const sanitizedTable = table.replace(/[^a-zA-Z0-9_-]/g, '')
    if (!sanitizedTable) throw new Error('Invalid table name')
    const safedLimit = Math.min(Math.max(1, limit), 1000)
    const { rows } = await client.query(`SELECT * FROM "${sanitizedTable}" LIMIT $1`, [safedLimit])
    return rows.map(row =>
      Object.fromEntries(Object.entries(row).map(([k, v]) => [k, String(v ?? '')]))
    )
  } catch (err) {
    console.error(`Error querying table "${table}":`, err)
    throw err
  } finally {
    await client.end()
  }
}

export async function runCustomQuery(
  connectionUrl: string,
  sql: string
): Promise<Record<string, string>[]> {
  const trimmed = sql.trim()
  const lowerSql = trimmed.toLowerCase()
  
  // Allow SELECT queries and CTEs (WITH clause)
  if (!lowerSql.startsWith('select') && !lowerSql.startsWith('with')) {
    throw new Error('Only SELECT queries are allowed')
  }
  if (trimmed.includes(';')) {
    throw new Error('Only single SELECT statements are allowed')
  }
  const client = new Client({ connectionString: connectionUrl })
  await client.connect()
  try {
    const { rows } = await client.query(trimmed)
    return rows.map((row: Record<string, unknown>) =>
      Object.fromEntries(Object.entries(row).map(([k, v]) => [k, String(v ?? '')]))
    )
  } finally {
    await client.end()
  }
}
