'use client'
import { useEffect, useState } from 'react'

interface Column { name: string; type: string }
interface TableSchema { table: string; columns: Column[] }

interface RightPaneProps {
  onFieldDrop: (field: string, x: number, y: number) => void
  onRecordChange: (record: Record<string, string>) => void
}

export default function RightPane({ onFieldDrop, onRecordChange }: RightPaneProps) {
  const [sources, setSources] = useState<{ id: string; name: string }[]>([])
  const [sourceId, setSourceId] = useState('')
  const [schema, setSchema] = useState<TableSchema[]>([])
  const [search, setSearch] = useState('')
  const [records, setRecords] = useState<Record<string, string>[]>([])
  const [activeRecord, setActiveRecord] = useState<Record<string, string> | null>(null)

  useEffect(() => {
    fetch('/api/databases').then(r => r.json()).then(setSources)
  }, [])

  useEffect(() => {
    if (!sourceId) return
    fetch(`/api/databases/${sourceId}/schema`).then(r => r.json()).then(setSchema)
  }, [sourceId])

  async function loadRecords(table: string) {
    if (!sourceId) return
    const rows: Record<string, string>[] = await fetch(
      `/api/records?sourceId=${sourceId}&table=${table}`
    ).then(r => r.json())
    setRecords(rows)
    if (rows[0]) { setActiveRecord(rows[0]); onRecordChange(rows[0]) }
  }

  const filtered = schema
    .map(t => ({ ...t, columns: t.columns.filter(c =>
      `${t.table}.${c.name}`.toLowerCase().includes(search.toLowerCase())
    )}))
    .filter(t => t.columns.length > 0)

  return (
    <div className="w-52 bg-slate-50 border-l border-slate-200 flex flex-col text-xs shrink-0">
      <div className="px-3 py-2 bg-slate-800 text-slate-200 font-semibold text-xs">Data Fields</div>
      <div className="px-2 py-1 border-b border-slate-200">
        <select value={sourceId} onChange={e => setSourceId(e.target.value)}
          className="w-full border border-slate-300 rounded px-1 py-0.5 text-xs bg-white">
          <option value="">Select data source…</option>
          {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      <div className="px-2 py-1 border-b border-slate-200">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search fields…"
          className="w-full border border-slate-300 rounded px-2 py-0.5 text-xs" />
      </div>
      <div className="flex-1 overflow-y-auto">
        {filtered.map(({ table, columns }) => (
          <div key={table}>
            <div className="px-2 py-0.5 bg-slate-200 text-slate-500 uppercase tracking-wide font-semibold text-[9px] cursor-pointer"
              onClick={() => loadRecords(table)}>
              {table}
            </div>
            {columns.map(col => (
              <div key={col.name}
                draggable
                onDragStart={e => e.dataTransfer.setData('text/plain', `{{${col.name}}}`)}
                className="px-3 py-0.5 text-sky-600 hover:bg-sky-50 cursor-grab active:cursor-grabbing">
                {`{{${col.name}}}`}
              </div>
            ))}
          </div>
        ))}
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
    </div>
  )
}
