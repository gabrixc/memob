import { type Canvas as FabricCanvas, IText, Line, Rect, Group, FabricText, FabricImage, Textbox } from 'fabric'
import { snapToGrid } from './snap'
import { buildTableGroup } from './tableBuilder'
import { defaultTableConfig } from './tableConfig'

const G = 8

export function addTextBox(canvas: FabricCanvas, x = 48, y = 48, text = '{{placeholder}}') {
  const obj = new IText(text, {
    left: snapToGrid(x, G), top: snapToGrid(y, G),
    fontSize: 14, fontFamily: 'Inter, sans-serif', fill: '#1e293b', width: 200,
  })
  canvas.add(obj)
  canvas.setActiveObject(obj)
  canvas.renderAll()
  return obj
}

export function addLine(canvas: FabricCanvas, x = 48, y = 48) {
  const obj = new Line([x, y, x + 200, y], {
    stroke: '#475569', strokeWidth: 1, selectable: true,
  })
  canvas.add(obj); canvas.renderAll(); return obj
}

export function addRect(canvas: FabricCanvas, x = 48, y = 48) {
  const obj = new Rect({
    left: snapToGrid(x, G), top: snapToGrid(y, G),
    width: 200, height: 80, fill: 'transparent', stroke: '#94a3b8', strokeWidth: 1,
    lockUniScaling: false, // free transform — no aspect-ratio constraint
    strokeUniform: true,   // stroke width stays constant when resizing
  })
  canvas.add(obj); canvas.renderAll(); return obj
}

export function addImagePlaceholder(canvas: FabricCanvas, x = 48, y = 48) {
  const r = new Rect({
    width: 120, height: 80, fill: '#f1f5f9',
    stroke: '#94a3b8', strokeWidth: 2, strokeDashArray: [6, 4],
  })
  const t = new FabricText('Image', {
    fontSize: 11, fill: '#94a3b8', originX: 'center', originY: 'center',
    left: 60, top: 40, selectable: false, evented: false,
  })
  const g = new Group([r, t], {
    left: snapToGrid(x, G), top: snapToGrid(y, G),
    data: { type: 'imagePlaceholder' },
  })
  canvas.add(g); canvas.renderAll(); return g
}

export function addPageBreak(canvas: FabricCanvas, y = 300) {
  const obj = new Line([0, snapToGrid(y, G), 794, snapToGrid(y, G)], {
    stroke: '#94a3b8', strokeWidth: 1.5, strokeDashArray: [8, 6],
    lockMovementX: true, hasControls: false,
    data: { type: 'pagebreak' },
  })
  canvas.add(obj); canvas.renderAll(); return obj
}

export async function replaceWithImage(
  canvas: FabricCanvas,
  placeholder: Group,
  dataUrl: string
): Promise<FabricImage> {
  const img = await FabricImage.fromURL(dataUrl)
  const pw = (placeholder.width  ?? 120) * (placeholder.scaleX ?? 1)
  const ph = (placeholder.height ??  80) * (placeholder.scaleY ?? 1)
  img.set({
    left:   placeholder.left ?? 0,
    top:    placeholder.top  ?? 0,
    scaleX: pw / (img.width  ?? pw),
    scaleY: ph / (img.height ?? ph),
    data:   { type: 'embeddedImage' },
  })
  img.setCoords()
  canvas.remove(placeholder)
  canvas.add(img)
  canvas.setActiveObject(img)
  canvas.renderAll()
  return img
}

export function addTable(canvas: FabricCanvas, x = 48, y = 48, cols = 3, rows = 2) {
  const config = defaultTableConfig(cols, rows)
  const g = buildTableGroup(config)
  g.set({ left: snapToGrid(x, G), top: snapToGrid(y, G) })
  canvas.add(g)
  canvas.renderAll()
  return g
}

export function addParagraph(canvas: FabricCanvas, x = 48, y = 48) {
  const obj = new Textbox('Enter paragraph text here...', {
    left:       snapToGrid(x, G),
    top:        snapToGrid(y, G),
    width:      320,
    fontSize:   13,
    fontFamily: 'Inter, sans-serif',
    fill:       '#1e293b',
    textAlign:  'left',
    lineHeight: 1.4,
    data: {
      type:          'paragraph',
      textTransform: 'none',
      numbering:     'none',
      level:         1,
      indent:        0,    // inches
      tabStop:       0,    // inches
      charStyles: {} as Record<number, { fontWeight?: string; fontStyle?: string }>,
    },
  })
  canvas.add(obj)
  canvas.setActiveObject(obj)
  canvas.renderAll()
  return obj
}
