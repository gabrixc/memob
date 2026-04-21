/** @jest-environment node */
import { runCustomQuery } from '@/lib/db/records'

jest.mock('pg', () => {
  const mClient = {
    connect: jest.fn(),
    query: jest.fn(),
    end: jest.fn(),
  }
  return { Client: jest.fn(() => mClient) }
})

const { Client } = require('pg')

describe('runCustomQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('executes a SELECT query and returns string-coerced rows', async () => {
    const mockClient = new Client()
    mockClient.query.mockResolvedValue({
      rows: [{ name: 'Alice', age: 30 }],
    })

    const rows = await runCustomQuery('postgresql://localhost/db', 'SELECT name, age FROM users')
    expect(rows).toEqual([{ name: 'Alice', age: '30' }])
    expect(mockClient.query).toHaveBeenCalledWith('SELECT name, age FROM users')
  })

  it('throws if sql does not start with SELECT', async () => {
    await expect(
      runCustomQuery('postgresql://localhost/db', 'DELETE FROM users')
    ).rejects.toThrow('Only SELECT queries are allowed')
  })

  it('is case-insensitive for SELECT check', async () => {
    const mockClient = new Client()
    mockClient.query.mockResolvedValue({ rows: [{ id: 1 }] })
    await expect(
      runCustomQuery('postgresql://localhost/db', 'select id from users')
    ).resolves.toBeDefined()
  })
})
