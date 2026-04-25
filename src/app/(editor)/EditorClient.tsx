'use client'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { type Canvas as FabricCanvas, type FabricObject, ActiveSelection, type IText } from 'fabric'
import TopBar from '@/components/editor/TopBar'
import StatusBar from '@/components/editor/StatusBar'
import PageNavigator from '@/components/editor/PageNavigator'
import dynamic from 'next/dynamic'
const Canvas = dynamic(() => import('@/components/editor/Canvas'), { ssr: false })
import LeftToolbar, { type Tool } from '@/components/editor/LeftToolbar'
import PropertiesBar from '@/components/editor/PropertiesBar'
import RightPane from '@/components/editor/RightPane'
import { addTextBox, addLine, addRect, addImagePlaceholder, addPageBreak, addTable } from '@/lib/canvas/elements'
import type { HistoryControl } from '@/components/editor/Canvas'
import TableEditorModal from '@/components/editor/TableEditorModal'
import { rebuildTableOnCanvas } from '@/lib/canvas/tableBuilder'
import { defaultTableConfig, type TableConfig } from '@/lib/canvas/tableConfig'

const ZOOM_STEP = 10
const ZOOM_MIN  = 25
const ZOOM_MAX  = 300

export default function EditorClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const fabricRef  = useRef<FabricCanvas | null>(null)
  const historyRef = useRef<HistoryControl | null>(null)
  const clipboard  = useRef<FabricObject | null>(null)

  // Multi-page: pages is an array of Fabric canvas JSON snapshots
  const pagesRef   = useRef<object[]>([{}])   // always current, no stale-closure issues
  const [pages,       setPages_]      = useState<object[]>([{}])
  const [currentPage, setCurrentPage] = useState(0)   // 0-indexed

  function setPages(p: object[]) { pagesRef.current = p; setPages_(p) }

  const [selectedObjs, setSelectedObjs] = useState<FabricObject[]>([])
  const [selectedObj,  setSelectedObj]  = useState<FabricObject | null>(null)
  const [activeTool,   setActiveTool]   = useState<Tool>('select')
  const [snapEnabled,  setSnapEnabled]  = useState(true)
  const [gridSize,     setGridSize]     = useState(8)
  const [zoom,         setZoom]         = useState(100)
  const [templateId,   setTemplateId]   = useState<string | null>(searchParams.get('id'))
  const [activeSource, setActiveSource] = useState<{ sourceId: string; table: string } | null>(null)
  const [activeQuery,  setActiveQuery]  = useState<{ sourceId: string; sql: string } | null>(null)
  const [templateName, setTemplateName] = useState('Untitled Memo')
  const [activeRecord, setActiveRecord] = useState<Record<string, string>>({})  // eslint-disable-line
  const [showTableEditor, setShowTableEditor] = useState(false)
  const [tableEditorSources, setTableEditorSources] = useState<{ id: string; name: string }[]>([])
  const [tableEditorSchema,  setTableEditorSchema]  = useState<{ table: string; columns: { name: string; type: string }[] }[]>([])

  function zoomIn()    { setZoom(z => Math.min(z + ZOOM_STEP, ZOOM_MAX)) }
  function zoomOut()   { setZoom(z => Math.max(z - ZOOM_STEP, ZOOM_MIN)) }
  function zoomReset() { setZoom(100) }

  // ── Load template ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!templateId) return
    let cancelled = false
    fetch(`/api/templates/${templateId}`)
      .then(r => r.json())
      .then(t => {
        if (cancelled) return
        setTemplateName(t.name)
        const raw = t.canvasJson as Record<string, unknown>
        // Support both old single-page format and new { pages: [...] } format
        const pagesData: object[] = Array.isArray(raw?.pages)
          ? (raw.pages as object[])
          : [t.canvasJson as object]
        setPages(pagesData)
        setCurrentPage(0)
        const canvas = fabricRef.current
        if (canvas) {
          canvas.loadFromJSON(pagesData[0]).then(() => {
            if (!cancelled) { historyRef.current?.reset(); canvas.renderAll() }
          })
        }
      })
    return () => { cancelled = true }
  }, [templateId])

  // ── Save ────────────────────────────────────────────────────────────────────
  async function handleSave() {
    const canvas = fabricRef.current
    if (!canvas) return
    // Flush current canvas state into pages array before saving
    const allPages = [...pagesRef.current]
    allPages[currentPage] = canvas.toJSON()
    setPages(allPages)
    const canvasJson = { pages: allPages }

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

  // ── Page management ─────────────────────────────────────────────────────────
  async function switchPage(target: number) {
    const canvas = fabricRef.current
    if (!canvas) return
    // Save current page
    const allPages = [...pagesRef.current]
    allPages[currentPage] = canvas.toJSON()
    setPages(allPages)
    setCurrentPage(target)
    // Load target page
    await canvas.loadFromJSON(allPages[target])
    historyRef.current?.reset()
    canvas.renderAll()
    setSelectedObj(null); setSelectedObjs([])
  }

  async function addPageCopy() {
    const canvas = fabricRef.current
    if (!canvas) return
    const allPages = [...pagesRef.current]
    allPages[currentPage] = canvas.toJSON()
    const copy = JSON.parse(JSON.stringify(allPages[currentPage])) // deep clone
    allPages.push(copy)
    setPages(allPages)
    const target = allPages.length - 1
    setCurrentPage(target)
    await canvas.loadFromJSON(copy)
    historyRef.current?.reset()
    canvas.renderAll()
    setSelectedObj(null); setSelectedObjs([])
  }

  async function addBlankPage() {
    const canvas = fabricRef.current
    if (!canvas) return
    const allPages = [...pagesRef.current]
    allPages[currentPage] = canvas.toJSON()
    const blank = { version: '6.0.0', objects: [], background: '#ffffff' }
    allPages.push(blank)
    setPages(allPages)
    const target = allPages.length - 1
    setCurrentPage(target)
    await canvas.loadFromJSON(blank)
    historyRef.current?.reset()
    canvas.renderAll()
    setSelectedObj(null); setSelectedObjs([])
  }

  async function deletePage() {
    const canvas = fabricRef.current
    if (!canvas || pagesRef.current.length <= 1) return
    if (!confirm(`Delete page ${currentPage + 1}?`)) return
    const allPages = [...pagesRef.current]
    allPages.splice(currentPage, 1)
    const target = Math.min(currentPage, allPages.length - 1)
    setPages(allPages)
    setCurrentPage(target)
    await canvas.loadFromJSON(allPages[target])
    historyRef.current?.reset()
    canvas.renderAll()
    setSelectedObj(null); setSelectedObjs([])
  }

  // ── Table editor ────────────────────────────────────────────────────────────
  async function handleOpenTableEditor() {
    try {
      const srcRes = await fetch('/api/databases')
      if (srcRes.ok) setTableEditorSources(await srcRes.json())
      if (activeSource) {
        const schRes = await fetch(`/api/databases/${activeSource.sourceId}/schema`)
        if (schRes.ok) setTableEditorSchema(await schRes.json())
      }
      setShowTableEditor(true)
    } catch (err) {
      console.error('Failed to load table editor data', err)
      setShowTableEditor(true) // still open modal, just with empty schema
    }
  }

  // ── Other editor actions ────────────────────────────────────────────────────
  function handlePreview() {
    if (!templateId) { alert('Save the template first'); return }
    let params = ''
    if (activeSource) {
      params = `?sourceId=${activeSource.sourceId}&table=${encodeURIComponent(activeSource.table)}`
    } else if (activeQuery) {
      // For custom queries, pass the SQL instead
      params = `?sourceId=${activeQuery.sourceId}&query=${encodeURIComponent(activeQuery.sql)}`
    }
    window.open(`/preview/${templateId}${params}`, '_blank')
  }

  function handleMerge() {
    if (!templateId) { alert('Save the template first'); return }
    let params = ''
    if (activeSource) {
      params = `?sourceId=${activeSource.sourceId}&table=${encodeURIComponent(activeSource.table)}`
    } else if (activeQuery) {
      params = `?sourceId=${activeQuery.sourceId}&query=${encodeURIComponent(activeQuery.sql)}`
    }
    window.open(`/merge/${templateId}${params}`, '_blank')
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

  function handleCopy() { clipboard.current = fabricRef.current?.getActiveObject() ?? null }
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
    canvas.setActiveObject(obj); canvas.renderAll()
  }

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const canvas = fabricRef.current
      if (!canvas) return
      const active = canvas.getActiveObject() as (FabricObject & { isEditing?: boolean }) | null
      const ctrl = e.ctrlKey || e.metaKey

      if (ctrl && e.key === 'z' && !e.shiftKey) { historyRef.current?.undo(); e.preventDefault(); return }
      if (ctrl && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { historyRef.current?.redo(); e.preventDefault(); return }
      if (ctrl && (e.key === '=' || e.key === '+')) { setZoom(z => Math.min(z + ZOOM_STEP, ZOOM_MAX)); e.preventDefault(); return }
      if (ctrl && e.key === '-') { setZoom(z => Math.max(z - ZOOM_STEP, ZOOM_MIN)); e.preventDefault(); return }
      if (ctrl && e.key === '0') { setZoom(100); e.preventDefault(); return }

      if ((e.key === 'Delete' || e.key === 'Backspace') && active && !active.isEditing) {
        canvas.remove(active); canvas.renderAll(); e.preventDefault()
      }
      if (ctrl && e.key === 'a') {
        const sel = new ActiveSelection(canvas.getObjects(), { canvas })
        canvas.setActiveObject(sel); canvas.renderAll(); e.preventDefault()
      }
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && active && !active.isEditing) {
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
        onTemplateNameChange={setTemplateName}
        onSave={handleSave}
        onPreview={handlePreview}
        onMerge={handleMerge}
        onExport={handleExport}
        onUndo={() => historyRef.current?.undo()}
        onRedo={() => historyRef.current?.redo()}
      />
      <PropertiesBar
        selected={selectedObj}
        selectedObjs={selectedObjs}
        canvas={fabricRef.current}
        gridSize={gridSize}
        onGridSizeChange={setGridSize}
        onUpdate={() => fabricRef.current?.renderAll()}
        onEditTable={() => handleOpenTableEditor()}
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
        {/* Canvas area + page navigator stacked vertically */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-auto" onClick={handleCanvasDivClick}>
            <Canvas
              canvasRef={fabricRef}
              historyRef={historyRef}
              gridSize={gridSize}
              snapEnabled={snapEnabled}
              zoom={zoom}
              onSelectionChange={objs => {
                setSelectedObjs(objs)
                setSelectedObj(objs[0] ?? null)
              }}
              onDrop={handleFieldDrop}
            />
          </div>
          <PageNavigator
            current={currentPage + 1}
            total={pages.length}
            onPrev={() => switchPage(currentPage - 1)}
            onNext={() => switchPage(currentPage + 1)}
            onAddCopy={addPageCopy}
            onAddBlank={addBlankPage}
            onDelete={deletePage}
          />
        </div>
        <RightPane
          onFieldDrop={handleFieldDrop}
          onRecordChange={setActiveRecord}
          onSourceTableChange={(sourceId, table) => {
            setActiveSource({ sourceId, table })
            setActiveQuery(null) // Clear custom query when selecting a table
          }}
          onQuerySelect={(sourceId, sql) => {
            setActiveQuery({ sourceId, sql })
            setActiveSource(null) // Clear table when selecting a custom query
          }}
        />
      </div>
      <StatusBar
        page={currentPage + 1}
        totalPages={pages.length}
        zoom={zoom}
        objectCount={fabricRef.current?.getObjects().length ?? 0}
        selectedCount={selectedObjs.length}
        gridSize={gridSize}
        snapEnabled={snapEnabled}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onZoomReset={zoomReset}
      />
      {showTableEditor && selectedObj && (selectedObj as { data?: { type?: string } }).data?.type === 'table' && (() => {
        const raw = (selectedObj as { data?: { config?: TableConfig; cols?: number; rows?: number } }).data
        const initialConfig = raw?.config ?? defaultTableConfig(raw?.cols ?? 3, raw?.rows ?? 2)
        return (
          <TableEditorModal
            initialConfig={initialConfig}
            schema={tableEditorSchema}
            onSave={config => {
              const canvas = fabricRef.current
              if (canvas && selectedObj) {
                const newGroup = rebuildTableOnCanvas(canvas, selectedObj as import('fabric').Group, config)
                setSelectedObj(newGroup)
                setSelectedObjs([newGroup])
              }
              setShowTableEditor(false)
            }}
            onClose={() => setShowTableEditor(false)}
          />
        )
      })()}
    </div>
  )
}
