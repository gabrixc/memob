const COLOURS: Record<string, string> = {
  DALAM_PROSES:      'bg-blue-100 text-blue-700',
  DISOKONG:          'bg-green-100 text-green-700',
  TIDAK_DISOKONG:    'bg-red-100 text-red-700',
  TANGGUH:           'bg-orange-100 text-orange-700',
  KIV:               'bg-yellow-100 text-yellow-700',
  TIADA_KEPUTUSAN:   'bg-gray-100 text-gray-600',
  TIDAK_DITERUSKAN:  'bg-slate-200 text-slate-500',
}

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${COLOURS[status] ?? 'bg-slate-100 text-slate-600'}`}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}
