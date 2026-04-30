'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import StatusBadge from '@/components/applications/StatusBadge'

interface Applicant {
  id: string
  fullname: string
  nokp: string
  namaPerniagaan: string
  lokasiPerniagaan: string
  phoneNumber: string | null
  isActive: boolean
}

interface Application {
  id: string
  applicantId: string
  applicant: Applicant
  district: string
  entertainmentType: string
  status: string
  createdAt: string
  updatedAt: string
  documents: unknown[]
  remarks: unknown[]
}

interface GroupedData {
  groupName: string
  ownerName: string
  nokp?: string
  location?: string
  phoneNumber?: string | null
  applications: Application[]
  statusCounts: Record<string, number>
}

const STATUSES = ['DALAM_PROSES', 'DISOKONG', 'TIDAK_DISOKONG', 'TANGGUH', 'KIV', 'TIADA_KEPUTUSAN', 'TIDAK_DITERUSKAN']
const TYPES = ['pool_table', 'billiard', 'snooker', 'live_band', 'karaoke', 'video_games', 'cinema']

export default function GroupedReportClient() {
  const [data, setData] = useState<GroupedData[]>([])
  const [groupBy, setGroupBy] = useState<'business' | 'owner'>('business')
  const [status, setStatus] = useState('')
  const [type, setType] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(true)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  useEffect(() => {
    const params = new URLSearchParams()
    params.set('groupBy', groupBy)
    if (status) params.set('status', status)
    if (type) params.set('type', type)
    if (startDate) params.set('startDate', startDate)
    if (endDate) params.set('endDate', endDate)

    setLoading(true)
    fetch(`/api/reports/grouped?${params}`)
      .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json() })
      .then(result => {
        setData(result)
        setLoading(false)
      })
      .catch(() => {
        setData([])
        setLoading(false)
      })
  }, [groupBy, status, type, startDate, endDate])

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(groupName)) {
        next.delete(groupName)
      } else {
        next.add(groupName)
      }
      return next
    })
  }

  const totalApplications = data.reduce((sum, g) => sum + g.applications.length, 0)
  const totalBusinesses = data.length

  const exportToCSV = () => {
    const headers = [
      'Business Name',
      'Owner Name',
      'No KP',
      'Location',
      'Phone',
      'Application ID',
      'District',
      'Entertainment Type',
      'Status',
      'Created At'
    ]
    
    const rows: string[][] = []
    data.forEach(group => {
      group.applications.forEach(app => {
        rows.push([
          group.groupName,
          group.ownerName,
          group.nokp || '',
          group.location || '',
          group.phoneNumber || '',
          app.id,
          app.district,
          app.entertainmentType,
          app.status,
          new Date(app.createdAt).toISOString()
        ])
      })
    })

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `grouped-report-${groupBy}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      {/* Controls */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          {/* Group By Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">Kumpulan:</span>
            <button
              onClick={() => setGroupBy('business')}
              className={`px-3 py-1.5 rounded text-sm font-medium ${
                groupBy === 'business'
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Nama Perniagaan
            </button>
            <button
              onClick={() => setGroupBy('owner')}
              className={`px-3 py-1.5 rounded text-sm font-medium ${
                groupBy === 'owner'
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Nama Pemilik
            </button>
          </div>

          {/* Status Filter */}
          <select
            value={status}
            onChange={e => setStatus(e.target.value)}
            className="border border-slate-300 rounded px-2 py-1.5 text-sm bg-white text-slate-900"
          >
            <option value="">Semua Status</option>
            {STATUSES.map(s => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
          </select>

          {/* Type Filter */}
          <select
            value={type}
            onChange={e => setType(e.target.value)}
            className="border border-slate-300 rounded px-2 py-1.5 text-sm bg-white text-slate-900"
          >
            <option value="">Semua Jenis</option>
            {TYPES.map(t => (
              <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
            ))}
          </select>

          {/* Date Range */}
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="border border-slate-300 rounded px-2 py-1.5 text-sm bg-white text-slate-900"
            placeholder="Dari"
          />
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="border border-slate-300 rounded px-2 py-1.5 text-sm bg-white text-slate-900"
            placeholder="Hingga"
          />

          {/* Export Button */}
          <button
            onClick={exportToCSV}
            disabled={data.length === 0}
            className="ml-auto bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded text-sm"
          >
            📥 Export CSV
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-sm text-slate-500">Jumlah Perniagaan</div>
          <div className="text-2xl font-bold text-slate-800">{totalBusinesses}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-sm text-slate-500">Jumlah Permohonan</div>
          <div className="text-2xl font-bold text-slate-800">{totalApplications}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-sm text-slate-500">Purata per Perniagaan</div>
          <div className="text-2xl font-bold text-slate-800">
            {totalBusinesses > 0 ? (totalApplications / totalBusinesses).toFixed(1) : '0'}
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <p className="text-slate-400 text-sm py-8 text-center">Memuatkan laporan…</p>
      )}

      {/* Empty State */}
      {!loading && data.length === 0 && (
        <p className="text-slate-400 text-sm py-8 text-center">Tiada data ditemui.</p>
      )}

      {/* Grouped Report */}
      {!loading && data.length > 0 && (
        <div className="space-y-4">
          {data.map((group, index) => {
            const isExpanded = expandedGroups.has(group.groupName)
            const groupKey = `${group.groupName}-${index}`

            return (
              <div
                key={groupKey}
                className="bg-white border border-slate-200 rounded-lg overflow-hidden"
              >
                {/* Group Header */}
                <div
                  onClick={() => toggleGroup(group.groupName)}
                  className="flex items-center gap-4 p-4 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <button className="text-slate-400 hover:text-slate-600">
                    {isExpanded ? '▼' : '▶'}
                  </button>
                  <div className="flex-1">
                    <div className="font-semibold text-slate-800 text-lg">
                      {groupBy === 'business' ? group.groupName : group.ownerName}
                    </div>
                    <div className="text-sm text-slate-500">
                      {groupBy === 'business' ? (
                        <span>{group.ownerName} • {group.nokp}</span>
                      ) : (
                        <span>{group.groupName} • {group.nokp}</span>
                      )}
                      {group.location && ` • ${group.location}`}
                      {group.phoneNumber && ` • ${group.phoneNumber}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {/* Status Pills */}
                    <div className="flex items-center gap-1">
                      {Object.entries(group.statusCounts).map(([status, count]) => (
                        <span
                          key={status}
                          className="px-2 py-0.5 bg-slate-200 text-slate-700 text-xs rounded"
                          title={status.replace(/_/g, ' ')}
                        >
                          {count}
                        </span>
                      ))}
                    </div>
                    <div className="text-sm font-medium text-slate-600">
                      {group.applications.length} permohonan
                    </div>
                  </div>
                </div>

                {/* Applications Table (Expanded) */}
                {isExpanded && (
                  <div className="border-t border-slate-200">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr className="text-left text-xs text-slate-500 uppercase tracking-wide">
                          <th className="py-2 px-4">Jenis Hiburan</th>
                          <th className="py-2 px-4">Daerah</th>
                          <th className="py-2 px-4">Status</th>
                          <th className="py-2 px-4">Tarikh</th>
                          <th className="py-2 px-4">Tindakan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.applications.map((app, idx) => (
                          <tr
                            key={app.id}
                            className={`border-b border-slate-100 hover:bg-slate-50 ${
                              idx === group.applications.length - 1 ? 'border-b-0' : ''
                            }`}
                          >
                            <td className="py-2.5 px-4 text-slate-600">
                              {app.entertainmentType.replace(/_/g, ' ')}
                            </td>
                            <td className="py-2.5 px-4 text-slate-600">{app.district}</td>
                            <td className="py-2.5 px-4">
                              <StatusBadge status={app.status} />
                            </td>
                            <td className="py-2.5 px-4 text-slate-400 text-xs">
                              {new Date(app.createdAt).toLocaleDateString('ms-MY', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </td>
                            <td className="py-2.5 px-4">
                              <Link
                                href={`/applications/${app.id}`}
                                className="text-sky-600 hover:text-sky-800 text-xs"
                              >
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
          })}
        </div>
      )}
    </div>
  )
}
