'use client'
import Link from 'next/link'
import { signOut } from 'next-auth/react'
import { useState, useRef } from 'react'

interface TopBarProps {
  templateName: string
  onTemplateNameChange: (name: string) => void
  onSave: () => void
  onPreview: () => void
  onMerge: () => void
  onExport: (format: 'pdf' | 'image' | 'word') => void
  onUndo?: () => void
  onRedo?: () => void
}

export default function TopBar({
  templateName, onTemplateNameChange,
  onSave, onPreview, onMerge, onExport, onUndo, onRedo,
}: TopBarProps) {
  const [editing, setEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function startEdit() {
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 20)
  }

  function commitEdit(val: string) {
    onTemplateNameChange(val.trim() || 'Untitled Memo')
    setEditing(false)
  }

  return (
    <header className="h-10 bg-slate-800 flex items-center justify-between px-4 text-sm text-slate-200 shrink-0">
      <div className="flex items-center gap-3">
        <Link href="/templates" className="font-bold text-sky-400 hover:text-sky-300 whitespace-nowrap">
          📄 MemoBuilder
        </Link>
        <span className="text-slate-600">/</span>

        {/* Editable template name */}
        {editing ? (
          <input
            ref={inputRef}
            defaultValue={templateName}
            onBlur={e => commitEdit(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter')  commitEdit((e.target as HTMLInputElement).value)
              if (e.key === 'Escape') setEditing(false)
            }}
            className="bg-slate-700 text-slate-100 text-xs rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-sky-400 w-52"
          />
        ) : (
          <button
            onClick={startEdit}
            title="Click to rename"
            className="text-slate-300 text-xs truncate max-w-52 hover:text-white hover:underline text-left">
            {templateName}
          </button>
        )}

        {/* Undo / Redo */}
        <div className="flex items-center gap-1 ml-1">
          <button onClick={onUndo} title="Undo (Ctrl+Z)"
            className="w-7 h-7 flex items-center justify-center rounded text-slate-300 hover:bg-slate-600 text-base">
            ↩
          </button>
          <button onClick={onRedo} title="Redo (Ctrl+Y)"
            className="w-7 h-7 flex items-center justify-center rounded text-slate-300 hover:bg-slate-600 text-base">
            ↪
          </button>
        </div>
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
        <button onClick={onMerge}
          className="bg-violet-500 hover:bg-violet-600 text-white px-3 py-1 rounded text-xs">
          Merge
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
        <Link href="/templates"
          className="text-slate-400 hover:text-white text-xs px-2">
          Templates
        </Link>
        <Link href="/applications"
          className="text-slate-400 hover:text-white text-xs px-2">
          Permohonan
        </Link>
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
