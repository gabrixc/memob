'use client'
import Link from 'next/link'

interface Props {
  templateName: string
  recordIndex: number
  total: number
  onPrev: () => void
  onNext: () => void
  onPrintCurrent: () => void
  onPrintAll: () => void
  onToggleEmail: () => void
  isPrintingAll: boolean
}

export default function MergeActionBar({
  templateName, recordIndex, total,
  onPrev, onNext, onPrintCurrent, onPrintAll, onToggleEmail,
  isPrintingAll,
}: Props) {
  const btnBase = 'px-3 py-1.5 rounded text-xs font-medium transition-colors'
  const navBtn = (disabled: boolean) =>
    `w-8 h-8 flex items-center justify-center rounded text-slate-300 hover:bg-slate-600 text-base transition-colors
     ${disabled ? 'opacity-30 cursor-not-allowed pointer-events-none' : ''}`

  return (
    <div className="fixed top-0 left-0 right-0 h-12 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-4 z-50 shadow-md">
      {/* Left: back + template name */}
      <div className="flex items-center gap-3 min-w-0">
        <Link href="/templates" className="text-sky-400 hover:text-sky-300 text-xs font-medium whitespace-nowrap">
          ← Templates
        </Link>
        <span className="text-slate-600 text-sm">|</span>
        <span className="text-slate-300 text-xs truncate max-w-48" title={templateName}>{templateName}</span>
      </div>

      {/* Center: record navigation */}
      <div className="flex items-center gap-2">
        <button onClick={onPrev} disabled={recordIndex <= 0} className={navBtn(recordIndex <= 0)} title="Previous record">
          ‹
        </button>
        <span className="text-xs text-slate-200 w-32 text-center select-none">
          Record {recordIndex + 1} of {total}
        </span>
        <button onClick={onNext} disabled={recordIndex >= total - 1} className={navBtn(recordIndex >= total - 1)} title="Next record">
          ›
        </button>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2">
        <button onClick={onPrintCurrent} disabled={isPrintingAll}
          className={`${btnBase} bg-indigo-500 hover:bg-indigo-600 text-white disabled:opacity-40`}>
          Print Current
        </button>
        <button onClick={onPrintAll} disabled={isPrintingAll}
          className={`${btnBase} bg-violet-500 hover:bg-violet-600 text-white disabled:opacity-40`}>
          {isPrintingAll ? 'Generating…' : 'Print All'}
        </button>
        <button onClick={onToggleEmail}
          className={`${btnBase} bg-emerald-600 hover:bg-emerald-700 text-white`}>
          Email
        </button>
        <button onClick={() => window.close()}
          className={`${btnBase} bg-slate-600 hover:bg-slate-500 text-white`}>
          Close
        </button>
      </div>
    </div>
  )
}
