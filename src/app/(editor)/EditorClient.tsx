'use client'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { type Canvas as FabricCanvas, type FabricObject, ActiveSelection, type IText } from 'fabric'
import TopBar from '@/components/editor/TopBar'
import StatusBar from '@/components/editor/StatusBar'
import Canvas from '@/components/editor/Canvas'
import LeftToolbar, { type Tool } from '@/components/editor/LeftToolbar'
import PropertiesBar from '@/components/editor/PropertiesBar'
import RightPane from '@/components/editor/RightPane'
import { addTextBox, addLine, addRect, addImagePlaceholder, addPageBreak, addTable } from '@/lib/canvas/elements'

export default function EditorClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const fabricRef = useRef<FabricCanvas | null>(null)
  const clipboard = useRef<FabricObject | null>(null)
  const [selectedObjs, setSelectedObjs] = useState<FabricObject[]>([])
  const [selectedObj, setSelectedObj] = useState<FabricObject | null>(null)
  const [activeTool, setActiveTool] = useState<Tool>('select')
  const [snapEnabled, setSnapEnabled] = useState(true)
  const [gridSize, setGridSize] = useState(8)
  const [templateId, setTemplateId] = useState<string | null>(searchParams.get('id'))
  const [templateName, setTemplateName] = useState('Untitled Memo')
  const [activeRecord, setActiveRecord] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!templateId) return
    fetch(`/api/templates/${templateId}`)
      .then(r => r.json())
      .then(t => {
        setTemplateName(t.name)
        const canvas = fabricRef.current
        if (canvas && t.canvasJson) canvas.loadFromJSON(t.canvasJson, () => canvas.renderAll())
      })
  }, [templateId])

  async function handleSave() {
    const canvas = fabricRef.current
    if (!canvas) return
    const canvasJson = canvas.toJSON()
    if (templateId) {
      await fetch(`/api/templates/${templateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: templateName, canvasJson, pageSize: 'A4' }),
      })
    } else {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: templateName, canvasJson, pageSize: 'A4' }),
      })
      const t = await res.json()
      setTemplateId(t.id)
      router.replace(`/?id=${t.id}`)
    }
  }

  function handlePreview() {
    if (!templateId) { alert('Save the template first'); return }
    window.open(`/preview/${templateId}`, '_blank')
  }

  async function handleExport(format: 'pdf' | 'image' | 'word') {
    const canvas = fabricRef.current
    if (!canvas || !templateId) { alert('Save the template first'); return }
    let canvasDataUrl: string | undefined
    if (format === 'image') canvasDataUrl = canvas.toDataURL({ format: 'png', multiplier: 1 })
    const res = await fetch('/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId, format, canvasDataUrl }),
    })
    const { downloadUrl } = await res.json()
    window.open(downloadUrl, '_blank')
  }

  function handleCopy() {
    clipboard.current = fabricRef.current?.getActiveObject() ?? null
  }
  function handleCut() {
    const canvas = fabricRef.current
    const obj = canvas?.getActiveObject()
    if (obj) { clipboard.current = obj; canvas?.remove(obj); canvas?.renderAll() }
  }
  async function handlePaste() {
    const canvas = fabricRef.current
    if (!clipboard.current || !canvas) return
    const clone = await clipboard.current.clone()
    clone.set({ left: (clone.left ?? 0) + 16, top: (clone.top ?? 0) + 16 })
    canvas.add(clone); canvas.setActiveObject(clone); canvas.renderAll()
  }

  function handleCanvasDivClick(e: React.MouseEvent<HTMLDivElement>) {
    const canvas = fabricRef.current
    if (!canvas || activeTool === 'select') return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    switch (activeTool) {
      case 'text':      addTextBox(canvas, x, y); break
      case 'line':      addLine(canvas, x, y); break
      case 'rect':      addRect(canvas, x, y); break
      case 'image':     addImagePlaceholder(canvas, x, y); break
      case 'pagebreak': addPageBreak(canvas, y); break
      case 'table':     addTable(canvas, x, y); break
    }
    setActiveTool('select')
  }

  function handleFieldDrop(field: string, x: number, y: number) {
    const canvas = fabricRef.current
    if (!canvas) return
    const obj = addTextBox(canvas, x, y, field) as IText
    canvas.setActiveObject(obj)
    canvas.renderAll()
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const canvas = fabricRef.current
      if (!canvas) return
      const active = canvas.getActiveObject() as (FabricObject & { isEditing?: boolean }) | null

      if ((e.key === 'Delete' || e.key === 'Backspace') && active && !active.isEditing) {
        canvas.remove(active); canvas.renderAll()
        e.preventDefault()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        const sel = new ActiveSelection(canvas.getObjects(), { canvas })
        canvas.setActiveObject(sel); canvas.renderAll()
        e.preventDefault()
      }
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && active) {
        const d = e.shiftKey ? 8 : 1
        active.set({
          left: (active.left ?? 0) + (e.key === 'ArrowLeft' ? -d : e.key === 'ArrowRight' ? d : 0),
          top:  (active.top  ?? 0) + (e.key === 'ArrowUp'   ? -d : e.key === 'ArrowDown'  ? d : 0),
        })
        canvas.renderAll(); e.preventDefault()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TopBar
        templateName={templateName}
        onSave={handleSave}
        onPreview={handlePreview}
        onExport={handleExport}
      />
      <PropertiesBar
        selected={selectedObj}
        gridSize={gridSize}
        onGridSizeChange={setGridSize}
      />
      <div className="flex flex-1 overflow-hidden">
        <LeftToolbar
          activeTool={activeTool}
          onToolChange={setActiveTool}
          snapEnabled={snapEnabled}
          onSnapToggle={() => setSnapEnabled(s => !s)}
          onCopy={handleCopy}
          onCut={handleCut}
          onPaste={handlePaste}
        />
        <div className="flex-1 overflow-hidden" onClick={handleCanvasDivClick}>
          <Canvas
            canvasRef={fabricRef}
            gridSize={gridSize}
            snapEnabled={snapEnabled}
            onSelectionChange={objs => {
              setSelectedObjs(objs)
              setSelectedObj(objs[0] ?? null)
            }}
            onDrop={handleFieldDrop}
          />
        </div>
        <RightPane
          onFieldDrop={handleFieldDrop}
          onRecordChange={setActiveRecord}
        />
      </div>
      <StatusBar
        page={1} totalPages={1} zoom={100}
        objectCount={fabricRef.current?.getObjects().length ?? 0}
        selectedCount={selectedObjs.length}
        gridSize={gridSize} snapEnabled={snapEnabled}
      />
    </div>
  )
}
