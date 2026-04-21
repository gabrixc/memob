'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Applicant {
  id: string; fullname: string; nokp: string
  namaPerniagaan: string; lokasiPerniagaan: string
  phoneNumber: string | null; isActive: boolean; createdAt: string
}

export default function ApplicantsClient() {
  const [applicants, setApplicants] = useState<Applicant[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const params = query ? `?q=${encodeURIComponent(query)}` : ''
    setLoading(true)
    fetch(`/api/applicants${params}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { setApplicants(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [query])

  return (
    <div>
      <div className="mb-4">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Cari nama, NoKP atau perniagaan…"
          className="w-72 border border-slate-300 rounded px-3 py-1.5 text-sm"
        />
      </div>
      {loading ? (
        <p className="text-slate-400 text-sm py-8 text-center">Memuatkan…</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs text-slate-500 uppercase tracking-wide">
              <th className="py-2 pr-4">Perniagaan</th>
              <th className="py-2 pr-4">Pemilik</th>
              <th className="py-2 pr-4">NoKP</th>
              <th className="py-2 pr-4">Telefon</th>
              <th className="py-2 pr-4">Aktif</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {applicants.map(a => (
              <tr key={a.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-2.5 pr-4 font-medium text-slate-800">{a.namaPerniagaan}</td>
                <td className="py-2.5 pr-4">{a.fullname}</td>
                <td className="py-2.5 pr-4 font-mono text-xs">{a.nokp}</td>
                <td className="py-2.5 pr-4 text-slate-500">{a.phoneNumber ?? '—'}</td>
                <td className="py-2.5 pr-4">
                  <span className={`text-xs font-medium ${a.isActive ? 'text-green-600' : 'text-slate-400'}`}>
                    {a.isActive ? 'Aktif' : 'Tidak Aktif'}
                  </span>
                </td>
                <td className="py-2.5">
                  <Link href={`/applicants/${a.id}/edit`}
                    className="text-sky-600 hover:text-sky-800 text-xs">Edit</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
