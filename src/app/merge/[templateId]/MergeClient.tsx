'use client'
import { useState, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import { Canvas as FabricCanvas } from 'fabric'
import { substitutePlaceholders } from '@/lib/canvas/placeholders'
import MergeActionBar from './MergeActionBar'
import EmailPanel from './EmailPanel'

const PreviewCanvas = dynamic(() => import('@/app/preview/[templateId]/PreviewCanvas'), { ssr: false })

interface Props {
  rawPages: Record<string, unknown>[]
  records: Record<string, string>[]
  staticRecord?: Record<string, string>
  templateId: string
  templateName: string
  sourceId: string
  table?: string
  groupedMode?: boolean
  groupByField?: string
}

type FabricInstance = { getObjects: () => { data?: { type?: string }; top?: number; y1?: number }[] }

export default function MergeClient({ rawPages, records, staticRecord, templateId, templateName, sourceId, table, groupedMode = false, groupByField = 'nama_perniagaan' }: Props) {
  const [groupIndex, setGroupIndex] = useState(0)
  const [recordIndex, setRecordIndex] = useState(0)
  const [showEmail, setShowEmail] = useState(false)
  const [isPrintingAll, setIsPrintingAll] = useState(false)
  const [printProgress, setPrintProgress] = useState('')
  const batchContainerRef = useRef<HTMLDivElement | null>(null)

  // Group records by field (e.g., nama_perniagaan)
  const groupedRecords = groupedMode && groupByField ? (() => {
    const groups = new Map<string, Record<string, string>[]>()
    records.forEach(rec => {
      const key = rec[groupByField] || 'Unknown'
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(rec)
    })
    return Array.from(groups.entries()).map(([groupName, recs]) => ({
      groupName,
      records: recs,
      // Number the records for pivoted-style placeholders
      numberedRecords: recs.map((rec, i) => {
        const numbered: Record<string, string> = { ...rec }
        Object.keys(rec).forEach(key => {
          numbered[`${key}_${i + 1}`] = rec[key]
        })
        numbered.total_records = recs.length.toString()
        numbered[groupByField] = groupName
        return numbered
      })
    }))
  })() : null

  const totalGroups = groupedRecords?.length ?? records.length
  const currentGroup = groupedMode && groupedRecords ? groupedRecords[groupIndex] : null
  const currentRecord = currentGroup?.numberedRecords[0] ?? (records[recordIndex] ?? {})
  
  // Static record from secondary blocks; primary record takes precedence on conflicts
  const merged = staticRecord ? { ...staticRecord, ...currentRecord } : currentRecord
  const mergedPages = rawPages.map(p => substitutePlaceholders(p, merged))

  // ── Print current record ────────────────────────────────────────────────────
  const handlePrintCurrent = useCallback(() => {
    const lowerCanvases = Array.from(
      document.querySelectorAll('canvas.lower-canvas') as NodeListOf<HTMLCanvasElement>
    )
    if (lowerCanvases.length === 0) { alert('Canvas not ready — please wait a moment and try again.'); return }

    const win2 = window as unknown as Record<string, unknown>
    const fabrics = (win2.__previewFabrics as (FabricInstance | undefined)[] | undefined) ?? []

    const dataUrls = lowerCanvases.map((lower, idx) => {
      if (lowerCanvases.length === 1) {
        const fabric = fabrics[0]
        if (fabric) {
          const breaks = fabric.getObjects().filter(o => o.data?.type === 'pagebreak')
          if (breaks.length > 0) {
            const minY = Math.min(...breaks.map(o => o.y1 ?? (o.top ?? lower.height)))
            const cropH = Math.round(minY)
            const crop = document.createElement('canvas')
            crop.width = lower.width; crop.height = cropH
            crop.getContext('2d')!.drawImage(lower, 0, 0, lower.width, cropH, 0, 0, lower.width, cropH)
            return crop.toDataURL('image/png')
          }
        }
      }
      void idx
      return lower.toDataURL('image/png')
    })

    openPrintPopup(dataUrls)
  }, [])

  // ── Print all records ───────────────────────────────────────────────────────
  const handlePrintAll = useCallback(async () => {
    setIsPrintingAll(true)
    setPrintProgress(`0 / ${totalGroups}`)

    // Hidden off-screen container for batch canvas rendering
    const container = document.createElement('div')
    container.style.cssText = 'position:absolute;left:-9999px;top:-9999px;visibility:hidden;'
    document.body.appendChild(container)
    batchContainerRef.current = container

    const allDataUrls: string[] = []

    try {
      if (groupedMode && groupedRecords) {
        // Grouped mode: one page per group (business)
        for (let i = 0; i < groupedRecords.length; i++) {
          const group = groupedRecords[i]
          // Use first numbered record which has all fields numbered
          const record = group.numberedRecords[0]
          const mergedRec = staticRecord ? { ...staticRecord, ...record } : record
          const mergedForGroup = rawPages.map(p => substitutePlaceholders(p, mergedRec))

          for (const pageJson of mergedForGroup) {
            const dataUrl = await renderPageToDataUrl(pageJson, container)
            allDataUrls.push(dataUrl)
          }

          setPrintProgress(`${i + 1} / ${groupedRecords.length}`)
        }
      } else {
        // Normal mode: one page per record
        for (let i = 0; i < records.length; i++) {
          const record = records[i]
          const mergedRec = staticRecord ? { ...staticRecord, ...record } : record
          const mergedForRecord = rawPages.map(p => substitutePlaceholders(p, mergedRec))

          for (const pageJson of mergedForRecord) {
            const dataUrl = await renderPageToDataUrl(pageJson, container)
            allDataUrls.push(dataUrl)
          }

          setPrintProgress(`${i + 1} / ${records.length}`)
        }
      }
    } finally {
      document.body.removeChild(container)
      batchContainerRef.current = null
    }

    setIsPrintingAll(false)
    setPrintProgress('')

    if (allDataUrls.length > 0) openPrintPopup(allDataUrls)
  }, [records, rawPages, groupedMode, groupedRecords, totalGroups, staticRecord])

  return (
    <>
      <MergeActionBar
        templateName={templateName}
        recordIndex={groupedMode ? groupIndex : recordIndex}
        total={totalGroups}
        onPrev={() => groupedMode ? setGroupIndex(i => Math.max(0, i - 1)) : setRecordIndex(i => Math.max(0, i - 1))}
        onNext={() => groupedMode ? setGroupIndex(i => Math.min(totalGroups - 1, i + 1)) : setRecordIndex(i => Math.min(records.length - 1, i + 1))}
        onPrintCurrent={handlePrintCurrent}
        onPrintAll={handlePrintAll}
        onToggleEmail={() => setShowEmail(v => !v)}
        isPrintingAll={isPrintingAll}
      />

      {/* Print-all progress overlay */}
      {isPrintingAll && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl shadow-2xl px-8 py-6 text-center min-w-64">
            <div className="text-2xl mb-3">⏳</div>
            <p className="text-sm font-semibold text-slate-700 mb-1">Generating all memos…</p>
            <p className="text-xs text-slate-500">Record {printProgress}</p>
          </div>
        </div>
      )}

      {/* Canvas pages */}
      <div style={{ paddingTop: 64, paddingBottom: 40, paddingLeft: 24, paddingRight: 24 }}>
        {records.length === 0 ? (
          <div className="text-center text-white/70 py-20 text-sm">No records found in this table.</div>
        ) : (
          mergedPages.map((pageJson, i) => (
            <div
              key={`${recordIndex}-${i}`}
              style={{
                width: 794,
                margin: '0 auto 32px',
                background: '#fff',
                boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
              }}
            >
              <PreviewCanvas
                key={`${recordIndex}-${i}`}
                canvasJson={pageJson}
              />
            </div>
          ))
        )}
      </div>

      {showEmail && (
        <EmailPanel
          templateId={templateId}
          sourceId={sourceId}
          table={table ?? ''}
          recordIndex={recordIndex}
          onClose={() => setShowEmail(false)}
        />
      )}
    </>
  )
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function renderPageToDataUrl(canvasJson: object, container: HTMLDivElement): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvasEl = document.createElement('canvas')
    container.appendChild(canvasEl)

    const canvas = new FabricCanvas(canvasEl, {
      width: 794, height: 1123, backgroundColor: '#ffffff',
      selection: false,
    })

    canvas.loadFromJSON(canvasJson).then(() => {
      canvas.renderAll()
      const lower = container.querySelector('canvas.lower-canvas') as HTMLCanvasElement | null
      const dataUrl = lower ? lower.toDataURL('image/png') : canvas.toDataURL({ format: 'png', multiplier: 1 })
      canvas.dispose()
      canvasEl.remove()
      resolve(dataUrl)
    }).catch(err => {
      canvas.dispose()
      canvasEl.remove()
      reject(err)
    })
  })
}

function openPrintPopup(dataUrls: string[]) {
  const win2 = window.open('', '_blank', 'width=900,height=1000')
  if (!win2) { alert('Please allow popups for this site to print.'); return }

  const doc = win2.document
  doc.title = 'Print'

  const style = doc.createElement('style')
  style.textContent = `
    @page { size: A4 portrait; margin: 0; }
    html, body { margin: 0; padding: 0; background: #fff; }
    img.pg {
      display: block;
      width: 210mm;
      height: 295mm;
      margin: 0;
      padding: 0;
      border: 0;
      page-break-after: always;
      break-after: page;
    }
    img.pg:last-of-type {
      page-break-after: auto;
      break-after: auto;
    }
  `
  doc.head.appendChild(style)

  dataUrls.forEach(u => {
    const img = doc.createElement('img')
    img.className = 'pg'
    img.src = u
    doc.body.appendChild(img)
  })

  const imgs = Array.from(doc.querySelectorAll('img') as NodeListOf<HTMLImageElement>)
  let loaded = 0

  function tryPrint() {
    loaded++
    if (loaded < imgs.length) return
    requestAnimationFrame(() => requestAnimationFrame(() => {
      win2!.focus()
      win2!.print()
      setTimeout(() => win2!.close(), 500)
    }))
  }

  imgs.forEach(img => {
    if (img.complete) tryPrint()
    else img.onload = tryPrint
  })
}
