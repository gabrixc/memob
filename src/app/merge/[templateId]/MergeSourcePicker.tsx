'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface DataSource { id: string; name: string }
interface TableSchema { table: string; columns: { name: string; type: string }[] }

export default function MergeSourcePicker({
  templateId,
  templateName,
}: {
  templateId: string
  templateName: string
}) {
  const router = useRouter()
  const [sources, setSources] = useState<DataSource[]>([])
  const [sourceId, setSourceId] = useState('')
  const [tables, setTables] = useState<TableSchema[]>([])
  const [table, setTable] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/databases').then(r => r.json()).then(setSources)
  }, [])

  useEffect(() => {
    if (!sourceId) { setTables([]); setTable(''); return }
    setLoading(true)
    fetch(`/api/databases/${sourceId}/schema`)
      .then(r => r.json())
      .then((data: TableSchema[]) => { setTables(data); setTable(data[0]?.table ?? '') })
      .finally(() => setLoading(false))
  }, [sourceId])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!sourceId || !table) return
    router.push(`/merge/${templateId}?sourceId=${sourceId}&table=${encodeURIComponent(table)}`)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="mb-6">
          <Link href="/templates" className="text-sky-500 hover:text-sky-600 text-sm">← Templates</Link>
          <h1 className="text-lg font-semibold text-slate-800 mt-2">Mail Merge</h1>
          <p className="text-sm text-slate-500 mt-1">
            Template: <span className="font-medium text-slate-700">{templateName}</span>
          </p>
          <p className="text-sm text-slate-500 mt-1">Choose a data source and table to merge records into this template.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Data Source</label>
            <select
              value={sourceId}
              onChange={e => setSourceId(e.target.value)}
              required
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
            >
              <option value="">— select source —</option>
              {sources.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {tables.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Table</label>
              <select
                value={table}
                onChange={e => setTable(e.target.value)}
                required
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              >
                {tables.map(t => (
                  <option key={t.table} value={t.table}>{t.table}</option>
                ))}
              </select>
            </div>
          )}

          {loading && <p className="text-xs text-slate-400">Loading tables…</p>}

          {sources.length === 0 && (
            <p className="text-xs text-amber-600">
              No data sources configured.{' '}
              <Link href="/settings" className="underline">Add one in Settings</Link>.
            </p>
          )}

          <button
            type="submit"
            disabled={!sourceId || !table}
            className="bg-violet-500 hover:bg-violet-600 disabled:opacity-40 text-white py-2 rounded-lg text-sm font-medium mt-2"
          >
            Load Records
          </button>
        </form>
      </div>
    </div>
  )
}
