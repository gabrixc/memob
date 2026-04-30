'use client'
import { useState } from 'react'

interface SavedQuery {
  id: string
  name: string
  sql: string
  dataSourceId: string
  createdAt: string
}

interface PreviewRow {
  [col: string]: string
}

interface CustomQueryModalProps {
  sourceId: string
  onSaved: (query: SavedQuery) => void
  onClose: () => void
}

export default function CustomQueryModal({ sourceId, onSaved, onClose }: CustomQueryModalProps) {
  const [name, setName] = useState('')
  const [sql, setSql] = useState('')
  const [preview, setPreview] = useState<PreviewRow[] | null>(null)
  const [error, setError] = useState('')
  const [running, setRunning] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleRun() {
    setError('')
    setPreview(null)
    if (!sql.trim()) { setError('SQL cannot be empty'); return }
    setRunning(true)
    try {
      const res = await fetch(`/api/databases/${sourceId}/query/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Query failed'); return }
      setPreview(data.slice(0, 5))
    } catch {
      setError('Network error')
    } finally {
      setRunning(false)
    }
  }

  async function handleSave() {
    setError('')
    if (!name.trim()) { setError('Query name is required'); return }
    if (!sql.trim()) { setError('SQL cannot be empty'); return }
    setSaving(true)
    try {
      const res = await fetch(`/api/databases/${sourceId}/queries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, sql }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Save failed'); return }
      onSaved(data)
      onClose()
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  const previewCols = preview && preview.length > 0 ? Object.keys(preview[0]) : []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-[560px] max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <span className="font-semibold text-sm text-slate-700">Custom SQL Query</span>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg leading-none">×</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Query name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Active records by district"
              className="w-full border border-slate-300 rounded px-2 py-1 text-xs text-slate-900 placeholder:text-slate-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">SQL</label>
            <textarea
              value={sql}
              onChange={e => setSql(e.target.value)}
              rows={6}
              placeholder={"SELECT * FROM get_records('approved', 'north')"}
              className="w-full border border-slate-300 rounded px-2 py-1 text-xs font-mono resize-y text-slate-900 placeholder:text-slate-400"
            />
          </div>
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <button
            onClick={handleRun}
            disabled={running}
            className="px-3 py-1 bg-slate-700 text-white text-xs rounded hover:bg-slate-800 disabled:opacity-50"
          >
            {running ? 'Running…' : 'Run Query'}
          </button>
          {preview !== null && (
            <div>
              <p className="text-xs text-slate-500 mb-1">Preview (first {preview.length} row{preview.length !== 1 ? 's' : ''})</p>
              {preview.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No rows returned</p>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded">
                  <table className="text-[10px] w-full">
                    <thead className="bg-slate-100">
                      <tr>
                        {previewCols.map(col => (
                          <th key={col} className="px-2 py-1 text-left font-semibold text-slate-600 border-r border-slate-200 last:border-r-0">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row, i) => (
                        <tr key={i} className="border-t border-slate-200">
                          {previewCols.map(col => (
                            <td key={col} className="px-2 py-1 truncate max-w-[100px] border-r border-slate-200 last:border-r-0">{row[col]}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-slate-200">
          <button onClick={onClose} className="px-3 py-1 text-xs border border-slate-300 rounded hover:bg-slate-50">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1 text-xs bg-sky-600 text-white rounded hover:bg-sky-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save & Load'}
          </button>
        </div>
      </div>
    </div>
  )
}
