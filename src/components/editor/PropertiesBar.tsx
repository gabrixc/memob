'use client'
import { useEffect, useRef, useState } from 'react'
import type { FabricObject, Canvas as FabricCanvas, Group } from 'fabric'
import { replaceWithImage } from '@/lib/canvas/elements'
import { readFileAsDataURL } from '@/lib/canvas/imageUpload'

interface PropertiesBarProps {
  selected:          FabricObject | null
  selectedObjs:      FabricObject[]
  canvas:            FabricCanvas | null
  gridSize:          number
  onGridSizeChange:  (size: number) => void
  onUpdate?:         () => void
  onEditTable?:      () => void
}

type RectLike = FabricObject & { stroke?: string | null; strokeWidth?: number }
type TextLike  = FabricObject & {
  fontWeight?: string; fontStyle?: string
  lineHeight?: number; fill?: string; fontSize?: number
}

export default function PropertiesBar({ selected, selectedObjs, canvas, gridSize, onGridSizeChange, onUpdate, onEditTable }: PropertiesBarProps) {
  const isRect = selected?.type === 'rect'
  const isText = selected?.type === 'i-text' || selected?.type === 'text'

  const dataType    = (selected as (FabricObject & { data?: { type?: string } }) | null)?.data?.type
  const isImgHolder = selected?.type === 'group' && dataType === 'imagePlaceholder'
  const isTable     = selected?.type === 'group' && dataType === 'table'
  const isParagraph = selected?.type === 'textbox'

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  async function handleImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !canvas || !selected) return
    setUploadError(null)
    setUploading(true)
    try {
      const dataUrl = await readFileAsDataURL(file)
      await replaceWithImage(canvas, selected as Group, dataUrl)
    } catch (err) {
      console.error('Image upload failed', err)
      setUploadError('Upload failed. Please try again.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // ── Rect state ──────────────────────────────────────────────────────────────
  const [stroke,      setStroke]      = useState('#94a3b8')
  const [strokeWidth, setStrokeWidth] = useState(1)
  const [hasBorder,   setHasBorder]   = useState(true)

  // ── Text state ──────────────────────────────────────────────────────────────
  const [bold,       setBold]       = useState(false)
  const [italic,     setItalic]     = useState(false)
  const [lineHeight, setLineHeight] = useState(1.16)
  const [textColor,  setTextColor]  = useState('#1e293b')
  const [fontSize,   setFontSize]   = useState(14)

  // Sync when selection changes
  useEffect(() => {
    setUploadError(null)
    if (isRect) {
      const obj = selected as RectLike
      const s = (obj.stroke as string) ?? '#94a3b8'
      setStroke(s || '#94a3b8')
      setHasBorder(!!s && s !== '' && s !== 'transparent')
      setStrokeWidth(obj.strokeWidth ?? 1)
    }
    if (isText) {
      const obj = selected as TextLike
      setBold(obj.fontWeight === 'bold')
      setItalic(obj.fontStyle === 'italic')
      setLineHeight(obj.lineHeight ?? 1.16)
      setTextColor((obj.fill as string) ?? '#1e293b')
      setFontSize(obj.fontSize ?? 14)
    }
  }, [selected])

  // ── Rect helpers ─────────────────────────────────────────────────────────────
  function applyStroke(color: string, width: number, visible: boolean) {
    ;(selected as RectLike).set({ stroke: visible ? color : '', strokeWidth: visible ? width : 0 })
    onUpdate?.()
  }
  function handleToggleBorder(on: boolean) {
    setHasBorder(on); applyStroke(stroke, strokeWidth, on)
  }
  function handleStrokeColor(c: string) {
    setStroke(c); if (hasBorder) applyStroke(c, strokeWidth, true)
  }
  function handleStrokeWidth(w: number) {
    setStrokeWidth(w); if (hasBorder) applyStroke(stroke, w, true)
  }

  // ── Text helpers ─────────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function applyText(patch: Record<string, unknown>) {
    ;(selected as TextLike).set(patch as Parameters<FabricObject['set']>[0])
    onUpdate?.()
  }
  function handleBold() {
    const next = !bold; setBold(next)
    applyText({ fontWeight: next ? 'bold' : 'normal' })
  }
  function handleItalic() {
    const next = !italic; setItalic(next)
    applyText({ fontStyle: next ? 'italic' : 'normal' })
  }
  function handleLineHeight(v: number) {
    setLineHeight(v); applyText({ lineHeight: v })
  }
  function handleTextColor(c: string) {
    setTextColor(c); applyText({ fill: c })
  }
  function handleFontSize(s: number) {
    setFontSize(s); applyText({ fontSize: s })
  }

  const btnBase  = 'w-6 h-6 flex items-center justify-center rounded text-sm shrink-0'
  const btnOff   = 'bg-slate-200 text-slate-600 hover:bg-slate-300'
  const btnOn    = 'bg-sky-500 text-white'
  const numInput = 'border border-slate-300 rounded px-1 py-0.5 text-xs bg-white'

  return (
    <div className="h-8 bg-slate-100 border-b border-slate-200 flex items-center px-3 gap-3 text-xs text-slate-600 shrink-0 overflow-x-auto">
      {/* Position / size */}
      <span className="shrink-0">X: <b>{Math.round(selected?.left ?? 0)}</b></span>
      <span className="shrink-0">Y: <b>{Math.round(selected?.top ?? 0)}</b></span>
      <span className="shrink-0">W: <b>{Math.round((selected?.width ?? 0) * (selected?.scaleX ?? 1))}</b></span>
      <span className="shrink-0">H: <b>{Math.round((selected?.height ?? 0) * (selected?.scaleY ?? 1))}</b></span>

      {/* ── Image placeholder controls ──────────────────────────────────────── */}
      {isImgHolder && (
        <>
          <div className="w-px h-4 bg-slate-300 shrink-0" />
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-2 py-0.5 bg-sky-500 text-white rounded text-xs hover:bg-sky-600 disabled:opacity-50 shrink-0"
          >
            {uploading ? 'Uploading…' : 'Upload Image'}
          </button>
          {uploadError && (
            <span className="text-red-500 text-xs shrink-0">{uploadError}</span>
          )}
        </>
      )}

      {/* ── Table controls ──────────────────────────────────────────────────── */}
      {isTable && (
        <>
          <div className="w-px h-4 bg-slate-300 shrink-0" />
          <button onClick={onEditTable}
            className="px-2 py-0.5 bg-sky-500 text-white rounded text-xs hover:bg-sky-600 shrink-0">
            Edit Table
          </button>
        </>
      )}

      {/* ── Rect controls ───────────────────────────────────────────────────── */}
      {isRect && (
        <>
          <div className="w-px h-4 bg-slate-300 shrink-0" />
          <label className="flex items-center gap-1 cursor-pointer shrink-0">
            <input type="checkbox" checked={hasBorder} onChange={e => handleToggleBorder(e.target.checked)} />
            Border
          </label>
          {hasBorder && (
            <>
              <label className="flex items-center gap-1 shrink-0">
                Width:
                <input type="number" min={1} max={40} value={strokeWidth}
                  onChange={e => handleStrokeWidth(Math.max(1, Number(e.target.value)))}
                  className={`${numInput} w-12`} />
                px
              </label>
              <label className="flex items-center gap-1 shrink-0 cursor-pointer">
                Colour:
                <input type="color" value={stroke} onChange={e => handleStrokeColor(e.target.value)}
                  className="w-6 h-5 rounded border border-slate-300 cursor-pointer p-0" />
              </label>
            </>
          )}
        </>
      )}

      {/* ── Text controls ───────────────────────────────────────────────────── */}
      {isText && (
        <>
          <div className="w-px h-4 bg-slate-300 shrink-0" />

          {/* Font size */}
          <label className="flex items-center gap-1 shrink-0">
            Size:
            <input type="number" min={6} max={200} value={fontSize}
              onChange={e => handleFontSize(Math.max(6, Number(e.target.value)))}
              className={`${numInput} w-14`} />
          </label>

          {/* Bold */}
          <button onClick={handleBold} title="Bold"
            className={`${btnBase} font-bold ${bold ? btnOn : btnOff}`}>
            B
          </button>

          {/* Italic */}
          <button onClick={handleItalic} title="Italic"
            className={`${btnBase} italic ${italic ? btnOn : btnOff}`}>
            I
          </button>

          {/* Line height */}
          <label className="flex items-center gap-1 shrink-0">
            Line ↕:
            <input type="number" min={0.8} max={4} step={0.1} value={lineHeight}
              onChange={e => handleLineHeight(Math.max(0.8, Number(Number(e.target.value).toFixed(1))))}
              className={`${numInput} w-14`} />
          </label>

          {/* Text colour */}
          <label className="flex items-center gap-1 shrink-0 cursor-pointer">
            Colour:
            <input type="color" value={textColor} onChange={e => handleTextColor(e.target.value)}
              className="w-6 h-5 rounded border border-slate-300 cursor-pointer p-0" />
          </label>
        </>
      )}

      {/* Grid selector */}
      <div className="ml-auto flex items-center gap-2 shrink-0">
        <span className="text-slate-400">Grid:</span>
        <select value={gridSize} onChange={e => onGridSizeChange(Number(e.target.value))}
          className={`${numInput}`}>
          {[4, 8, 16, 24, 32].map(s => <option key={s} value={s}>{s}px</option>)}
        </select>
      </div>
    </div>
  )
}
