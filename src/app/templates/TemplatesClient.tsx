'use client'
import { useState, useRef } from 'react'
import Link from 'next/link'

interface TemplateItem {
  id: string
  name: string
  pageSize: string
  createdAt: string
  updatedAt: string
}

export default function TemplatesClient({ initialTemplates }: { initialTemplates: TemplateItem[] }) {
  const [templates, setTemplates] = useState(initialTemplates)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const renameRef = useRef<HTMLInputElement>(null)

  async function handleDelete(id: string) {
    if (!confirm('Delete this template? This cannot be undone.')) return
    await fetch(`/api/templates/${id}`, { method: 'DELETE' })
    setTemplates(ts => ts.filter(t => t.id !== id))
  }

  function startRename(t: TemplateItem) {
    setRenamingId(t.id)
    setRenameValue(t.name)
    setTimeout(() => renameRef.current?.focus(), 50)
  }

  async function commitRename(id: string) {
    const trimmed = renameValue.trim()
    if (!trimmed) { setRenamingId(null); return }
    await fetch(`/api/templates/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: trimmed }),
    })
    setTemplates(ts => ts.map(t => t.id === id ? { ...t, name: trimmed } : t))
    setRenamingId(null)
  }

  function fmt(iso: string) {
    return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-slate-800 text-white px-6 py-4 flex items-center justify-between shadow">
        <div className="flex items-center gap-3">
          <Link href="/" className="font-bold text-sky-400 text-lg hover:text-sky-300">📄 MemoBuilder</Link>
          <span className="text-slate-500">/</span>
          <span className="text-slate-200 text-sm">My Templates</span>
        </div>
        <Link href="/"
          className="bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded text-sm font-medium">
          + New Template
        </Link>
      </header>

      {/* Body */}
      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold text-slate-700">
            {templates.length} template{templates.length !== 1 ? 's' : ''}
          </h1>
        </div>

        {templates.length === 0 ? (
          <div className="text-center py-24 text-slate-400">
            <div className="text-7xl mb-4">📄</div>
            <p className="text-lg font-medium mb-2">No templates yet</p>
            <p className="text-sm mb-6">Create your first memo template to get started.</p>
            <Link href="/"
              className="inline-block bg-sky-500 hover:bg-sky-600 text-white px-6 py-2 rounded text-sm">
              Create Template
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {templates.map(t => (
              <div key={t.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col">

                {/* Thumbnail */}
                <Link href={`/?id=${t.id}`}
                  className="h-44 bg-gradient-to-b from-slate-50 to-slate-100 rounded-t-xl flex flex-col items-center justify-center border-b border-slate-200 group">
                  <span className="text-5xl group-hover:scale-110 transition-transform">📄</span>
                  <span className="mt-2 text-[10px] text-slate-400 uppercase tracking-widest">{t.pageSize}</span>
                </Link>

                {/* Name */}
                <div className="px-3 pt-3 pb-1 flex-1">
                  {renamingId === t.id ? (
                    <input
                      ref={renameRef}
                      value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      onBlur={() => commitRename(t.id)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') commitRename(t.id)
                        if (e.key === 'Escape') setRenamingId(null)
                      }}
                      className="w-full text-sm font-semibold text-slate-800 border-b border-sky-400 focus:outline-none bg-transparent"
                    />
                  ) : (
                    <h3
                      className="text-sm font-semibold text-slate-800 truncate cursor-pointer hover:text-sky-600"
                      title="Click to rename"
                      onClick={() => startRename(t)}
                    >
                      {t.name}
                    </h3>
                  )}
                  <p className="text-[11px] text-slate-400 mt-0.5">Updated {fmt(t.updatedAt)}</p>
                </div>

                {/* Actions */}
                <div className="px-3 pb-3 flex gap-2 mt-1">
                  <Link href={`/?id=${t.id}`}
                    className="flex-1 text-center bg-sky-500 hover:bg-sky-600 text-white py-1.5 rounded text-xs font-medium">
                    Open
                  </Link>
                  <Link href={`/merge/${t.id}`}
                    className="flex-1 text-center bg-violet-500 hover:bg-violet-600 text-white py-1.5 rounded text-xs font-medium">
                    Merge
                  </Link>
                  <button
                    onClick={() => startRename(t)}
                    title="Rename"
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-xs border border-slate-200">
                    ✏
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    title="Delete"
                    className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded text-xs border border-red-200">
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
