'use client'
import { useEffect, useState } from 'react'
import CustomQueryModal from './CustomQueryModal'

interface Column { name: string; type: string }
interface TableSchema { table: string; columns: Column[] }
interface SavedQuery { id: string; name: string; sql: string; dataSourceId: string; createdAt: string }

interface RightPaneProps {
  onFieldDrop: (field: string, x: number, y: number) => void
  onRecordChange: (record: Record<string, string>) => void
  onSourceTableChange?: (sourceId: string, table: string) => void
  onQuerySelect?: (sourceId: string, sql: string) => void
}

const SYSTEM_TABLES = new Set([
  '_prisma_migrations', 'data_sources', 'export_jobs', 'templates', 'webhook_configs',
])

export default function RightPane({ onFieldDrop, onRecordChange, onSourceTableChange, onQuerySelect }: RightPaneProps) {
  const [sources, setSources] = useState<{ id: string; name: string }[]>([])
  const [sourceId, setSourceId] = useState('')
  const [schema, setSchema] = useState<TableSchema[]>([])
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([])
  const [activeQuerySchema, setActiveQuerySchema] = useState<TableSchema | null>(null)
  const [search, setSearch] = useState('')
  const [records, setRecords] = useState<Record<string, string>[]>([])
  const [activeRecord, setActiveRecord] = useState<Record<string, string> | null>(null)
  const [collapsedTables, setCollapsedTables] = useState<Set<string>>(new Set())
  const [showQueryModal, setShowQueryModal] = useState(false)

  useEffect(() => {
    fetch('/api/databases').then(r => r.json()).then(setSources)
  }, [])

  useEffect(() => {
    if (!sourceId) { setSchema([]); setSavedQueries([]); setActiveQuerySchema(null); return }
    fetch(`/api/databases/${sourceId}/schema`).then(r => r.json()).then((tables: TableSchema[]) => {
      setSchema(tables)
      setCollapsedTables(new Set(tables.map(t => t.table).filter(t => SYSTEM_TABLES.has(t))))
    })
    fetch(`/api/databases/${sourceId}/queries`).then(r => r.json()).then(setSavedQueries)
  }, [sourceId])

  function toggleTable(table: string) {
    setCollapsedTables(prev => {
      const next = new Set(prev)
      if (next.has(table)) { next.delete(table) } else { next.add(table) }
      return next
    })
  }

  async function loadRecords(table: string) {
    if (!sourceId) return
    const rows: Record<string, string>[] = await fetch(
      `/api/records?sourceId=${sourceId}&table=${table}`
    ).then(r => r.json())
    setRecords(rows)
    if (rows[0]) { setActiveRecord(rows[0]); onRecordChange(rows[0]) }
    onSourceTableChange?.(sourceId, table)
  }

  async function loadQueryRecords(query: SavedQuery) {
    const res = await fetch(`/api/databases/${sourceId}/query/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql: query.sql }),
    })
    if (!res.ok) return
    const rows: Record<string, string>[] = await res.json()
    setRecords(rows)
    if (rows[0]) { setActiveRecord(rows[0]); onRecordChange(rows[0]) }
    const columns = rows[0] ? Object.keys(rows[0]).map(name => ({ name, type: 'text' })) : []
    setActiveQuerySchema({ table: query.name, columns })
    onQuerySelect?.(sourceId, query.sql)
  }

  async function deleteQuery(queryId: string) {
    await fetch(`/api/databases/${sourceId}/queries/${queryId}`, { method: 'DELETE' })
    setSavedQueries(prev => prev.filter(q => q.id !== queryId))
    if (activeQuerySchema) setActiveQuerySchema(null)
  }

  function handleQuerySaved(query: SavedQuery) {
    setSavedQueries(prev => [...prev, query])
    loadQueryRecords(query)
  }

  const allSchema: TableSchema[] = activeQuerySchema
    ? [activeQuerySchema, ...schema]
    : schema

  const filtered = allSchema
    .map(t => ({ ...t, columns: t.columns.filter(c =>
      `${t.table}.${c.name}`.toLowerCase().includes(search.toLowerCase())
    )}))
    .filter(t => t.columns.length > 0)

  return (
    <div className="w-52 bg-slate-50 border-l border-slate-200 flex flex-col text-xs shrink-0">
      <div className="px-3 py-2 bg-slate-800 text-slate-200 font-semibold text-xs flex items-center justify-between">
        <span>Data Fields</span>
        {sourceId && (
          <button
            onClick={() => setShowQueryModal(true)}
            title="New custom query"
            className="text-slate-400 hover:text-slate-100 text-sm leading-none"
          >+</button>
        )}
      </div>
      <div className="px-2 py-1 border-b border-slate-200">
        <select value={sourceId} onChange={e => setSourceId(e.target.value)}
          className="w-full border border-slate-300 rounded px-1 py-0.5 text-xs bg-white">
          <option value="">Select data source…</option>
          {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      {savedQueries.length > 0 && (
        <div className="border-b border-slate-200">
          <div className="px-2 py-0.5 bg-amber-100 text-amber-700 uppercase tracking-wide font-semibold text-[9px]">
            Custom Queries
          </div>
          {savedQueries.map(q => (
            <div key={q.id} className="flex items-center px-2 py-0.5 hover:bg-amber-50 group">
              <button
                onClick={() => loadQueryRecords(q)}
                className="flex-1 text-left text-amber-700 text-[10px] truncate"
                title={q.sql}
              >
                ⚡ {q.name}
              </button>
              <button
                onClick={() => deleteQuery(q.id)}
                className="text-slate-300 group-hover:text-slate-500 hover:text-red-500 ml-1 shrink-0"
                title="Delete query"
              >×</button>
            </div>
          ))}
        </div>
      )}
      <div className="px-2 py-1 border-b border-slate-200">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search fields…"
          className="w-full border border-slate-300 rounded px-2 py-0.5 text-xs" />
      </div>
      <div className="flex-1 overflow-y-auto">
        {filtered.map(({ table, columns }) => {
          const isCollapsed = collapsedTables.has(table)
          const isQueryResult = activeQuerySchema?.table === table
          return (
            <div key={table}>
              <div
                className={`px-2 py-0.5 flex items-center justify-between cursor-pointer select-none font-semibold text-[9px] uppercase tracking-wide ${isQueryResult ? 'bg-amber-200 text-amber-700' : 'bg-slate-200 text-slate-500'}`}
                onClick={() => {
                  if (!isCollapsed) {
                    toggleTable(table)
                  } else {
                    toggleTable(table)
                    if (!isQueryResult) loadRecords(table)
                  }
                }}
              >
                <span>{isQueryResult ? `⚡ ${table}` : table}</span>
                <span className="ml-1 text-[8px]">{isCollapsed ? '›' : '˅'}</span>
              </div>
              {!isCollapsed && columns.map(col => (
                <div key={col.name}
                  draggable
                  onDragStart={e => e.dataTransfer.setData('text/plain', `{{${col.name}}}`)}
                  className="px-3 py-0.5 text-sky-600 hover:bg-sky-50 cursor-grab active:cursor-grabbing">
                  {`{{${col.name}}}`}
                </div>
              ))}
            </div>
          )
        })}
      </div>
      <div className="border-t border-slate-200 p-2">
        {activeRecord ? (
          <div className="bg-slate-100 border border-slate-200 rounded p-2">
            <div className="font-semibold text-slate-500 mb-1">Active Record</div>
            <div className="text-sky-600 truncate text-[10px]">{Object.values(activeRecord)[0]}</div>
            {records.length > 1 && (
              <select className="mt-1 w-full border border-slate-300 rounded px-1 py-0.5 text-[10px] bg-white"
                onChange={e => {
                  const rec = records[Number(e.target.value)]
                  setActiveRecord(rec); onRecordChange(rec)
                }}>
                {records.map((r, i) => (
                  <option key={i} value={i}>{Object.values(r)[0]}</option>
                ))}
              </select>
            )}
          </div>
        ) : (
          <p className="text-slate-400 text-center py-2 text-[10px]">Click a table to load records</p>
        )}
      </div>
      {showQueryModal && (
        <CustomQueryModal
          sourceId={sourceId}
          onSaved={handleQuerySaved}
          onClose={() => setShowQueryModal(false)}
        />
      )}
    </div>
  )
}
