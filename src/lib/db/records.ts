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
