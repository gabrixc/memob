'use client'
import { useState } from 'react'

export default function SettingsDocsModal() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        title="Open Settings Manual"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 font-medium border border-slate-300 bg-white hover:bg-slate-50 rounded-lg px-3 py-1.5 transition-colors"
      >
        <span className="text-base leading-none">?</span>
        Help
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Modal */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Settings Manual"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div className="relative bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col">

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Settings Manual</h2>
                <p className="text-xs text-slate-400 mt-0.5">How to use Data Sources &amp; Webhook Configuration</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close manual"
                className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto px-6 py-5 space-y-8 text-sm text-slate-700">

              {/* Overview */}
              <section>
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-sky-100 text-sky-600 text-xs font-bold">i</span>
                  <h3 className="font-semibold text-slate-900 text-base">Overview</h3>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  The Settings page is the central configuration hub for Memo Builder. It lets you connect external PostgreSQL databases as field data providers and configure webhook integrations for event-driven workflows.
                </p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <div className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs">
                    <span className="font-medium text-slate-500">URL</span>
                    <code className="text-sky-600 font-mono">/settings</code>
                  </div>
                  <div className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs">
                    <span className="font-medium text-slate-500">Access</span>
                    <span className="text-slate-600">Authenticated users only</span>
                  </div>
                </div>
              </section>

              <hr className="border-slate-100" />

              {/* Data Sources */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 text-xs font-bold">1</span>
                  <h3 className="font-semibold text-slate-900 text-base">Data Sources</h3>
                </div>
                <p className="text-slate-600 mb-4 leading-relaxed">
                  Connect one or more PostgreSQL databases so that template fields can be populated dynamically from real data.
                </p>

                <div className="space-y-4">
                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">How to add a data source</h4>
                    <ol className="space-y-2 text-slate-600">
                      <li className="flex gap-2">
                        <span className="shrink-0 w-5 h-5 rounded-full bg-white border border-slate-300 text-slate-500 text-xs font-semibold flex items-center justify-center mt-0.5">1</span>
                        <span>Navigate to <strong className="text-slate-800">Settings</strong> from the editor top bar.</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="shrink-0 w-5 h-5 rounded-full bg-white border border-slate-300 text-slate-500 text-xs font-semibold flex items-center justify-center mt-0.5">2</span>
                        <span>Fill in the <strong className="text-slate-800">Alias</strong> (e.g. <code className="bg-white border border-slate-200 rounded px-1 font-mono text-sky-600">crm</code>) and the <strong className="text-slate-800">Connection URL</strong>:</span>
                      </li>
                    </ol>
                    <pre className="mt-3 bg-white border border-slate-200 rounded-lg px-4 py-3 text-xs font-mono text-slate-700 overflow-x-auto">
                      postgresql://user:password@host:5432/database_name
                    </pre>
                    <ol className="space-y-2 text-slate-600 mt-3" start={3}>
                      <li className="flex gap-2">
                        <span className="shrink-0 w-5 h-5 rounded-full bg-white border border-slate-300 text-slate-500 text-xs font-semibold flex items-center justify-center mt-0.5">3</span>
                        <span>Click <strong className="text-slate-800">Add</strong>. The source appears in the list immediately.</span>
                      </li>
                    </ol>
                  </div>

                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">How to remove a data source</h4>
                    <p className="text-slate-600">Click <strong className="text-red-500">Remove</strong> on any listed source. The connection is deleted immediately — template fields referencing it will need to be remapped.</p>
                  </div>

                  <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
                    <h4 className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Security note</h4>
                    <p className="text-amber-700">Connection URLs are stored server-side. Never paste connection strings into publicly shared templates.</p>
                  </div>
                </div>
              </section>

              <hr className="border-slate-100" />

              {/* Webhook Configuration */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold">2</span>
                  <h3 className="font-semibold text-slate-900 text-base">Webhook Configuration</h3>
                </div>
                <p className="text-slate-600 mb-4 leading-relaxed">
                  Webhooks let external systems trigger memo generation (<strong>Inbound</strong>) and receive completed memo payloads automatically (<strong>Outbound</strong>).
                </p>

                {/* Fields table */}
                <div className="rounded-xl border border-slate-200 overflow-hidden mb-4">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left px-4 py-2.5 font-semibold text-slate-600 w-48">Field</th>
                        <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Purpose</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr className="bg-white">
                        <td className="px-4 py-2.5 font-medium text-slate-700 align-top">Inbound Bearer Secret</td>
                        <td className="px-4 py-2.5 text-slate-600">Token your caller must send as <code className="bg-slate-100 rounded px-1 font-mono">Authorization: Bearer &lt;token&gt;</code> to <code className="bg-slate-100 rounded px-1 font-mono">POST /api/webhook/trigger</code>.</td>
                      </tr>
                      <tr className="bg-white">
                        <td className="px-4 py-2.5 font-medium text-slate-700 align-top">Outbound URL</td>
                        <td className="px-4 py-2.5 text-slate-600">The HTTPS endpoint Memo Builder will POST the completed memo JSON to after each generation.</td>
                      </tr>
                      <tr className="bg-white">
                        <td className="px-4 py-2.5 font-medium text-slate-700 align-top">Outbound Signing Secret</td>
                        <td className="px-4 py-2.5 text-slate-600">Shared secret used to sign outbound payloads via HMAC-SHA256. Included as <code className="bg-slate-100 rounded px-1 font-mono">X-MemoBuilder-Signature</code>.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="space-y-4">
                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Triggering a memo via webhook (Inbound)</h4>
                    <pre className="bg-white border border-slate-200 rounded-lg px-4 py-3 text-xs font-mono text-slate-700 overflow-x-auto leading-relaxed">{`POST /api/webhook/trigger
Authorization: Bearer <your-inbound-secret>
Content-Type: application/json

{
  "templateId": "<template-uuid>",
  "data": {
    "fieldKey": "value"
  }
}`}</pre>
                  </div>

                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Verifying outbound payloads (Node.js)</h4>
                    <pre className="bg-white border border-slate-200 rounded-lg px-4 py-3 text-xs font-mono text-slate-700 overflow-x-auto leading-relaxed">{`const crypto = require('crypto')

function verify(body, signatureHeader, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex')
  return signatureHeader === \`sha256=\${expected}\`
}`}</pre>
                  </div>
                </div>
              </section>

              <hr className="border-slate-100" />

              {/* Troubleshooting */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-500 text-xs font-bold">!</span>
                  <h3 className="font-semibold text-slate-900 text-base">Troubleshooting</h3>
                </div>
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Issue</th>
                        <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Fix</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {[
                        ['Settings page shows login screen', 'Your session expired — log in again.'],
                        ['Data source not appearing after Add', 'Check the connection URL — it must start with postgresql://.'],
                        ['Outbound webhook not firing', 'Confirm the Outbound URL is publicly reachable (not localhost). Check server logs.'],
                        ['Inbound trigger returns 401', 'Authorization header is missing or the Bearer token doesn\'t match the Inbound Bearer Secret.'],
                        ['Signature verification failing', 'Hash the raw request body bytes, not a parsed JSON object.'],
                      ].map(([issue, fix]) => (
                        <tr key={issue} className="bg-white">
                          <td className="px-4 py-2.5 text-slate-700 font-medium align-top">{issue}</td>
                          <td className="px-4 py-2.5 text-slate-600">{fix}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

            </div>

            {/* Modal footer */}
            <div className="px-6 py-3 border-t border-slate-100 flex justify-end bg-slate-50 rounded-b-2xl">
              <button
                onClick={() => setOpen(false)}
                className="bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg px-5 py-1.5 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
