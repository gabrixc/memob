// src/components/editor/TopBar.tsx
'use client'
import { signOut } from 'next-auth/react'

interface TopBarProps {
  templateName: string
  onSave: () => void
  onPreview: () => void
  onExport: (format: 'pdf' | 'image' | 'word') => void
}

export default function TopBar({ templateName, onSave, onPreview, onExport }: TopBarProps) {
  return (
    <header className="h-10 bg-slate-800 flex items-center justify-between px-4 text-sm text-slate-200 shrink-0">
      <div className="flex items-center gap-3">
        <span className="font-bold text-sky-400">📄 MemoBuilder</span>
        <span className="text-slate-400 text-xs truncate max-w-48">{templateName}</span>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onSave}
          className="bg-sky-500 hover:bg-sky-600 text-white px-3 py-1 rounded text-xs">
          Save
        </button>
        <button onClick={onPreview}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1 rounded text-xs">
          Preview
        </button>
        <div className="relative group">
          <button className="bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1 rounded text-xs">
            Export ▾
          </button>
          <div className="hidden group-hover:flex flex-col absolute right-0 top-7 bg-white border border-slate-200 rounded shadow-lg z-50 min-w-28">
            {(['pdf', 'image', 'word'] as const).map(f => (
              <button key={f} onClick={() => onExport(f)}
                className="px-4 py-2 text-xs text-slate-700 hover:bg-slate-100 text-left">
                {f === 'image' ? 'Image (PNG)' : f.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <a href="/settings"
          className="text-slate-400 hover:text-white text-xs px-2">
          Settings
        </a>
        <button onClick={() => signOut()}
          className="text-slate-400 hover:text-white text-xs px-2">
          Sign out
        </button>
      </div>
    </header>
  )
}
