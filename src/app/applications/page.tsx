import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ApplicationsClient from './ApplicationsClient'

export const metadata = { title: 'Permohonan Lesen — Memo Builder' }

export default async function ApplicationsPage() {
  if (!await auth()) redirect('/login')
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Permohonan Lesen Hiburan</h1>
            <p className="text-sm text-slate-500 mt-0.5">Rekod permohonan lesen hiburan dari daerah</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/applicants" className="text-sm text-slate-500 hover:text-slate-700">Pemohon</Link>
            <Link href="/" className="text-sm text-sky-600 hover:text-sky-700 font-medium">← Editor</Link>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <ApplicationsClient />
        </div>
      </div>
    </div>
  )
}
