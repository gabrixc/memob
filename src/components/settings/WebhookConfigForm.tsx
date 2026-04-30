'use client'
import { useEffect, useState } from 'react'

interface Config { inboundSecret: string; outboundUrl: string; outboundSecret: string }

export default function WebhookConfigForm() {
  const [cfg, setCfg] = useState<Config>({ inboundSecret: '', outboundUrl: '', outboundSecret: '' })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/webhook/config').then(r => r.json()).then(d => { if (d) setCfg(d) })
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    await fetch('/api/webhook/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cfg),
    })
    setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  return (
    <section>
      <h2 className="font-semibold text-slate-700 mb-3">Webhook Configuration</h2>
      <form onSubmit={handleSave} className="space-y-3 max-w-lg">
        {[
          { label: 'Inbound Bearer Secret', key: 'inboundSecret', placeholder: 'Token for POST /api/webhook/trigger', mono: true },
          { label: 'Outbound URL', key: 'outboundUrl', placeholder: 'https://your-app.com/webhook', mono: false },
          { label: 'Outbound Signing Secret (HMAC-SHA256)', key: 'outboundSecret', placeholder: 'Shared secret for X-MemoBuilder-Signature', mono: true },
        ].map(({ label, key, placeholder, mono }) => (
          <div key={key}>
            <label className="block text-xs text-slate-500 mb-1">{label}</label>
            <input value={cfg[key as keyof Config]}
              onChange={e => setCfg(c => ({ ...c, [key]: e.target.value }))}
              placeholder={placeholder}
              className={`w-full border border-slate-300 rounded px-2 py-1 text-sm text-slate-900 placeholder:text-slate-400 ${mono ? 'font-mono' : ''}`} />
          </div>
        ))}
        <button type="submit"
          className="bg-indigo-500 text-white rounded px-4 py-1.5 text-sm">
          {saved ? 'Saved' : 'Save'}
        </button>
      </form>
    </section>
  )
}
