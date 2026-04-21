'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Applicant {
  id: string; fullname: string; nokp: string
  namaPerniagaan: string; lokasiPerniagaan: string
  phoneNumber: string | null; isActive: boolean
}

export default function EditApplicantClient({ id }: { id: string }) {
  const router = useRouter()
  const [applicant, setApplicant] = useState<Applicant | null>(null)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/applicants/${id}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then((a: Applicant) => {
        setApplicant(a)
        setPhoneNumber(a.phoneNumber ?? '')
        setIsActive(a.isActive)
      })
      .catch(() => setError('Gagal memuatkan data pemohon.'))
  }, [id])

  async function handleSave() {
    setError('')
    setSaving(true)
    try {
      const res = await fetch(`/api/applicants/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phoneNumber.trim() || null, isActive }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? 'Gagal menyimpan.')
        return
      }
      router.push('/applicants')
    } catch {
      setError('Gagal menyimpan. Sila cuba semula.')
    } finally {
      setSaving(false)
    }
  }

  if (error && !applicant) return <p className="text-red-500 text-sm py-8 text-center">{error}</p>
  if (!applicant) return <p className="text-slate-400 text-sm py-8 text-center">Memuatkan…</p>

  return (
    <div className="space-y-5">
      <div className="bg-slate-50 border border-slate-200 rounded p-4 text-sm">
        <div className="font-semibold text-slate-800">{applicant.namaPerniagaan}</div>
        <div className="text-slate-500">{applicant.fullname} · {applicant.nokp}</div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">No. Telefon</label>
          <input value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)}
            placeholder="cth. 0123456789"
            className="w-64 border border-slate-300 rounded px-3 py-2 text-sm" />
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-slate-700">Status Perniagaan</label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)}
              className="w-4 h-4 accent-sky-600" />
            <span className="text-sm text-slate-600">{isActive ? 'Aktif' : 'Tidak Aktif'}</span>
          </label>
        </div>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="flex gap-3">
        <button onClick={() => router.push('/applicants')}
          className="border border-slate-300 rounded px-4 py-2 text-sm hover:bg-slate-50">Batal</button>
        <button onClick={handleSave} disabled={saving}
          className="bg-sky-600 text-white rounded px-4 py-2 text-sm hover:bg-sky-700 disabled:opacity-50">
          {saving ? 'Menyimpan…' : 'Simpan'}
        </button>
      </div>
    </div>
  )
}
