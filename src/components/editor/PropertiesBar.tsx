'use client'
import type { FabricObject } from 'fabric'

interface PropertiesBarProps {
  selected: FabricObject | null
  gridSize: number
  onGridSizeChange: (size: number) => void
}

export default function PropertiesBar({ selected, gridSize, onGridSizeChange }: PropertiesBarProps) {
  return (
    <div className="h-8 bg-slate-100 border-b border-slate-200 flex items-center px-3 gap-4 text-xs text-slate-600 shrink-0">
      <span>X: <b>{Math.round(selected?.left ?? 0)}</b></span>
      <span>Y: <b>{Math.round(selected?.top ?? 0)}</b></span>
      <span>W: <b>{Math.round((selected?.width ?? 0) * (selected?.scaleX ?? 1))}</b></span>
      <span>H: <b>{Math.round((selected?.height ?? 0) * (selected?.scaleY ?? 1))}</b></span>
      <div className="ml-auto flex items-center gap-2">
        <span className="text-slate-400">Grid:</span>
        <select value={gridSize} onChange={e => onGridSizeChange(Number(e.target.value))}
          className="border border-slate-300 rounded px-1 py-0.5 text-xs bg-white">
          {[4, 8, 16, 24, 32].map(s => <option key={s} value={s}>{s}px</option>)}
        </select>
      </div>
    </div>
  )
}
