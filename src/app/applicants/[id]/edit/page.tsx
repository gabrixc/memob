import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import EditApplicantClient from './EditApplicantClient'

export const metadata = { title: 'Kemaskini Pemohon — Memo Builder' }

export default async function EditApplicantPage({ params }: { params: { id: string } }) {
  if (!await auth()) redirect('/login')
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Kemaskini Pemohon</h1>
          <Link href="/applicants" className="text-sm text-sky-600 hover:text-sky-700 font-medium">← Senarai Pemohon</Link>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <EditApplicantClient id={params.id} />
        </div>
      </div>
    </div>
  )
}
