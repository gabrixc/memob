'use client'
import { useEffect, useState } from 'react'
import StatusBadge from '@/components/applications/StatusBadge'

interface Applicant {
  id: string; fullname: string; nokp: string
  namaPerniagaan: string; lokasiPerniagaan: string; phoneNumber: string | null
}
interface Document { name: string; type: string; submitted_at: string }
interface RemarkEvent { event: string; [key: string]: string }
interface Application {
  id: string; district: string; entertainmentType: string; status: string
  applicant: Applicant; documents: Document[]; remarks: RemarkEvent[]
  createdAt: string; updatedAt: string
}

const STAGES = [
  { key: 'district_received', label: 'Surat Diterima dari Daerah',
    fields: [
      { name: 'date', label: 'Tarikh Surat', type: 'date' },
      { name: 'reference_no', label: 'No. Rujukan Surat', type: 'text' },
      { name: 'letter_title', label: 'Tajuk Surat', type: 'text' },
    ]},
  { key: 'jkkd_meeting', label: 'Mesyuarat JKKD (Daerah)',
    fields: [
      { name: 'date', label: 'Tarikh Mesyuarat', type: 'date' },
      { name: 'decision', label: 'Keputusan', type: 'select', options: ['DISOKONG','TIDAK_DISOKONG','KIV'] },
      { name: 'notes', label: 'Catatan', type: 'textarea' },
    ]},
  { key: 'nsc_file_opened', label: 'Fail Dibuka NSC Johor',
    fields: [
      { name: 'date', label: 'Tarikh Fail Dibuka', type: 'date' },
      { name: 'internal_ref', label: 'No. Rujukan NSC', type: 'text' },
    ]},
  { key: 'site_visit', label: 'Lawatan Tapak',
    fields: [
      { name: 'date', label: 'Tarikh Lawatan', type: 'date' },
      { name: 'notes', label: 'Pemerhatian / Catatan', type: 'textarea' },
    ]},
  { key: 'jkkn_meeting', label: 'Mesyuarat JKKN (Negeri)',
    fields: [
      { name: 'date', label: 'Tarikh Mesyuarat', type: 'date' },
      { name: 'decision', label: 'Keputusan', type: 'select', options: ['DISOKONG','TIDAK_DISOKONG','TANGGUH','KIV','TIADA_KEPUTUSAN','TIDAK_DITERUSKAN'] },
      { name: 'remarks', label: 'Ulasan / Endorsemen', type: 'textarea' },
    ]},
]

function StageCard({
  stage, event, onSave,
}: {
  stage: typeof STAGES[0]
  event: RemarkEvent | undefined
  onSave: (key: string, data: RemarkEvent) => void
}) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<RemarkEvent>({ event: stage.key, ...(event ?? {}) })

  function handleSave() {
    onSave(stage.key, form)
    setEditing(false)
  }

  const isFilled = !!event?.date

  return (
    <div className={`border rounded-lg p-4 ${isFilled ? 'border-green-200 bg-green-50' : 'border-slate-200 bg-white'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isFilled ? 'bg-green-500' : 'bg-slate-300'}`} />
          <span className="font-medium text-sm text-slate-700">{stage.label}</span>
        </div>
        <button onClick={() => setEditing(e => !e)}
          className="text-xs text-sky-600 hover:text-sky-800">
          {editing ? 'Tutup' : isFilled ? 'Kemaskini' : 'Isi'}
        </button>
      </div>

      {!editing && isFilled && (
        <div className="text-xs text-slate-600 space-y-0.5">
          {stage.fields.map(f => event[f.name] ? (
            <div key={f.name}><span className="text-slate-400">{f.label}: </span>{event[f.name]}</div>
          ) : null)}
        </div>
      )}

      {!editing && !isFilled && (
        <p className="text-xs text-slate-400 italic">Belum diisi</p>
      )}

      {editing && (
        <div className="space-y-2 mt-2">
          {stage.fields.map(f => (
            <div key={f.name}>
              <label className="block text-xs font-medium text-slate-500 mb-0.5">{f.label}</label>
              {f.type === 'textarea' ? (
                <textarea value={form[f.name] ?? ''} rows={3}
                  onChange={e => setForm(prev => ({ ...prev, [f.name]: e.target.value }))}
                  className="w-full border border-slate-300 rounded px-2 py-1 text-xs resize-y" />
              ) : f.type === 'select' ? (
                <select value={form[f.name] ?? ''} onChange={e => setForm(prev => ({ ...prev, [f.name]: e.target.value }))}
                  className="w-full border border-slate-300 rounded px-2 py-1 text-xs bg-white">
                  <option value="">-- Pilih --</option>
                  {f.options!.map(o => <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>)}
                </select>
              ) : (
                <input type={f.type} value={form[f.name] ?? ''}
                  onChange={e => setForm(prev => ({ ...prev, [f.name]: e.target.value }))}
                  className="w-full border border-slate-300 rounded px-2 py-1 text-xs" />
              )}
            </div>
          ))}
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => setEditing(false)}
              className="text-xs border border-slate-300 rounded px-3 py-1 hover:bg-slate-50">Batal</button>
            <button onClick={handleSave}
              className="text-xs bg-sky-600 text-white rounded px-3 py-1 hover:bg-sky-700">Simpan</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ApplicationDetailClient({ id }: { id: string }) {
  const [app, setApp] = useState<Application | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch(`/api/applications/${id}`).then(r => r.json()).then(setApp)
  }, [id])

  async function handleStageSave(stageKey: string, data: RemarkEvent) {
    if (!app) return
    setSaving(true)
    const updated = app.remarks.filter(r => r.event !== stageKey)
    updated.push(data)

    const newStatus = stageKey === 'jkkn_meeting' && data.decision
      ? data.decision : app.status

    const res = await fetch(`/api/applications/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ remarks: updated, status: newStatus }),
    })
    if (res.ok) {
      const saved = await res.json()
      setApp(saved)
    }
    setSaving(false)
  }

  if (!app) return <p className="text-slate-400 text-sm py-8 text-center">Memuatkan…</p>

  const eventMap = Object.fromEntries(app.remarks.map(r => [r.event, r]))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">{app.applicant.namaPerniagaan}</h2>
          <p className="text-sm text-slate-500">{app.applicant.fullname} · {app.applicant.nokp}</p>
          <p className="text-xs text-slate-400 mt-0.5">{app.applicant.lokasiPerniagaan}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-sm text-slate-600">{app.entertainmentType.replace(/_/g, ' ')}</span>
            <span className="text-slate-300">·</span>
            <span className="text-sm text-slate-600">{app.district}</span>
          </div>
        </div>
        <div className="text-right">
          <StatusBadge status={app.status} />
          {saving && <p className="text-xs text-slate-400 mt-1">Menyimpan…</p>}
        </div>
      </div>

      {/* Documents */}
      {app.documents.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Dokumen Sokongan</h3>
          <ul className="space-y-1">
            {app.documents.map((d, i) => (
              <li key={i} className="text-sm text-slate-600">
                {d.name} <span className="text-slate-400 text-xs">({d.type}) — {d.submitted_at}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Timeline */}
      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Garis Masa Proses</h3>
        <div className="space-y-3">
          {STAGES.map(stage => (
            <StageCard
              key={stage.key}
              stage={stage}
              event={eventMap[stage.key]}
              onSave={handleStageSave}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
