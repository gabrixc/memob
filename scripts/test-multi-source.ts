import { Pool } from 'pg'
import dotenv from 'dotenv'

dotenv.config()

async function testMultiSourceMerge() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not found')
    process.exit(1)
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL })

  try {
    console.log('\n=== Testing Multi-Source Data Block Feature ===\n')

    // 1. Check if license_applicants table exists and has data
    console.log('1. Checking license_applicants table...')
    const applicantsResult = await pool.query('SELECT id, fullname, nokp, nama_perniagaan FROM license_applicants LIMIT 3')
    console.log(`   Found ${applicantsResult.rows.length} applicants:`)
    applicantsResult.rows.forEach(row => {
      console.log(`   - ${row.fullname} (${row.nokp}) - ${row.nama_perniagaan}`)
    })

    // 2. Check if checks table exists (for secondary source testing)
    console.log('\n2. Checking for CHECK table...')
    const checksTable = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name ILIKE '%check%'
    `)
    
    if (checksTable.rows.length > 0) {
      console.log(`   Found CHECK table(s): ${checksTable.rows.map(r => r.table_name).join(', ')}`)
      
      // Try to fetch sample data from the first check table
      const sampleCheck = await pool.query(`SELECT * FROM "${checksTable.rows[0].table_name}" LIMIT 1`)
      console.log(`   Sample columns: ${Object.keys(sampleCheck.rows[0] || {}).join(', ')}`)
    } else {
      console.log('   No CHECK table found. You may need to create one for testing secondary sources.')
    }

    // 3. Check data_blocks table
    console.log('\n3. Checking data_blocks table...')
    const dataBlocksResult = await pool.query('SELECT COUNT(*) FROM data_blocks')
    console.log(`   Data blocks count: ${dataBlocksResult.rows[0].count}`)

    // 4. Show example configuration for multi-source data block
    console.log('\n=== Example Data Block Configuration ===\n')
    console.log('To create a multi-source data block, use this structure:')
    console.log(`
{
  "templateId": "<template-id>",
  "name": "Applicant Info with Check",
  "primarySource": {
    "sourceId": "<data-source-id>",
    "type": "table",
    "table": "license_applicants"
  },
  "secondarySources": [
    {
      "alias": "check",
      "sourceId": "<data-source-id>",
      "type": "table",
      "table": "checks",
      "joinKey": "nokp"
    }
  ]
}
    `)

    console.log('\n=== Placeholder Syntax ===\n')
    console.log('In your template, use these placeholders:')
    console.log('  {{fullname}}         → from primary source (license_applicants)')
    console.log('  {{nokp}}             → from primary source (license_applicants)')
    console.log('  {{check.status}}     → from secondary source (checks) with alias "check"')
    console.log('  {{check.checkDate}}  → from secondary source (checks) with alias "check"')
    console.log('  {{check.nokp}}       → also available from secondary source')
    console.log('\nNote: Fields without alias prefix are auto-merged if no collision exists.')

    console.log('\n=== Test Complete ===\n')

  } catch (err) {
    console.error('Test failed:', err)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

testMultiSourceMerge()
