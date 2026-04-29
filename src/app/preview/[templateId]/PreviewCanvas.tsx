'use client'
import { useEffect, useRef } from 'react'
import { Canvas as FabricCanvas } from 'fabric'

export default function PreviewCanvas({ canvasJson }: { canvasJson: object }) {
  const elRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!elRef.current) return
    let disposed = false
    const canvas = new FabricCanvas(elRef.current, {
      width: 794, height: 1123, backgroundColor: '#ffffff',
      selection: false, interactive: false,
    })
    canvas.loadFromJSON(canvasJson).then(() => { if (!disposed) canvas.renderAll() })
    return () => { disposed = true; canvas.dispose() }
  }, [])

  return <canvas ref={elRef} />
}
