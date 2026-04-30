import { Pool } from 'pg'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function runMigration() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not found')
    process.exit(1)
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL })

  try {
    // Read migration SQL file
    const migrationPath = path.join(__dirname, '..', 'prisma', 'migrations', '20260429000000_add_multi_source_data_blocks', 'migration.sql')
    const sql = fs.readFileSync(migrationPath, 'utf-8')

    console.log('Running migration: 20260429000000_add_multi_source_data_blocks')
    
    // Split by semicolons and run each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    for (const stmt of statements) {
      console.log('Executing:', stmt.substring(0, 80) + (stmt.length > 80 ? '...' : ''))
      await pool.query(stmt)
    }

    console.log('Migration completed successfully!')
  } catch (err) {
    console.error('Migration failed:', err)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

runMigration()
