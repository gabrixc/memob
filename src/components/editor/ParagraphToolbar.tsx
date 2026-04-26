'use client'

export interface ParagraphData {
  numbering: 'none' | 'alpha' | 'outline'
  level: 1 | 2 | 3 | 4
  indent: number
  tabStop: number
}

interface Props {
  visible: boolean
  top: number    // px — fixed position from viewport top
  left: number   // px — fixed position from viewport left
  data: ParagraphData
  onChange: (patch: Partial<ParagraphData>) => void
}

const PRESETS: Record<1 | 2 | 3 | 4, { indent: number; tabStop: number }> = {
  1: { indent: 36,  tabStop: 36 },
  2: { indent: 72,  tabStop: 36 },
  3: { indent: 108, tabStop: 36 },
  4: { indent: 144, tabStop: 36 },
}

const btn = (active: boolean) =>
  `px-2 py-1 text-xs rounded border ${active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`

export default function ParagraphToolbar({ visible, top, left, data, onChange }: Props) {
  if (!visible) return null

  function setNumbering(numbering: ParagraphData['numbering']) {
    if (numbering === 'none') {
      onChange({ numbering, level: 1, indent: 0, tabStop: 0 })
    } else {
      onChange({ numbering, ...PRESETS[data.level] })
    }
  }

  function setLevel(level: 1 | 2 | 3 | 4) {
    onChange({ level, ...PRESETS[level] })
  }

  return (
    <div
      className="fixed z-50 flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 shadow-md"
      style={{ top, left }}
    >
      {/* Numbering style */}
      <div className="flex gap-1">
        <button className={btn(data.numbering === 'none')}  onClick={() => setNumbering('none')}>None</button>
        <button className={btn(data.numbering === 'alpha')} onClick={() => setNumbering('alpha')}>a) b) c)</button>
        <button className={btn(data.numbering === 'outline')} onClick={() => setNumbering('outline')}>1. 1.1</button>
      </div>

      <div className="h-4 w-px bg-slate-200" />

      {/* Level */}
      <div className="flex gap-1">
        {([1, 2, 3, 4] as const).map(l => (
          <button
            key={l}
            className={`${btn(data.level === l)} disabled:opacity-40 disabled:cursor-not-allowed`}
            disabled={data.numbering === 'none'}
            onClick={() => setLevel(l)}
          >
            L{l}
          </button>
        ))}
      </div>

      <div className="h-4 w-px bg-slate-200" />

      {/* Indent */}
      <label className="flex items-center gap-1 text-xs text-slate-600">
        Indent
        <input
          type="number"
          min={0}
          step={4}
          value={data.indent}
          onChange={e => onChange({ indent: Math.max(0, Number(e.target.value)) })}
          className="w-14 rounded border border-slate-300 px-1 py-0.5 text-xs"
        />
        px
      </label>

      {/* Tab */}
      <label className="flex items-center gap-1 text-xs text-slate-600">
        Tab
        <input
          type="number"
          min={0}
          step={4}
          value={data.tabStop}
          onChange={e => onChange({ tabStop: Math.max(0, Number(e.target.value)) })}
          className="w-14 rounded border border-slate-300 px-1 py-0.5 text-xs"
        />
        px
      </label>
    </div>
  )
}
