import { type Canvas as FabricCanvas, IText, Line, Rect, Group, FabricText } from 'fabric'
import { snapToGrid } from './snap'

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

export function addTable(canvas: FabricCanvas, x = 48, y = 48, cols = 3, rows = 2) {
  const cW = 80, cH = 28
  const objects: (Rect | IText)[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      objects.push(new Rect({
        left: c * cW, top: r * cH, width: cW, height: cH,
        fill: r === 0 ? '#f8fafc' : '#ffffff', stroke: '#e2e8f0', strokeWidth: 1,
        selectable: false, evented: false,
      }))
      objects.push(new IText(r === 0 ? `Col ${c + 1}` : `{{col${c + 1}}}`, {
        left: c * cW + 4, top: r * cH + 6,
        fontSize: 10, fontFamily: 'Inter, sans-serif', fill: '#475569',
        width: cW - 8, selectable: false, evented: false,
      }))
    }
  }
  const g = new Group(objects, {
    left: snapToGrid(x, G), top: snapToGrid(y, G),
    data: { type: 'table', cols, rows },
  })
  canvas.add(g); canvas.renderAll(); return g
}
