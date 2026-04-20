'use client'
import { useEffect, useState } from 'react'

interface DataSource { id: string; name: string }

export default function DataSourceForm() {
  const [sources, setSources] = useState<DataSource[]>([])
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')

  async function load() {
    setSources(await fetch('/api/databases').then(r => r.json()))
  }
  useEffect(() => { load() }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    await fetch('/api/databases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, connectionUrl: url }),
    })
    setName(''); setUrl(''); load()
  }

  async function handleDelete(id: string) {
    await fetch(`/api/databases/${id}`, { method: 'DELETE' }); load()
  }

  return (
    <section>
      <h2 className="font-semibold text-slate-700 mb-3">Data Sources</h2>
      <form onSubmit={handleAdd} className="flex gap-2 mb-4">
        <input value={name} onChange={e => setName(e.target.value)}
          placeholder="Name" required
          className="border border-slate-300 rounded px-2 py-1 text-sm w-28" />
        <input value={url} onChange={e => setUrl(e.target.value)}
          placeholder="postgresql://user:pass@host/db" required
          className="border border-slate-300 rounded px-2 py-1 text-sm flex-1" />
        <button type="submit"
          className="bg-sky-500 text-white rounded px-3 py-1 text-sm">Add</button>
      </form>
      <ul className="space-y-2">
        {sources.map(s => (
          <li key={s.id} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm">
            <span>{s.name}</span>
            <button onClick={() => handleDelete(s.id)}
              className="text-red-500 hover:text-red-700 text-xs">Remove</button>
          </li>
        ))}
      </ul>
    </section>
  )
}
