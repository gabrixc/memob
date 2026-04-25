// src/components/editor/TableEditorModal.tsx
'use client'
import { useState, useEffect } from 'react'
import type { TableConfig, TableBorderStyle, CellStyle } from '@/lib/canvas/tableConfig'

interface Column { name: string; type: string }
interface TableSchema { table: string; columns: Column[] }
interface SavedQuery { id: string; name: string; sql: string; dataSourceId: string; createdAt: string }

interface TableEditorModalProps {
  initialConfig: TableConfig
  schema:         TableSchema[]
  onSave:         (config: TableConfig) => void
  onClose:        () => void
}

const inputStyle: React.CSSProperties = {
  color: '#111827',
  backgroundColor: '#fff',
  fontSize: '12px',
  border: '1px solid #cbd5e1',
  borderRadius: '4px',
  padding: '4px 8px',
}

const numInput: React.CSSProperties = {
  ...inputStyle,
  padding: '2px 4px',
  width: '52px',
  textAlign: 'center',
}

function applyDisplayTransform(text: string, transform?: CellStyle['textTransform']): string {
  if (!transform || transform === 'none') return text
  if (transform === 'uppercase') return text.toUpperCase()
  if (transform === 'lowercase') return text.toLowerCase()
  return text.replace(/\b\w/g, c => c.toUpperCase())
}

const DEFAULT_CW = 80
const DEFAULT_CH = 28

export default function TableEditorModal({ initialConfig, schema, onSave, onClose }: TableEditorModalProps) {
  const [config, setConfig] = useState<TableConfig>(JSON.parse(JSON.stringify(initialConfig)))
  const allFields = schema.flatMap(t => t.columns.map(c => `{{${c.name}}}`))

  // ── Data source & query ───────────────────────────────────────
  const [sources,      setSources]      = useState<{id:string; name:string}[]>([])
  const [sourceId,     setSourceId]     = useState('')
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([])
  const [sql,          setSql]          = useState('')
  const [queryRows,    setQueryRows]    = useState<Record<string,string>[]>([])
  const [queryLoading, setQueryLoading] = useState(false)
  const [queryError,   setQueryError]   = useState<string|null>(null)
  const [availableCols, setAvailableCols] = useState<string[]>([])
  const [checkedCols,   setCheckedCols]   = useState<Set<string>>(new Set())
  const [colsApplied,   setColsApplied]   = useState(false)
  const [previewPage,  setPreviewPage]  = useState(0)
  const PAGE_SIZE = 10

  // ── Cell style selection ─────────────────────────────────────
  const [selectedCell, setSelectedCell] = useState<{row: number; col: number; isHeader: boolean} | null>(null)

  useEffect(() => {
    fetch('/api/databases')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(setSources)
      .catch(console.error)
  }, [])

  // ── Derived layout helpers ───────────────────────────────────
  function getColWidth(col: number): number {
    return config.colWidths?.[col] ?? DEFAULT_CW
  }
  function getRowHeight(): number {
    return config.rowHeight ?? DEFAULT_CH
  }

  // ── Table config helpers ─────────────────────────────────────
  function setHeader(col: number, val: string) {
    setConfig(p => { const h = [...p.headers]; h[col] = val; return { ...p, headers: h } })
  }
  function setColWidth(col: number, width: number) {
    setConfig(p => {
      const widths = p.colWidths ? [...p.colWidths] : Array.from({ length: p.cols }, () => DEFAULT_CW)
      while (widths.length < p.cols) widths.push(DEFAULT_CW)
      widths[col] = Math.max(40, Math.min(400, width))
      return { ...p, colWidths: widths }
    })
  }
  function setCellData(row: number, col: number, val: string) {
    setConfig(p => { const d = p.cellData.map(r => [...r]); d[row][col] = val; return { ...p, cellData: d } })
  }
  function addCol() {
    setConfig(p => ({
      ...p, cols: p.cols + 1,
      headers:      [...p.headers, `Col ${p.cols + 1}`],
      cellData:     p.cellData.map(r => [...r, '']),
      headerStyles: p.headerStyles ? [...p.headerStyles, {}] : undefined,
      cellStyles:   p.cellStyles ? p.cellStyles.map(r => [...r, {}]) : undefined,
      colWidths:    p.colWidths ? [...p.colWidths, DEFAULT_CW] : undefined,
    }))
  }
  function removeCol(col: number) {
    setConfig(p => {
      if (p.cols <= 1) return p
      return {
        ...p, cols: p.cols - 1,
        headers:      p.headers.filter((_, i) => i !== col),
        cellData:     p.cellData.map(r => r.filter((_, i) => i !== col)),
        headerStyles: p.headerStyles?.filter((_, i) => i !== col),
        cellStyles:   p.cellStyles?.map(r => r.filter((_, i) => i !== col)),
        colWidths:    p.colWidths?.filter((_, i) => i !== col),
      }
    })
    if (selectedCell?.col === col) setSelectedCell(null)
  }
  function addRow() {
    setConfig(p => ({
      ...p, rows: p.rows + 1,
      cellData:   [...p.cellData, Array(p.cols).fill('')],
      cellStyles: p.cellStyles ? [...p.cellStyles, Array(p.cols).fill({})] : undefined,
    }))
  }
  function removeRow(row: number) {
    setConfig(p => {
      if (p.rows <= 1) return p
      return {
        ...p, rows: p.rows - 1,
        cellData:   p.cellData.filter((_, i) => i !== row),
        cellStyles: p.cellStyles?.filter((_, i) => i !== row),
      }
    })
    if (selectedCell && !selectedCell.isHeader && selectedCell.row === row) setSelectedCell(null)
  }
  function setBorder<K extends keyof TableBorderStyle>(key: K, val: TableBorderStyle[K]) {
    setConfig(p => ({ ...p, borderStyle: { ...p.borderStyle, [key]: val } }))
  }

  function stopKeys(e: React.KeyboardEvent) { e.stopPropagation() }

  // ── Cell style helpers ───────────────────────────────────────
  function getCellStyle(isHeader: boolean, row: number, col: number): CellStyle {
    return isHeader
      ? (config.headerStyles?.[col] ?? {})
      : (config.cellStyles?.[row]?.[col] ?? {})
  }
  function patchCellStyle(isHeader: boolean, row: number, col: number, patch: Partial<CellStyle>) {
    setConfig(p => {
      if (isHeader) {
        const styles: CellStyle[] = p.headerStyles
          ? [...p.headerStyles]
          : Array.from({ length: p.cols }, () => ({}))
        while (styles.length <= col) styles.push({})
        styles[col] = { ...styles[col], ...patch }
        return { ...p, headerStyles: styles }
      } else {
        const styles: CellStyle[][] = p.cellStyles
          ? p.cellStyles.map(r => [...r])
          : Array.from({ length: p.rows }, () => Array.from({ length: p.cols }, () => ({})))
        while (styles.length <= row) styles.push(Array.from({ length: p.cols }, () => ({})))
        while (styles[row].length <= col) styles[row].push({})
        styles[row][col] = { ...styles[row][col], ...patch }
        return { ...p, cellStyles: styles }
      }
    })
  }

  // ── Data source handlers ─────────────────────────────────────
  function handleSourceChange(id: string) {
    setSourceId(id)
    setSavedQueries([]); setSql(''); setQueryRows([]); setQueryError(null)
    setAvailableCols([]); setCheckedCols(new Set()); setColsApplied(false); setPreviewPage(0)
    if (id) {
      fetch(`/api/databases/${id}/queries`)
        .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
        .then(setSavedQueries)
        .catch(console.error)
    }
  }
  function handleQueryBadgeClick(q: SavedQuery) { setSql(q.sql) }
  async function handleRunQuery() {
    if (!sourceId || !sql.trim()) return
    setQueryLoading(true); setQueryError(null); setColsApplied(false); setPreviewPage(0)
    try {
      const res = await fetch(`/api/databases/${sourceId}/query/run`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sql }),
      })
      const data = await res.json()
      if (!res.ok) { setQueryError(data.error ?? 'Query failed'); return }
      const rows: Record<string,string>[] = data
      setQueryRows(rows)
      const cols = Object.keys(rows[0] ?? {})
      setAvailableCols(cols)
      setCheckedCols(new Set(cols.slice(0, 5)))
    } catch { setQueryError('Network error') }
    finally { setQueryLoading(false) }
  }
  function toggleCol(name: string) {
    setCheckedCols(prev => {
      const next = new Set(prev)
      if (next.has(name)) { next.delete(name) } else if (next.size < 5) { next.add(name) }
      return next
    })
  }
  function handleApplyColumns() {
    const chosen = availableCols.filter(c => checkedCols.has(c))
    setConfig(p => ({
      ...p, cols: chosen.length, headers: chosen, rows: 1,
      cellData:     [chosen.map(c => `{{${c}}}`)],
      headerStyles: Array.from({ length: chosen.length }, () => ({})),
      cellStyles:   [Array.from({ length: chosen.length }, () => ({}))],
      colWidths:    Array.from({ length: chosen.length }, () => DEFAULT_CW),
    }))
    setColsApplied(true); setSelectedCell(null)
  }

  // ── Style control configs ────────────────────────────────────
  const H_ALIGNS: { val: CellStyle['textAlign']; label: string; title: string }[] = [
    { val: 'left',   label: '⬅', title: 'Align left' },
    { val: 'center', label: '⬆', title: 'Align center' },
    { val: 'right',  label: '➡', title: 'Align right' },
  ]
  const V_ALIGNS: { val: CellStyle['verticalAlign']; label: string; title: string }[] = [
    { val: 'top',    label: '↑', title: 'Align top' },
    { val: 'middle', label: '⊝', title: 'Align middle' },
    { val: 'bottom', label: '↓', title: 'Align bottom' },
  ]
  const TRANSFORMS: { val: CellStyle['textTransform']; label: string; title: string }[] = [
    { val: 'none',       label: '—',  title: 'No transform' },
    { val: 'uppercase',  label: 'AA', title: 'UPPERCASE' },
    { val: 'capitalize', label: 'Aa', title: 'Capitalize' },
    { val: 'lowercase',  label: 'aa', title: 'lowercase' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onKeyDown={stopKeys}>
      <div className="bg-white rounded-lg shadow-xl w-[860px] max-w-[95vw] max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <span className="font-semibold text-sm text-slate-700">Edit Table</span>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg leading-none">×</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs" style={{ color: '#111827' }}>

          {/* ── Table Title ── */}
          <div>
            <label className="block font-medium mb-1" style={{ color: '#475569' }}>Table Title</label>
            <input value={config.title} onChange={e => setConfig(p => ({ ...p, title: e.target.value }))}
              placeholder="Optional title" style={{ ...inputStyle, width: '100%' }} />
          </div>

          {/* ── Data Source ── */}
          <div>
            <label className="block font-medium mb-1" style={{ color: '#475569' }}>Data Source</label>
            <select value={sourceId} onChange={e => handleSourceChange(e.target.value)} style={{ ...inputStyle, width: '100%' }}>
              <option value="">— none —</option>
              {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {sourceId && (
              <div className="mt-2 space-y-2">
                {savedQueries.length > 0 && (
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#b45309' }}>Saved Queries</span>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {savedQueries.map(q => (
                        <button key={q.id} onClick={() => handleQueryBadgeClick(q)} title={q.sql}
                          className="px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-300">
                          ⚡ {q.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <textarea value={sql} onChange={e => setSql(e.target.value)} rows={3} placeholder="SELECT …"
                  style={{ ...inputStyle, width: '100%', fontFamily: 'monospace', resize: 'vertical' }} />
                <div className="flex items-center gap-2">
                  <button onClick={handleRunQuery} disabled={queryLoading || !sql.trim()}
                    className="px-3 py-1 text-xs bg-sky-600 text-white rounded hover:bg-sky-700 disabled:opacity-50">
                    {queryLoading ? 'Running…' : 'Run Query'}
                  </button>
                  {queryError && <span className="text-red-500 text-xs">{queryError}</span>}
                </div>
              </div>
            )}
          </div>

          {/* ── Column Chooser ── */}
          {availableCols.length > 0 && !colsApplied && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium" style={{ color: '#475569' }}>Pick Columns (max 5)</span>
                <span className="text-[10px]" style={{ color: '#94a3b8' }}>{checkedCols.size}/5 selected</span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {availableCols.map(col => (
                  <label key={col} className="flex items-center gap-1 cursor-pointer text-xs">
                    <input type="checkbox" checked={checkedCols.has(col)}
                      disabled={!checkedCols.has(col) && checkedCols.size >= 5}
                      onChange={() => toggleCol(col)} />
                    <span style={{ color: checkedCols.has(col) ? '#0284c7' : '#374151' }}>{col}</span>
                  </label>
                ))}
              </div>
              <button onClick={handleApplyColumns} disabled={checkedCols.size === 0}
                className="mt-2 px-3 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50">
                Apply Columns
              </button>
            </div>
          )}

          {/* ── Data Preview ── */}
          {queryRows.length > 0 && (() => {
            const totalPages  = Math.ceil(queryRows.length / PAGE_SIZE)
            const pageRows    = queryRows.slice(previewPage * PAGE_SIZE, (previewPage + 1) * PAGE_SIZE)
            const previewCols = colsApplied ? config.headers : availableCols
            return (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium" style={{ color: '#475569' }}>Data Preview</span>
                  <span className="text-[10px]" style={{ color: '#94a3b8' }}>
                    Page {previewPage + 1} of {totalPages} ({queryRows.length} records)
                  </span>
                </div>
                <div className="overflow-x-auto border border-slate-200 rounded">
                  <table className="w-full text-[10px] border-collapse">
                    <thead><tr>
                      {previewCols.map(col => (
                        <th key={col} className="px-2 py-1 border border-slate-200 bg-slate-100 text-left font-semibold text-slate-600 whitespace-nowrap">{col}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {pageRows.map((row, i) => (
                        <tr key={i}>{previewCols.map(col => (
                          <td key={col} className="px-2 py-1 border border-slate-200 truncate max-w-[120px]">{row[col] ?? ''}</td>
                        ))}</tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center gap-2 mt-1">
                    <button onClick={() => setPreviewPage(p => p - 1)} disabled={previewPage === 0}
                      className="px-2 py-0.5 text-xs border border-slate-200 rounded disabled:opacity-40 hover:bg-slate-100">←</button>
                    <button onClick={() => setPreviewPage(p => p + 1)} disabled={previewPage >= totalPages - 1}
                      className="px-2 py-0.5 text-xs border border-slate-200 rounded disabled:opacity-40 hover:bg-slate-100">→</button>
                  </div>
                )}
              </div>
            )
          })()}

          {/* ── Column Headers + Width ── */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium" style={{ color: '#475569' }}>Column Headers & Widths</span>
              <button onClick={addCol} className="text-sky-600 hover:text-sky-800">+ Add Column</button>
            </div>
            <div className="flex gap-3 flex-wrap">
              {config.headers.map((h, c) => (
                <div key={c} className="flex flex-col gap-1">
                  <div className="flex items-center gap-1">
                    <input value={h} onChange={e => setHeader(c, e.target.value)} style={{ ...inputStyle, width: '88px' }} />
                    <button onClick={() => removeCol(c)} className="text-slate-300 hover:text-red-500">×</button>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[9px]" style={{ color: '#94a3b8' }}>W:</span>
                    <input
                      type="number" min={40} max={400}
                      value={getColWidth(c)}
                      onChange={e => setColWidth(c, Number(e.target.value))}
                      style={numInput}
                    />
                    <span className="text-[9px]" style={{ color: '#94a3b8' }}>px</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Cell Data + Row Height ── */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-3">
                <span className="font-medium" style={{ color: '#475569' }}>Cell Data</span>
                <label className="flex items-center gap-1" style={{ color: '#475569' }}>
                  <span className="text-[10px]">Row H:</span>
                  <input
                    type="number" min={20} max={200}
                    value={getRowHeight()}
                    onChange={e => setConfig(p => ({ ...p, rowHeight: Math.max(20, Math.min(200, Number(e.target.value))) }))}
                    style={numInput}
                  />
                  <span className="text-[9px]" style={{ color: '#94a3b8' }}>px</span>
                </label>
              </div>
              <button onClick={addRow} className="text-sky-600 hover:text-sky-800">+ Add Row</button>
            </div>
            {config.cellData.map((row, r) => (
              <div key={r} className="flex gap-2 items-center mb-1 flex-wrap">
                <span className="w-10 shrink-0" style={{ color: '#94a3b8' }}>Row {r + 1}</span>
                {row.map((cell, c) => (
                  <select key={c} value={cell} onChange={e => setCellData(r, c, e.target.value)}
                    style={{ ...inputStyle, width: '128px' }}>
                    <option value="">— static —</option>
                    {allFields.map(f => <option key={f} value={f}>{f}</option>)}
                    {cell && !allFields.includes(cell) && <option value={cell}>{cell}</option>}
                  </select>
                ))}
                <button onClick={() => removeRow(r)} className="text-slate-300 hover:text-red-500 ml-auto">× Row</button>
              </div>
            ))}
          </div>

          {/* ── Cell Styles ── */}
          <div>
            <label className="block font-medium mb-1" style={{ color: '#475569' }}>Cell Styles</label>
            <p className="text-[10px] mb-2" style={{ color: '#94a3b8' }}>Click a cell to style it</p>
            <div className="overflow-x-auto">
              <table className="border-collapse text-[10px]" style={{ height: getRowHeight() }}>
                <thead>
                  <tr style={{ height: getRowHeight() }}>
                    {config.headers.map((h, c) => {
                      const isSelected = selectedCell?.isHeader && selectedCell.col === c
                      const style = getCellStyle(true, 0, c)
                      return (
                        <th key={c}
                          onClick={() => setSelectedCell({ row: 0, col: c, isHeader: true })}
                          className={`px-2 border cursor-pointer font-semibold bg-slate-100 select-none ${isSelected ? 'border-sky-500 ring-2 ring-sky-400 ring-inset' : 'border-slate-300 hover:bg-slate-200'}`}
                          style={{
                            color:      style.color ?? '#475569',
                            fontWeight: style.fontWeight ?? 600,
                            width:      getColWidth(c),
                            minWidth:   getColWidth(c),
                            maxWidth:   getColWidth(c),
                            textAlign:  style.textAlign ?? 'left',
                            height:     getRowHeight(),
                          }}
                        >
                          {applyDisplayTransform(h || `Col ${c + 1}`, style.textTransform)}
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {config.cellData.map((row, r) => (
                    <tr key={r} style={{ height: getRowHeight() }}>
                      {row.map((cell, c) => {
                        const isSelected = selectedCell && !selectedCell.isHeader && selectedCell.row === r && selectedCell.col === c
                        const style = getCellStyle(false, r, c)
                        return (
                          <td key={c}
                            onClick={() => setSelectedCell({ row: r, col: c, isHeader: false })}
                            className={`px-2 border cursor-pointer select-none ${isSelected ? 'border-sky-500 ring-2 ring-sky-400 ring-inset' : 'border-slate-200 hover:bg-slate-50'}`}
                            style={{
                              color:      style.color ?? '#6b7280',
                              fontWeight: style.fontWeight ?? 'normal',
                              textAlign:  style.textAlign ?? 'left',
                              width:      getColWidth(c),
                              minWidth:   getColWidth(c),
                              maxWidth:   getColWidth(c),
                              height:     getRowHeight(),
                            }}
                          >
                            {applyDisplayTransform(cell || '—', style.textTransform)}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Style controls */}
            {selectedCell && (() => {
              const { row, col, isHeader } = selectedCell
              const style = getCellStyle(isHeader, row, col)
              const label = isHeader ? `Header: ${config.headers[col] ?? `Col ${col + 1}`}` : `Row ${row + 1}, Col ${col + 1}`
              return (
                <div className="mt-2 p-3 border border-slate-200 rounded bg-slate-50 space-y-2">
                  <div className="text-[10px] font-semibold" style={{ color: '#475569' }}>{label}</div>
                  <div className="flex flex-wrap gap-3 items-center">
                    <label className="flex items-center gap-1 text-[10px]" style={{ color: '#475569' }}>
                      Color
                      <input type="color" value={style.color ?? '#475569'}
                        onChange={e => patchCellStyle(isHeader, row, col, { color: e.target.value })}
                        className="w-6 h-5 rounded border border-slate-300 cursor-pointer p-0" />
                    </label>
                    <button
                      onClick={() => patchCellStyle(isHeader, row, col, { fontWeight: style.fontWeight === 'bold' ? 'normal' : 'bold' })}
                      title="Toggle bold"
                      className={`px-2 py-0.5 text-xs font-bold border rounded ${style.fontWeight === 'bold' ? 'bg-sky-600 text-white border-sky-600' : 'border-slate-300 hover:bg-slate-100'}`}
                    >B</button>
                    <div className="flex items-center gap-0.5">
                      {H_ALIGNS.map(({ val, label: lbl, title }) => (
                        <button key={val} onClick={() => patchCellStyle(isHeader, row, col, { textAlign: val })} title={title}
                          className={`px-1.5 py-0.5 text-xs border rounded ${style.textAlign === val ? 'bg-sky-600 text-white border-sky-600' : 'border-slate-300 hover:bg-slate-100'}`}>
                          {lbl}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-0.5">
                      {V_ALIGNS.map(({ val, label: lbl, title }) => (
                        <button key={val} onClick={() => patchCellStyle(isHeader, row, col, { verticalAlign: val })} title={title}
                          className={`px-1.5 py-0.5 text-xs border rounded ${style.verticalAlign === val ? 'bg-sky-600 text-white border-sky-600' : 'border-slate-300 hover:bg-slate-100'}`}>
                          {lbl}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-0.5">
                      {TRANSFORMS.map(({ val, label: lbl, title }) => (
                        <button key={val} onClick={() => patchCellStyle(isHeader, row, col, { textTransform: val })} title={title}
                          className={`px-1.5 py-0.5 text-xs border rounded ${(style.textTransform ?? 'none') === val ? 'bg-sky-600 text-white border-sky-600' : 'border-slate-300 hover:bg-slate-100'}`}>
                          {lbl}
                        </button>
                      ))}
                    </div>
                    <label className="flex items-center gap-1 text-[10px] cursor-pointer" style={{ color: '#475569' }}>
                      <input type="checkbox" checked={!!style.wrap}
                        onChange={e => patchCellStyle(isHeader, row, col, { wrap: e.target.checked })} />
                      Wrap text
                    </label>
                  </div>
                </div>
              )
            })()}
          </div>

          {/* ── Border Style ── */}
          <div>
            <label className="block font-medium mb-1" style={{ color: '#475569' }}>Border Style</label>
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
                  style={{ ...inputStyle, width: '48px' }} /> px
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
