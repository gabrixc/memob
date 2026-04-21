'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Applicant {
  id: string; fullname: string; nokp: string
  namaPerniagaan: string; lokasiPerniagaan: string; isActive: boolean
}

interface Document { name: string; type: string; submitted_at: string }

const TYPES = ['pool_table','billiard','snooker','live_band','karaoke','video_games','cinema']

export default function NewApplicationClient() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2>(1)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Applicant[]>([])
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)
  const [selected, setSelected] = useState<Applicant | null>(null)

  // Step 2 fields
  const [district, setDistrict] = useState('')
  const [entertainmentType, setEntertainmentType] = useState('')
  const [documents, setDocuments] = useState<Document[]>([])
  const [docName, setDocName] = useState('')
  const [docType, setDocType] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSearch() {
    if (!query.trim()) return
    setSearching(true)
    const data = await fetch(`/api/applicants?q=${encodeURIComponent(query)}`).then(r => r.json())
    setResults(data)
    setSearching(false)
    setSearched(true)
  }

  function selectApplicant(a: Applicant) {
    setSelected(a)
    setStep(2)
  }

  function addDocument() {
    if (!docName.trim() || !docType.trim()) return
    const today = new Date().toISOString().split('T')[0]
    setDocuments(prev => [...prev, { name: docName.trim(), type: docType.trim(), submitted_at: today }])
    setDocName(''); setDocType('')
  }

  function removeDocument(i: number) {
    setDocuments(prev => prev.filter((_, idx) => idx !== i))
  }

  async function handleSubmit() {
    setError('')
    if (!selected || !district.trim() || !entertainmentType) {
      setError('Sila lengkapkan semua maklumat.')
      return
    }
    setSaving(true)
    const res = await fetch('/api/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicantId: selected.id, district, entertainmentType, documents }),
    })
    if (!res.ok) {
      const d = await res.json()
      setError(d.error ?? 'Gagal menyimpan.')
      setSaving(false)
      return
    }
    const app = await res.json()
    router.push(`/applications/${app.id}`)
  }

  if (step === 1) return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-700">Langkah 1: Cari Pemohon</h2>
      <div className="flex gap-2">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="Cari nama perniagaan, nama atau NoKP…"
          className="flex-1 border border-slate-300 rounded px-3 py-2 text-sm"
        />
        <button onClick={handleSearch} disabled={searching}
          className="bg-sky-600 text-white px-4 py-2 rounded text-sm hover:bg-sky-700 disabled:opacity-50">
          {searching ? 'Mencari…' : 'Cari'}
        </button>
      </div>
      {results.length > 0 && (
        <table className="w-full text-sm border border-slate-200 rounded">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left px-3 py-2 text-xs text-slate-500">Perniagaan</th>
              <th className="text-left px-3 py-2 text-xs text-slate-500">Pemilik</th>
              <th className="text-left px-3 py-2 text-xs text-slate-500">NoKP</th>
              <th className="text-left px-3 py-2 text-xs text-slate-500">Lokasi</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {results.map(a => (
              <tr key={a.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-3 py-2 font-medium">{a.namaPerniagaan}</td>
                <td className="px-3 py-2">{a.fullname}</td>
                <td className="px-3 py-2 font-mono text-xs">{a.nokp}</td>
                <td className="px-3 py-2 text-slate-400 text-xs">{a.lokasiPerniagaan}</td>
                <td className="px-3 py-2">
                  <button onClick={() => selectApplicant(a)}
                    className="text-sky-600 hover:text-sky-800 text-xs font-medium">
                    Pilih →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {searched && results.length === 0 && !searching && (
        <p className="text-slate-400 text-sm">Tiada rekod ditemui.</p>
      )}
    </div>
  )

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-slate-700">Langkah 2: Butiran Permohonan</h2>

      {/* Selected applicant card */}
      <div className="bg-slate-50 border border-slate-200 rounded p-4 text-sm">
        <div className="font-semibold text-slate-800">{selected!.namaPerniagaan}</div>
        <div className="text-slate-500">{selected!.fullname} · {selected!.nokp}</div>
        <div className="text-slate-400 text-xs mt-0.5">{selected!.lokasiPerniagaan}</div>
        <button onClick={() => { setSelected(null); setStep(1) }}
          className="text-xs text-sky-600 hover:underline mt-2">← Tukar pemohon</button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Daerah / Majlis</label>
          <input value={district} onChange={e => setDistrict(e.target.value)}
            placeholder="cth. Majlis Perbandaran Batu Pahat"
            className="w-full border border-slate-300 rounded px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Jenis Hiburan</label>
          <select value={entertainmentType} onChange={e => setEntertainmentType(e.target.value)}
            className="w-full border border-slate-300 rounded px-3 py-2 text-sm bg-white">
            <option value="">-- Pilih jenis --</option>
            {TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
      </div>

      {/* Documents */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-2">Dokumen Sokongan</label>
        {documents.length > 0 && (
          <ul className="mb-2 space-y-1">
            {documents.map((d, i) => (
              <li key={i} className="flex items-center justify-between text-sm bg-slate-50 border border-slate-200 rounded px-3 py-1.5">
                <span>{d.name} <span className="text-slate-400 text-xs">({d.type})</span></span>
                <button onClick={() => removeDocument(i)} className="text-red-400 hover:text-red-600 text-xs">Buang</button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-2">
          <input value={docName} onChange={e => setDocName(e.target.value)}
            placeholder="Nama dokumen"
            className="flex-1 border border-slate-300 rounded px-2 py-1.5 text-sm" />
          <input value={docType} onChange={e => setDocType(e.target.value)}
            placeholder="Jenis"
            className="w-32 border border-slate-300 rounded px-2 py-1.5 text-sm" />
          <button onClick={addDocument}
            className="border border-slate-300 rounded px-3 py-1.5 text-sm hover:bg-slate-50">+ Tambah</button>
        </div>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="flex justify-end gap-3">
        <button onClick={() => setStep(1)}
          className="border border-slate-300 rounded px-4 py-2 text-sm hover:bg-slate-50">Kembali</button>
        <button onClick={handleSubmit} disabled={saving}
          className="bg-sky-600 text-white rounded px-4 py-2 text-sm hover:bg-sky-700 disabled:opacity-50">
          {saving ? 'Menyimpan…' : 'Simpan Permohonan'}
        </button>
      </div>
    </div>
  )
}
