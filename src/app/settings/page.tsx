import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import DataSourceForm from '@/components/settings/DataSourceForm'
import WebhookConfigForm from '@/components/settings/WebhookConfigForm'

export default async function SettingsPage() {
  if (!await auth()) redirect('/login')
  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-2xl mx-auto p-8 space-y-10">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
          <a href="/" className="text-sky-500 text-sm hover:underline">Back to Editor</a>
        </div>
        <DataSourceForm />
        <hr className="border-slate-200" />
        <WebhookConfigForm />
      </div>
    </div>
  )
}
