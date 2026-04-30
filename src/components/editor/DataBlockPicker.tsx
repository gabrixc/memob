'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface DataSource {
  id: string
  name: string
}

interface TableSchema {
  table: string
  columns: { name: string; type: string }[]
}

interface SavedQuery {
  id: string
  name: string
  sql: string
}

interface PrimarySourceConfig {
  sourceId: string
  type: 'table' | 'query'
  table?: string
  query?: string
}

interface SecondarySourceConfig {
  alias: string
  sourceId: string
  type: 'table' | 'query'
  table?: string
  query?: string
  joinKey: string
}

export default function DataBlockPicker({
  templateId,
  templateName,
  existingBlocks,
  onClose,
}: {
  templateId: string
  templateName: string
  existingBlocks?: Array<{
    id: string
    name: string
    primarySource: { sourceId: string; type: string; table?: string; query?: string }
    secondarySources: Array<{
      alias: string
      sourceId: string
      type: string
      table?: string
      query?: string
      joinKey: string
    }>
  }>
  onClose?: () => void
}) {
  const router = useRouter()
  const [sources, setSources] = useState<DataSource[]>([])
  const [loading, setLoading] = useState(false)

  // Primary source state
  const [primarySourceId, setPrimarySourceId] = useState('')
  const [primaryTables, setPrimaryTables] = useState<TableSchema[]>([])
  const [primaryTable, setPrimaryTable] = useState('')
  const [primaryQueryMode, setPrimaryQueryMode] = useState<'table' | 'query'>('table')
  const [primaryQuery, setPrimaryQuery] = useState('')
  const [primarySavedQueries, setPrimarySavedQueries] = useState<SavedQuery[]>([])

  // Secondary sources state
  const [secondarySources, setSecondarySources] = useState<SecondarySourceConfig[]>([])

  // Block name
  const [blockName, setBlockName] = useState('')

  useEffect(() => {
    fetch('/api/databases').then(r => r.json()).then(setSources)
  }, [])

  useEffect(() => {
    if (!primarySourceId) {
      setPrimaryTables([])
      setPrimaryTable('')
      setPrimarySavedQueries([])
      return
    }
    setLoading(true)
    fetch(`/api/databases/${primarySourceId}/schema`)
      .then(r => r.json())
      .then((data: TableSchema[]) => {
        setPrimaryTables(data)
        setPrimaryTable(data[0]?.table ?? '')
      })
    fetch(`/api/databases/${primarySourceId}/queries`)
      .then(r => r.json())
      .then((data: SavedQuery[]) => setPrimarySavedQueries(data))
      .finally(() => setLoading(false))
  }, [primarySourceId])

  function handleAddSecondary() {
    setSecondarySources(prev => [
      ...prev,
      { alias: `source_${prev.length + 1}`, sourceId: '', type: 'table', table: '', joinKey: 'nokp' },
    ])
  }

  function handleRemoveSecondary(index: number) {
    setSecondarySources(prev => prev.filter((_, i) => i !== index))
  }

  function updateSecondary(
    index: number,
    updates: Partial<SecondarySourceConfig>
  ) {
    setSecondarySources(prev =>
      prev.map((sec, i) => (i === index ? { ...sec, ...updates } : sec))
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!primarySourceId || !blockName) return
    if (primaryQueryMode === 'table' && !primaryTable) return
    if (primaryQueryMode === 'query' && !primaryQuery) return

    setLoading(true)

    try {
      const payload = {
        templateId,
        name: blockName,
        primarySource: {
          sourceId: primarySourceId,
          type: primaryQueryMode,
          tableName: primaryQueryMode === 'table' ? primaryTable : undefined,
          query: primaryQueryMode === 'query' ? primaryQuery : undefined,
        },
        secondarySources: secondarySources.map(sec => ({
          ...sec,
          type: sec.type,
          tableName: sec.type === 'table' ? sec.table : undefined,
        })),
      }

      const res = await fetch('/api/data-blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) throw new Error('Failed to create data block')

      const dataBlock = await res.json()

      // Redirect to merge page with data block
      const blocksParam = encodeURIComponent(
        JSON.stringify([
          {
            id: dataBlock.id,
            sourceId: primarySourceId,
            sourceName: sources.find(s => s.id === primarySourceId)?.name ?? '',
            type: primaryQueryMode,
            tableName: primaryQueryMode === 'table' ? primaryTable : undefined,
            query: primaryQueryMode === 'query' ? primaryQuery : undefined,
          },
        ])
      )

      router.push(`/merge/${templateId}?blocks=${blocksParam}`)
      if (onClose) onClose()
    } catch (err) {
      console.error(err)
      alert('Failed to create data block')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">
              Configure Data Block
            </h2>
            {onClose && (
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Template: {templateName}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Block Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Block Name
            </label>
            <input
              type="text"
              value={blockName}
              onChange={e => setBlockName(e.target.value)}
              placeholder="e.g., Applicant Info"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400"
              required
            />
          </div>

          {/* Primary Source */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-700">Primary Source</h3>

            <div>
              <label className="block text-xs text-slate-600 mb-1">
                Data Source
              </label>
              <select
                value={primarySourceId}
                onChange={e => setPrimarySourceId(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-400"
                required
              >
                <option value="">— select source —</option>
                {sources.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {primarySourceId && (
              <>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPrimaryQueryMode('table')}
                    className={`px-3 py-1.5 text-sm rounded-lg ${
                      primaryQueryMode === 'table'
                        ? 'bg-violet-500 text-white'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    Table
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrimaryQueryMode('query')}
                    className={`px-3 py-1.5 text-sm rounded-lg ${
                      primaryQueryMode === 'query'
                        ? 'bg-violet-500 text-white'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    Custom Query
                  </button>
                </div>

                {primaryQueryMode === 'table' ? (
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">
                      Table
                    </label>
                    <select
                      value={primaryTable}
                      onChange={e => setPrimaryTable(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-400"
                    >
                      {primaryTables.map(t => (
                        <option key={t.table} value={t.table}>
                          {t.table}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">
                      SQL Query
                    </label>
                    <textarea
                      value={primaryQuery}
                      onChange={e => setPrimaryQuery(e.target.value)}
                      placeholder="SELECT * FROM ..."
                      rows={4}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400"
                    />
                    {primarySavedQueries.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-slate-500 mb-1">
                          Saved queries:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {primarySavedQueries.map(q => (
                            <button
                              key={q.id}
                              type="button"
                              onClick={() => setPrimaryQuery(q.sql)}
                              className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded"
                            >
                              {q.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Secondary Sources */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">
                Secondary Sources (Optional)
              </h3>
              <button
                type="button"
                onClick={handleAddSecondary}
                className="text-xs text-violet-600 hover:text-violet-700 font-medium"
              >
                + Add Source
              </button>
            </div>

            {secondarySources.map((sec, index) => (
              <SecondarySourceEditor
                key={index}
                index={index}
                config={sec}
                sources={sources}
                onUpdate={updateSecondary}
                onRemove={handleRemoveSecondary}
              />
            ))}
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={
                loading ||
                !primarySourceId ||
                !blockName ||
                (primaryQueryMode === 'table' && !primaryTable) ||
                (primaryQueryMode === 'query' && !primaryQuery)
              }
              className="px-4 py-2 text-sm bg-violet-500 hover:bg-violet-600 disabled:opacity-40 text-white rounded-lg font-medium"
            >
              {loading ? 'Creating...' : 'Create Data Block'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function SecondarySourceEditor({
  index,
  config,
  sources,
  onUpdate,
  onRemove,
}: {
  index: number
  config: SecondarySourceConfig
  sources: DataSource[]
  onUpdate: (index: number, updates: Partial<SecondarySourceConfig>) => void
  onRemove: (index: number) => void
}) {
  const [tables, setTables] = useState<TableSchema[]>([])
  const [queries, setQueries] = useState<SavedQuery[]>([])

  useEffect(() => {
    if (!config.sourceId) return
    fetch(`/api/databases/${config.sourceId}/schema`)
      .then(r => r.json())
      .then(setTables)
    fetch(`/api/databases/${config.sourceId}/queries`)
      .then(r => r.json())
      .then(setQueries)
  }, [config.sourceId])

  return (
    <div className="bg-slate-50 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-600">
          Source #{index + 1}
        </span>
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="text-xs text-red-600 hover:text-red-700"
        >
          Remove
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-slate-600 mb-1">Alias</label>
          <input
            type="text"
            value={config.alias}
            onChange={e => onUpdate(index, { alias: e.target.value })}
            placeholder="e.g., check"
            className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm text-slate-900 placeholder:text-slate-400"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">Join Key</label>
          <input
            type="text"
            value={config.joinKey}
            onChange={e => onUpdate(index, { joinKey: e.target.value })}
            placeholder="e.g., nokp"
            className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm text-slate-900 placeholder:text-slate-400"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-slate-600 mb-1">Data Source</label>
        <select
          value={config.sourceId}
          onChange={e =>
            onUpdate(index, { sourceId: e.target.value, table: '' })
          }
          className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm text-slate-900"
        >
          <option value="">— select —</option>
          {sources.map(s => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {config.sourceId && (
        <>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onUpdate(index, { type: 'table' })}
              className={`px-2 py-1 text-xs rounded ${
                config.type === 'table'
                  ? 'bg-violet-500 text-white'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              Table
            </button>
            <button
              type="button"
              onClick={() => onUpdate(index, { type: 'query' })}
              className={`px-2 py-1 text-xs rounded ${
                config.type === 'query'
                  ? 'bg-violet-500 text-white'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              Query
            </button>
          </div>

          {config.type === 'table' ? (
            <div>
              <label className="block text-xs text-slate-600 mb-1">Table</label>
              <select
                value={config.table || ''}
                onChange={e => onUpdate(index, { table: e.target.value })}
                className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm text-slate-900"
              >
                {tables.map(t => (
                  <option key={t.table} value={t.table}>
                    {t.table}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs text-slate-600 mb-1">Query</label>
              <textarea
                value={config.query || ''}
                onChange={e => onUpdate(index, { query: e.target.value })}
                rows={2}
                className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm font-mono text-slate-900 placeholder:text-slate-400"
              />
              {queries.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {queries.map(q => (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => onUpdate(index, { query: q.sql })}
                      className="px-1.5 py-0.5 text-xs bg-slate-200 rounded"
                    >
                      {q.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
