'use client'

export type Tool = 'select' | 'text' | 'line' | 'table' | 'image' | 'rect' | 'pagebreak' | 'paragraph'

const TOOLS: { tool: Tool; icon: string; title: string }[] = [
  { tool: 'select',    icon: '↖', title: 'Select (V)' },
  { tool: 'text',      icon: 'T', title: 'Text Box (T)' },
  { tool: 'paragraph', icon: '¶', title: 'Paragraph Block' },
  { tool: 'line',      icon: '╱', title: 'Line (L)' },
  { tool: 'table',     icon: '⊞', title: 'Table' },
  { tool: 'image',     icon: '🖼', title: 'Image Placeholder' },
  { tool: 'rect',      icon: '▭', title: 'Rectangle (R)' },
  { tool: 'pagebreak', icon: '─', title: 'Page Break' },
]

interface LeftToolbarProps {
  activeTool: Tool
  onToolChange: (tool: Tool) => void
  snapEnabled: boolean
  onSnapToggle: () => void
  onCopy: () => void
  onCut: () => void
  onPaste: () => void
}

export default function LeftToolbar({
  activeTool, onToolChange, snapEnabled, onSnapToggle,
  onCopy, onCut, onPaste,
}: LeftToolbarProps) {
  return (
    <div className="w-14 bg-slate-50 border-r border-slate-200 flex flex-col items-center py-2 gap-1 shrink-0">
      <span className="text-slate-400 text-[9px] uppercase tracking-widest mb-1">Tools</span>
      {TOOLS.map(({ tool, icon, title }) => (
        <button key={tool} title={title} onClick={() => onToolChange(tool)}
          className={`w-9 h-9 flex items-center justify-center rounded text-base
            ${activeTool === tool
              ? 'bg-sky-500 text-white'
              : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
            }`}>
          {icon}
        </button>
      ))}
      <div className="w-9 border-t border-slate-300 my-1" />
      {[
        { icon: '⎘', title: 'Copy (Ctrl+C)', action: onCopy },
        { icon: '✂', title: 'Cut (Ctrl+X)',  action: onCut },
        { icon: '📋', title: 'Paste (Ctrl+V)', action: onPaste },
      ].map(({ icon, title, action }) => (
        <button key={title} title={title} onClick={action}
          className="w-9 h-9 flex items-center justify-center rounded bg-slate-200 text-slate-600 hover:bg-slate-300 text-sm">
          {icon}
        </button>
      ))}
      <div className="mt-auto pb-1">
        <button onClick={onSnapToggle} className="text-[9px] text-slate-500 text-center leading-tight">
          Grid<br />
          <span className={snapEnabled ? 'text-sky-500' : 'text-slate-400'}>
            {snapEnabled ? 'ON' : 'OFF'}
          </span>
        </button>
      </div>
    </div>
  )
}
