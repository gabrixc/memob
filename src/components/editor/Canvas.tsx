'use client'
import { useEffect, useRef } from 'react'
import { Canvas as FabricCanvas, type FabricObject } from 'fabric'
import { snapToGrid } from '@/lib/canvas/snap'

// A4 at 96 DPI: 210mm × 297mm
export const PAGE_WIDTH = 794
export const PAGE_HEIGHT = 1123
const MARGIN = 76 // 20mm at 96 DPI

export interface HistoryControl {
  undo: () => void
  redo: () => void
  reset: () => void
}

interface CanvasProps {
  gridSize?: number
  snapEnabled?: boolean
  onSelectionChange?: (objects: FabricObject[]) => void
  canvasRef: React.MutableRefObject<FabricCanvas | null>
  historyRef?: React.MutableRefObject<HistoryControl | null>
  onDrop?: (field: string, x: number, y: number) => void
  zoom?: number
}

export default function Canvas({
  gridSize = 8,
  snapEnabled = true,
  onSelectionChange,
  canvasRef,
  historyRef,
  onDrop,
  zoom = 100,
}: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const historyStack = useRef<string[]>([])
  const historyIdx = useRef(-1)
  const isApplyingHistory = useRef(false)

  useEffect(() => {
    if (!containerRef.current) return

    let disposed = false
    const canvasEl = document.createElement('canvas')
    containerRef.current.appendChild(canvasEl)

    const canvas = new FabricCanvas(canvasEl, {
      width: PAGE_WIDTH,
      height: PAGE_HEIGHT,
      backgroundColor: '#ffffff',
      selection: true,
    })
    canvasRef.current = canvas

    const wrapper = containerRef.current.querySelector('.canvas-container') as HTMLElement | null
    if (wrapper) {
      wrapper.style.width = `${PAGE_WIDTH}px`
      wrapper.style.height = `${PAGE_HEIGHT}px`
    }

    function saveState() {
      if (isApplyingHistory.current) return
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const json = JSON.stringify((canvas as any).toJSON(['data']))
      historyStack.current = historyStack.current.slice(0, historyIdx.current + 1)
      historyStack.current.push(json)
      historyIdx.current = historyStack.current.length - 1
    }

    // Save initial blank state
    saveState()

    canvas.on('object:added',    saveState)
    canvas.on('object:removed',  saveState)
    canvas.on('object:modified', saveState)

    if (historyRef) {
      historyRef.current = {
        undo: () => {
          if (historyIdx.current <= 0) return
          historyIdx.current--
          isApplyingHistory.current = true
          canvas.loadFromJSON(JSON.parse(historyStack.current[historyIdx.current]))
            .then(() => { if (disposed) return; isApplyingHistory.current = false; canvas.renderAll() })
        },
        redo: () => {
          if (historyIdx.current >= historyStack.current.length - 1) return
          historyIdx.current++
          isApplyingHistory.current = true
          canvas.loadFromJSON(JSON.parse(historyStack.current[historyIdx.current]))
            .then(() => { if (disposed) return; isApplyingHistory.current = false; canvas.renderAll() })
        },
        reset: () => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          historyStack.current = [JSON.stringify((canvas as any).toJSON(['data']))]
          historyIdx.current = 0
        },
      }
    }

    canvas.on('object:moving', ({ target }) => {
      if (!snapEnabled || !target) return
      target.set({
        left: snapToGrid(target.left ?? 0, gridSize),
        top:  snapToGrid(target.top  ?? 0, gridSize),
      })
    })

    canvas.on('selection:created', ({ selected }) => onSelectionChange?.(selected ?? []))
    canvas.on('selection:updated', ({ selected }) => onSelectionChange?.(selected ?? []))
    canvas.on('selection:cleared', () => onSelectionChange?.([]))

    return () => {
      disposed = true
      canvas.dispose()
      canvasEl.remove()
      canvasRef.current = null
      if (historyRef) historyRef.current = null
    }
  }, [])

  // Apply zoom whenever it changes
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const z = zoom / 100
    canvas.setZoom(z)
    canvas.setWidth(PAGE_WIDTH * z)
    canvas.setHeight(PAGE_HEIGHT * z)
    canvas.renderAll()
  }, [zoom])

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    const field = e.dataTransfer.getData('text/plain')
    if (!field || !onDrop) return
    const rect = (e.currentTarget.querySelector('.canvas-container') as HTMLElement | null)
      ?.getBoundingClientRect() ?? e.currentTarget.getBoundingClientRect()
    const z = zoom / 100
    onDrop(field, (e.clientX - rect.left) / z, (e.clientY - rect.top) / z)
  }

  const z = zoom / 100

  return (
    <div
      className="flex-1 overflow-auto"
      style={{ backgroundColor: '#94a3b8' }}
      onDragOver={e => e.preventDefault()}
      onDrop={handleDrop}
    >
      {/* centre the A4 page horizontally, start at top */}
      <div style={{ minHeight: '100%', display: 'flex', justifyContent: 'center', padding: '32px 24px' }}>
        <div
          style={{
            position: 'relative',
            width: PAGE_WIDTH * z,
            height: PAGE_HEIGHT * z,
            flexShrink: 0,
            boxShadow: '0 4px 32px rgba(0,0,0,0.35)',
          }}
        >
          {/* Fabric canvas mounts here */}
          <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />

          {/* safe-print margin overlay */}
          <div
            style={{
              position: 'absolute',
              top: MARGIN * z, left: MARGIN * z,
              width: (PAGE_WIDTH - MARGIN * 2) * z,
              height: (PAGE_HEIGHT - MARGIN * 2) * z,
              border: '1px dashed rgba(99,102,241,0.45)',
              pointerEvents: 'none',
            }}
          />
          {/* margin labels */}
          {[
            { style: { top: MARGIN * z / 2 - 7, left: '50%', transform: 'translateX(-50%)' } },
            { style: { bottom: MARGIN * z / 2 - 7, left: '50%', transform: 'translateX(-50%)' } },
            { style: { left: 2, top: '50%', transform: 'translateY(-50%) rotate(-90deg)' } },
            { style: { right: 2, top: '50%', transform: 'translateY(-50%) rotate(90deg)' } },
          ].map((p, i) => (
            <span key={i} style={{
              position: 'absolute', pointerEvents: 'none', userSelect: 'none',
              fontSize: 9, color: 'rgba(99,102,241,0.6)', ...p.style,
            }}>20mm</span>
          ))}
        </div>
      </div>
    </div>
  )
}
