import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ApplicationDetailClient from './ApplicationDetailClient'

export const metadata = { title: 'Butiran Permohonan — Memo Builder' }

export default async function ApplicationDetailPage({ params }: { params: { id: string } }) {
  if (!await auth()) redirect('/login')
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <Link href="/applications" className="text-sm text-sky-600 hover:text-sky-700 font-medium">← Senarai Permohonan</Link>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <ApplicationDetailClient id={params.id} />
        </div>
      </div>
    </div>
  )
}
