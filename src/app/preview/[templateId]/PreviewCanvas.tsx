'use client'
import { useEffect, useRef } from 'react'
import { Canvas as FabricCanvas } from 'fabric'

export default function PreviewCanvas({ canvasJson }: { canvasJson: object }) {
  const elRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!elRef.current) return
    const canvas = new FabricCanvas(elRef.current, {
      width: 794, height: 1123, backgroundColor: '#ffffff',
      selection: false, interactive: false,
    })
    canvas.loadFromJSON(canvasJson, () => canvas.renderAll())
    return () => { canvas.dispose() }
  }, [])

  return <canvas ref={elRef} />
}
