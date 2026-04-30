import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ApplicantsClient from './ApplicantsClient'

export const metadata = { title: 'Pemohon — Memo Builder' }

export default async function ApplicantsPage() {
  if (!await auth()) redirect('/login')
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Senarai Pemohon</h1>
            <p className="text-sm text-slate-500 mt-0.5">Rekod perniagaan yang berdaftar</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/applications" className="text-sm text-slate-500 hover:text-slate-700">Permohonan</Link>
            <Link href="/reports" className="text-sm text-slate-500 hover:text-slate-700">Laporan</Link>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <ApplicantsClient />
        </div>
      </div>
    </div>
  )
}
