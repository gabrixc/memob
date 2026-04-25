// src/lib/canvas/tableBuilder.ts
import { Rect, Textbox, Group, type Canvas as FabricCanvas } from 'fabric'
import type { TableConfig, CellStyle } from './tableConfig'

const DEFAULT_CW = 80
const DEFAULT_CH = 28
const PAD = 3 // horizontal padding inside each cell

function applyTextTransform(text: string, transform?: CellStyle['textTransform']): string {
  if (!transform || transform === 'none') return text
  if (transform === 'uppercase') return text.toUpperCase()
  if (transform === 'lowercase') return text.toLowerCase()
  return text.replace(/\b\w/g, c => c.toUpperCase())
}

function computeTop(r: number, rowH: number, verticalAlign?: CellStyle['verticalAlign']): number {
  const LINE_H = 12 // approx line height for fontSize 10
  if (!verticalAlign || verticalAlign === 'top') return r * rowH + PAD
  if (verticalAlign === 'middle') return r * rowH + Math.round((rowH - LINE_H) / 2)
  return r * rowH + rowH - LINE_H - PAD
}

export function buildTableGroup(config: TableConfig): Group {
  const { headers, cols, rows, cellData, borderStyle } = config
  const totalRows = rows + 1
  const rowH      = config.rowHeight ?? DEFAULT_CH

  // Per-column widths and cumulative x positions
  const colWidths = Array.from({ length: cols }, (_, c) => config.colWidths?.[c] ?? DEFAULT_CW)
  const colX: number[] = []
  let cx = 0
  for (let c = 0; c < cols; c++) { colX.push(cx); cx += colWidths[c] }
  const totalWidth  = cx
  const totalHeight = totalRows * rowH

  const objects: (Rect | Textbox)[] = []

  if (borderStyle.showOuter) {
    objects.push(new Rect({
      left: 0, top: 0,
      width: totalWidth, height: totalHeight,
      fill: 'transparent',
      stroke: borderStyle.borderColor,
      strokeWidth: borderStyle.borderWeight,
      selectable: false, evented: false,
    }))
  }

  for (let r = 0; r < totalRows; r++) {
    for (let c = 0; c < cols; c++) {
      const isHeader = r === 0
      const style: CellStyle = isHeader
        ? (config.headerStyles?.[c] ?? {})
        : (config.cellStyles?.[r - 1]?.[c] ?? {})
      const cw = colWidths[c]
      const x  = colX[c]

      objects.push(new Rect({
        left:        x,   top: r * rowH,
        width:       cw,  height: rowH,
        fill:        isHeader ? '#f8fafc' : '#ffffff',
        stroke:      borderStyle.showInner ? borderStyle.borderColor : 'transparent',
        strokeWidth: borderStyle.showInner ? borderStyle.borderWeight : 0,
        selectable: false, evented: false,
      }))

      const rawText = isHeader
        ? (headers[c] ?? `Col ${c + 1}`)
        : (cellData[r - 1]?.[c] ?? '')
      const text = applyTextTransform(rawText, style.textTransform)

      // Always use Textbox so textAlign works correctly for all alignments
      objects.push(new Textbox(text, {
        left:       x + PAD,
        top:        computeTop(r, rowH, style.verticalAlign),
        fontSize:   10,
        fontFamily: 'Inter, sans-serif',
        fill:       style.color ?? '#475569',
        fontWeight: style.fontWeight ?? 'normal',
        textAlign:  style.textAlign ?? 'left',
        width:      Math.max(cw - PAD * 2, 1),
        selectable: false,
        evented:    false,
      }))
    }
  }

  const tableData = { type: 'table' as const, cols, rows, config }

  // Build group without relying on constructor to set data
  const group = new Group(objects, {} as unknown as ConstructorParameters<typeof Group>[1])

  // Explicitly set data so PropertiesBar can detect the table type
  ;(group as unknown as { data: typeof tableData }).data = tableData

  // Override toObject so data is ALWAYS included in canvas serialization
  // regardless of whether toJSON(['data']) is called — survives save/reload cycles
  const _toObject = group.toObject.bind(group)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  group.toObject = function (propertiesToInclude?: any) {
    return { ..._toObject(propertiesToInclude), data: tableData }
  } as typeof group.toObject

  return group
}

export function rebuildTableOnCanvas(
  canvas: FabricCanvas,
  oldGroup: Group,
  config: TableConfig
): Group {
  const newGroup = buildTableGroup(config)
  newGroup.set({ left: oldGroup.left ?? 0, top: oldGroup.top ?? 0 })
  newGroup.setCoords()
  canvas.remove(oldGroup)
  canvas.add(newGroup)
  canvas.setActiveObject(newGroup)
  canvas.renderAll()
  return newGroup
}
