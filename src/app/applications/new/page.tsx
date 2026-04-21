import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import NewApplicationClient from './NewApplicationClient'

export const metadata = { title: 'Permohonan Baharu — Memo Builder' }

export default async function NewApplicationPage() {
  if (!await auth()) redirect('/login')
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Permohonan Baharu</h1>
            <p className="text-sm text-slate-500 mt-0.5">Daftar permohonan lesen hiburan</p>
          </div>
          <Link href="/applications" className="text-sm text-sky-600 hover:text-sky-700 font-medium">← Senarai</Link>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <NewApplicationClient />
        </div>
      </div>
    </div>
  )
}
