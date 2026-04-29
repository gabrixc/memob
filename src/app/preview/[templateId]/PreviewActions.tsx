'use client'
import type { FabricObject } from 'fabric'

type FabricInstance = { getObjects: () => FabricObject[] }

export default function PreviewActions() {
  function handlePrint() {
    const lowerCanvases = Array.from(
      document.querySelectorAll('canvas.lower-canvas') as NodeListOf<HTMLCanvasElement>
    )
    if (lowerCanvases.length === 0) { alert('Canvas not ready'); return }

    const win = window as unknown as Record<string, unknown>
    const fabrics = (win.__previewFabrics as (FabricInstance | undefined)[] | undefined) ?? []

    // Capture each canvas page as a data-URL
    const dataUrls = lowerCanvases.map((lower) => {
      // Single-page only: crop at page-break marker if present
      if (lowerCanvases.length === 1) {
        const fabric = fabrics[0]
        if (fabric) {
          const breaks = fabric.getObjects().filter(
            o => (o as FabricObject & { data?: { type?: string } }).data?.type === 'pagebreak'
          )
          if (breaks.length > 0) {
            const minY = Math.min(
              ...breaks.map(o => (o as FabricObject & { y1?: number }).y1 ?? (o.top ?? lower.height))
            )
            const cropH = Math.round(minY)
            const crop = document.createElement('canvas')
            crop.width = lower.width; crop.height = cropH
            crop.getContext('2d')!.drawImage(lower, 0, 0, lower.width, cropH, 0, 0, lower.width, cropH)
            return crop.toDataURL('image/png')
          }
        }
      }
      return lower.toDataURL('image/png')
    })

    // ── Print via a dedicated popup window ─────────────────────────────────
    // Chrome's iframe printing mishandles elements near the exact @page size
    // and inserts phantom blank pages. A real window with only our print
    // markup avoids that entirely.
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

  return (
    <div className="fixed top-3 right-3 flex gap-2 z-50">
      <button onClick={handlePrint}
        className="bg-indigo-500 text-white px-4 py-2 rounded text-sm shadow">
        Print
      </button>
      <button onClick={() => window.close()}
        className="bg-slate-500 text-white px-4 py-2 rounded text-sm shadow">
        Close
      </button>
    </div>
  )
}
