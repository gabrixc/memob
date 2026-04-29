'use client'
import { useEffect, useRef } from 'react'
import { Canvas as FabricCanvas } from 'fabric'

interface Props {
  canvasJson: object
  onReady: (lowerCanvasEl: HTMLCanvasElement) => void
}

export default function BatchPreviewCanvas({ canvasJson, onReady }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    let cancelled = false

    const canvasEl = document.createElement('canvas')
    containerRef.current.appendChild(canvasEl)

    const canvas = new FabricCanvas(canvasEl, {
      width: 794, height: 1123, backgroundColor: '#ffffff',
      selection: false,
    })

    canvas.loadFromJSON(canvasJson).then(() => {
      if (!cancelled) {
        canvas.renderAll()
        // lowerCanvasEl is the raw <canvas> that has the pixel data
        const lower = containerRef.current?.querySelector('canvas.lower-canvas') as HTMLCanvasElement | null
        if (lower) onReady(lower)
      }
    })

    return () => {
      cancelled = true
      canvas.dispose()
      canvasEl.remove()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={containerRef} style={{ width: 794, height: 1123 }} />
}
