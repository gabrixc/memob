'use client'
import { useState } from 'react'

type Status = 'idle' | 'sending' | 'sent' | 'not_configured' | 'error'

interface Props {
  templateId: string
  sourceId: string
  table: string
  recordIndex: number
  onClose: () => void
}

export default function EmailPanel({ templateId, sourceId, table, recordIndex, onClose }: Props) {
  const [toEmail, setToEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!toEmail.trim()) return
    setStatus('sending')
    try {
      const res = await fetch('/api/merge/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId, sourceId, table, recordIndex, toEmail }),
      })
      const data = await res.json()
      if (data.status === 'stub') setStatus('not_configured')
      else if (res.ok) setStatus('sent')
      else setStatus('error')
    } catch {
      setStatus('error')
    }
  }

  const statusMsg: Record<Status, string | null> = {
    idle: null,
    sending: 'Sending…',
    sent: `Sent to ${toEmail}`,
    not_configured: 'Email sending is not yet configured. Contact your admin.',
    error: 'Failed to send. Please try again.',
  }

  return (
    <div className="fixed bottom-6 right-6 bg-white rounded-xl shadow-2xl border border-slate-200 w-80 z-50 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-700">Send memo by email</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg leading-none">×</button>
      </div>

      <form onSubmit={handleSend} className="flex flex-col gap-3">
        <input
          type="email"
          placeholder="recipient@example.com"
          value={toEmail}
          onChange={e => setToEmail(e.target.value)}
          required
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
        />
        <button
          type="submit"
          disabled={status === 'sending'}
          className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium"
        >
          {status === 'sending' ? 'Sending…' : 'Send PDF'}
        </button>
      </form>

      {statusMsg[status] && (
        <p className={`mt-3 text-xs ${
          status === 'sent' ? 'text-emerald-600' :
          status === 'error' || status === 'not_configured' ? 'text-amber-600' :
          'text-slate-400'
        }`}>
          {statusMsg[status]}
        </p>
      )}
    </div>
  )
}
