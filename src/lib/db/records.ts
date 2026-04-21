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

export async function runCustomQuery(
  connectionUrl: string,
  sql: string
): Promise<Record<string, string>[]> {
  if (!sql.trimStart().toLowerCase().startsWith('select')) {
    throw new Error('Only SELECT queries are allowed')
  }
  const client = new Client({ connectionString: connectionUrl })
  await client.connect()
  try {
    const { rows } = await client.query(sql)
    return rows.map((row: Record<string, unknown>) =>
      Object.fromEntries(Object.entries(row).map(([k, v]) => [k, String(v ?? '')]))
    )
  } finally {
    await client.end()
  }
}
