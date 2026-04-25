// src/components/editor/TableEditorModal.tsx
'use client'
import { useState } from 'react'
import type { TableConfig, TableBorderStyle } from '@/lib/canvas/tableConfig'

interface Column { name: string; type: string }
interface TableSchema { table: string; columns: Column[] }
interface Source { id: string; name: string }

interface TableEditorModalProps {
  initialConfig: TableConfig
  sources:        Source[]
  schema:         TableSchema[]
  onSave:         (config: TableConfig) => void
  onClose:        () => void
}

export default function TableEditorModal({ initialConfig, sources, schema, onSave, onClose }: TableEditorModalProps) {
  const [config, setConfig] = useState<TableConfig>(JSON.parse(JSON.stringify(initialConfig)))
  const allFields = schema.flatMap(t => t.columns.map(c => `{{${c.name}}}`))

  function setHeader(col: number, val: string) {
    setConfig(p => { const h = [...p.headers]; h[col] = val; return { ...p, headers: h } })
  }
  function setCellData(row: number, col: number, val: string) {
    setConfig(p => { const d = p.cellData.map(r => [...r]); d[row][col] = val; return { ...p, cellData: d } })
  }
  function addCol() {
    setConfig(p => ({
      ...p, cols: p.cols + 1,
      headers:  [...p.headers, `Col ${p.cols + 1}`],
      cellData: p.cellData.map(r => [...r, '']),
    }))
  }
  function removeCol(col: number) {
    if (config.cols <= 1) return
    setConfig(p => ({
      ...p, cols: p.cols - 1,
      headers:  p.headers.filter((_, i) => i !== col),
      cellData: p.cellData.map(r => r.filter((_, i) => i !== col)),
    }))
  }
  function addRow() {
    setConfig(p => ({ ...p, rows: p.rows + 1, cellData: [...p.cellData, Array(p.cols).fill('')] }))
  }
  function removeRow(row: number) {
    if (config.rows <= 1) return
    setConfig(p => ({ ...p, rows: p.rows - 1, cellData: p.cellData.filter((_, i) => i !== row) }))
  }
  function setBorder<K extends keyof TableBorderStyle>(key: K, val: TableBorderStyle[K]) {
    setConfig(p => ({ ...p, borderStyle: { ...p.borderStyle, [key]: val } }))
  }

  const inp = 'border border-slate-300 rounded px-1 py-0.5 text-xs bg-white'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-[680px] max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <span className="font-semibold text-sm text-slate-700">Edit Table</span>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg leading-none">×</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          <div>
            <label className="block font-medium text-slate-600 mb-1">Table Title</label>
            <input value={config.title} onChange={e => setConfig(p => ({ ...p, title: e.target.value }))}
              className={`${inp} w-full`} placeholder="Optional title" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-slate-600">Column Headers</span>
              <button onClick={addCol} className="text-sky-600 hover:text-sky-800">+ Add Column</button>
            </div>
            <div className="flex gap-2 flex-wrap">
              {config.headers.map((h, c) => (
                <div key={c} className="flex items-center gap-1">
                  <input value={h} onChange={e => setHeader(c, e.target.value)} className={`${inp} w-24`} />
                  <button onClick={() => removeCol(c)} className="text-slate-300 hover:text-red-500">×</button>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-slate-600">Cell Data</span>
              <button onClick={addRow} className="text-sky-600 hover:text-sky-800">+ Add Row</button>
            </div>
            {config.cellData.map((row, r) => (
              <div key={r} className="flex gap-2 items-center mb-1 flex-wrap">
                <span className="text-slate-400 w-10 shrink-0">Row {r + 1}</span>
                {row.map((cell, c) => (
                  <select key={c} value={cell} onChange={e => setCellData(r, c, e.target.value)} className={`${inp} w-32`}>
                    <option value="">— static —</option>
                    {allFields.map(f => <option key={f} value={f}>{f}</option>)}
                    {cell && !allFields.includes(cell) && <option value={cell}>{cell}</option>}
                  </select>
                ))}
                <button onClick={() => removeRow(r)} className="text-slate-300 hover:text-red-500 ml-auto">× Row</button>
              </div>
            ))}
          </div>
          <div>
            <label className="block font-medium text-slate-600 mb-1">Border Style</label>
            <div className="flex flex-wrap gap-4 items-center">
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked={config.borderStyle.showOuter}
                  onChange={e => setBorder('showOuter', e.target.checked)} /> Outer border
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked={config.borderStyle.showInner}
                  onChange={e => setBorder('showInner', e.target.checked)} /> Inner border
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                Colour:
                <input type="color" value={config.borderStyle.borderColor}
                  onChange={e => setBorder('borderColor', e.target.value)}
                  className="w-6 h-5 rounded border border-slate-300 cursor-pointer p-0" />
              </label>
              <label className="flex items-center gap-1">
                Weight:
                <input type="number" min={1} max={10} value={config.borderStyle.borderWeight}
                  onChange={e => setBorder('borderWeight', Number(e.target.value))}
                  className={`${inp} w-12`} /> px
              </label>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-slate-200">
          <button onClick={onClose} className="px-3 py-1 text-xs border border-slate-300 rounded hover:bg-slate-50">Cancel</button>
          <button onClick={() => onSave(config)} className="px-3 py-1 text-xs bg-sky-600 text-white rounded hover:bg-sky-700">Save Table</button>
        </div>
      </div>
    </div>
  )
}
