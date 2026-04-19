// src/components/editor/StatusBar.tsx
interface StatusBarProps {
  page: number
  totalPages: number
  zoom: number
  objectCount: number
  selectedCount: number
  gridSize: number
  snapEnabled: boolean
}

export default function StatusBar({
  page, totalPages, zoom, objectCount, selectedCount, gridSize, snapEnabled
}: StatusBarProps) {
  return (
    <footer className="h-6 bg-slate-800 flex items-center justify-between px-4 text-xs text-slate-400 shrink-0">
      <span>Page {page} of {totalPages} &nbsp;|&nbsp; Zoom: {zoom}% &nbsp;|&nbsp; Canvas: A4 (794×1123px)</span>
      <span>Objects: {objectCount} &nbsp; Selected: {selectedCount} &nbsp;|&nbsp; Grid: {gridSize}px &nbsp;|&nbsp; Snap: {snapEnabled ? 'ON' : 'OFF'}</span>
    </footer>
  )
}
