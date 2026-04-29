'use client'
import { useEffect, useRef } from 'react'
import { Canvas as FabricCanvas } from 'fabric'

export default function PreviewCanvas({ canvasJson }: { canvasJson: object }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    let disposed = false
    const canvasEl = document.createElement('canvas')
    containerRef.current.appendChild(canvasEl)
    const canvas = new FabricCanvas(canvasEl, {
      width: 794, height: 1123, backgroundColor: '#ffffff',
      selection: false, interactive: false,
    })
    canvas.loadFromJSON(canvasJson).then(() => { if (!disposed) canvas.renderAll() })
    return () => {
      disposed = true
      canvas.dispose()
      canvasEl.remove()
    }
  }, [])

  return <div ref={containerRef} />
}
