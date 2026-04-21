'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import StatusBadge from '@/components/applications/StatusBadge'

interface Applicant { id: string; namaPerniagaan: string; fullname: string }
interface Application {
  id: string; applicantId: string; applicant: Applicant
  district: string; entertainmentType: string; status: string; createdAt: string
}

const STATUSES = ['DALAM_PROSES','DISOKONG','TIDAK_DISOKONG','TANGGUH','KIV','TIADA_KEPUTUSAN','TIDAK_DITERUSKAN']
const TYPES = ['pool_table','billiard','snooker','live_band','karaoke','video_games','cinema']

export default function ApplicationsClient() {
  const [apps, setApps] = useState<Application[]>([])
  const [status, setStatus] = useState('')
  const [type, setType] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    if (type) params.set('type', type)
    setLoading(true)
    fetch(`/api/applications?${params}`)
      .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json() })
      .then(data => { setApps(data); setLoading(false) })
      .catch(() => { setApps([]); setLoading(false) })
  }, [status, type])

  return (
    <div>
      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <select value={status} onChange={e => setStatus(e.target.value)}
          className="border border-slate-300 rounded px-2 py-1.5 text-sm bg-white">
          <option value="">Semua Status</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
        <select value={type} onChange={e => setType(e.target.value)}
          className="border border-slate-300 rounded px-2 py-1.5 text-sm bg-white">
          <option value="">Semua Jenis</option>
          {TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
        </select>
        <Link href="/applications/new"
          className="ml-auto bg-sky-600 hover:bg-sky-700 text-white px-4 py-1.5 rounded text-sm">
          + Permohonan Baharu
        </Link>
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-slate-400 text-sm py-8 text-center">Memuatkan…</p>
      ) : apps.length === 0 ? (
        <p className="text-slate-400 text-sm py-8 text-center">Tiada permohonan ditemui.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500 uppercase tracking-wide">
                <th className="py-2 pr-4">Perniagaan</th>
                <th className="py-2 pr-4">Jenis Hiburan</th>
                <th className="py-2 pr-4">Daerah</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Tarikh</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {apps.map(app => (
                <tr key={app.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-2.5 pr-4">
                    <div className="font-medium text-slate-800">{app.applicant.namaPerniagaan}</div>
                    <div className="text-xs text-slate-400">{app.applicant.fullname}</div>
                  </td>
                  <td className="py-2.5 pr-4 text-slate-600">{app.entertainmentType.replace(/_/g, ' ')}</td>
                  <td className="py-2.5 pr-4 text-slate-600">{app.district}</td>
                  <td className="py-2.5 pr-4"><StatusBadge status={app.status} /></td>
                  <td className="py-2.5 pr-4 text-slate-400 text-xs">{new Date(app.createdAt).toLocaleDateString('ms-MY')}</td>
                  <td className="py-2.5">
                    <Link href={`/applications/${app.id}`}
                      className="text-sky-600 hover:text-sky-800 text-xs">
                      Butiran →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
