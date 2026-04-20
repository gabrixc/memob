import { Client } from 'pg'

export interface ColumnSchema { name: string; type: string }
export interface TableSchema { table: string; columns: ColumnSchema[] }

export async function getTables(connectionUrl: string): Promise<TableSchema[]> {
  const client = new Client({ connectionString: connectionUrl })
  await client.connect()
  try {
    const { rows } = await client.query(`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `)
    const map = new Map<string, ColumnSchema[]>()
    for (const row of rows) {
      if (!map.has(row.table_name)) map.set(row.table_name, [])
      map.get(row.table_name)!.push({ name: row.column_name, type: row.data_type })
    }
    return Array.from(map.entries()).map(([table, columns]) => ({ table, columns }))
  } finally {
    await client.end()
  }
}
