'use client'

interface PageNavigatorProps {
  current: number   // 1-indexed
  total: number
  onPrev: () => void
  onNext: () => void
  onAddCopy: () => void
  onAddBlank: () => void
  onDelete: () => void
}

export default function PageNavigator({
  current, total, onPrev, onNext, onAddCopy, onAddBlank, onDelete,
}: PageNavigatorProps) {
  const navBtn = (disabled: boolean) =>
    `w-7 h-7 flex items-center justify-center rounded text-base
     text-slate-300 hover:bg-slate-600 transition-colors
     ${disabled ? 'opacity-30 cursor-not-allowed pointer-events-none' : ''}`

  return (
    <div className="h-9 bg-slate-700 border-t border-slate-600 flex items-center justify-center gap-2 px-4 shrink-0">
      {/* ← prev */}
      <button onClick={onPrev} disabled={current <= 1} className={navBtn(current <= 1)}
        title="Previous page">
        ←
      </button>

      {/* page indicator */}
      <span className="text-xs text-slate-300 w-24 text-center select-none">
        Page {current} / {total}
      </span>

      {/* → next */}
      <button onClick={onNext} disabled={current >= total} className={navBtn(current >= total)}
        title="Next page">
        →
      </button>

      <div className="w-px h-4 bg-slate-600 mx-1" />

      {/* Add page copy */}
      <button onClick={onAddCopy}
        title="Add new page that is a copy of the current page"
        className="px-2.5 h-6 rounded text-xs text-slate-300 border border-slate-500 hover:bg-slate-600 transition-colors shrink-0">
        + Copy Page
      </button>

      {/* Add blank page */}
      <button onClick={onAddBlank}
        title="Add new blank page"
        className="px-2.5 h-6 rounded text-xs text-slate-300 border border-slate-500 hover:bg-slate-600 transition-colors shrink-0">
        + Blank Page
      </button>

      {/* Delete page (only when >1 page) */}
      {total > 1 && (
        <button onClick={onDelete}
          title="Delete current page"
          className="px-2.5 h-6 rounded text-xs text-red-400 border border-red-800/60 hover:bg-red-900/30 transition-colors shrink-0">
          Delete Page
        </button>
      )}
    </div>
  )
}
