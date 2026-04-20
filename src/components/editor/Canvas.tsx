'use client'
import { useEffect, useRef } from 'react'
import { Canvas as FabricCanvas, type FabricObject } from 'fabric'
import { snapToGrid } from '@/lib/canvas/snap'

export const PAGE_WIDTH = 794
export const PAGE_HEIGHT = 1123

interface CanvasProps {
  gridSize?: number
  snapEnabled?: boolean
  onSelectionChange?: (objects: FabricObject[]) => void
  canvasRef: React.MutableRefObject<FabricCanvas | null>
  onDrop?: (field: string, x: number, y: number) => void
}

export default function Canvas({
  gridSize = 8,
  snapEnabled = true,
  onSelectionChange,
  canvasRef,
  onDrop,
}: CanvasProps) {
  const elRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!elRef.current) return
    const canvas = new FabricCanvas(elRef.current, {
      width: PAGE_WIDTH,
      height: PAGE_HEIGHT,
      backgroundColor: '#ffffff',
      selection: true,
    })
    canvasRef.current = canvas

    canvas.on('object:moving', ({ target }) => {
      if (!snapEnabled || !target) return
      target.set({
        left: snapToGrid(target.left ?? 0, gridSize),
        top: snapToGrid(target.top ?? 0, gridSize),
      })
    })

    canvas.on('selection:created', ({ selected }) => onSelectionChange?.(selected ?? []))
    canvas.on('selection:updated', ({ selected }) => onSelectionChange?.(selected ?? []))
    canvas.on('selection:cleared', () => onSelectionChange?.([]))

    return () => { canvas.dispose() }
  }, [])

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    const field = e.dataTransfer.getData('text/plain')
    if (!field || !onDrop) return
    const rect = e.currentTarget.getBoundingClientRect()
    onDrop(field, e.clientX - rect.left, e.clientY - rect.top)
  }

  return (
    <div
      className="flex-1 overflow-auto flex items-start justify-center p-5"
      style={{
        backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 7px,rgba(148,163,184,0.3) 8px),repeating-linear-gradient(90deg,transparent,transparent 7px,rgba(148,163,184,0.3) 8px)',
        backgroundSize: '8px 8px',
        backgroundColor: '#64748b',
      }}
      onDragOver={e => e.preventDefault()}
      onDrop={handleDrop}
    >
      <div className="shadow-2xl shrink-0">
        <canvas ref={elRef} />
      </div>
    </div>
  )
}
