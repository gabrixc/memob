// src/lib/canvas/tableBuilder.ts
import { Rect, IText, Textbox, Group, type Canvas as FabricCanvas } from 'fabric'
import type { TableConfig, CellStyle } from './tableConfig'

const CW = 80
const CH = 28

function applyTextTransform(text: string, transform?: CellStyle['textTransform']): string {
  if (!transform || transform === 'none') return text
  if (transform === 'uppercase') return text.toUpperCase()
  if (transform === 'lowercase') return text.toLowerCase()
  return text.replace(/\b\w/g, c => c.toUpperCase()) // capitalize
}

function verticalTop(r: number, verticalAlign?: CellStyle['verticalAlign']): number {
  const LINE_H = 12 // approximate line height for fontSize 10
  if (!verticalAlign || verticalAlign === 'top') return r * CH + 4
  if (verticalAlign === 'middle') return r * CH + Math.round((CH - LINE_H) / 2)
  return r * CH + CH - LINE_H - 2 // bottom
}

export function buildTableGroup(config: TableConfig): Group {
  const { headers, cols, rows, cellData, borderStyle } = config
  const totalRows = rows + 1
  const objects: (Rect | IText | Textbox)[] = []

  if (borderStyle.showOuter) {
    objects.push(new Rect({
      left: 0, top: 0,
      width: cols * CW, height: totalRows * CH,
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

      objects.push(new Rect({
        left:        c * CW, top: r * CH,
        width:       CW,     height: CH,
        fill:        isHeader ? '#f8fafc' : '#ffffff',
        stroke:      borderStyle.showInner ? borderStyle.borderColor : 'transparent',
        strokeWidth: borderStyle.showInner ? borderStyle.borderWeight : 0,
        selectable: false, evented: false,
      }))

      const rawText = isHeader
        ? (headers[c] ?? `Col ${c + 1}`)
        : (cellData[r - 1]?.[c] ?? '')
      const text = applyTextTransform(rawText, style.textTransform)
      const top  = verticalTop(r, style.verticalAlign)

      const commonProps = {
        left:       c * CW + 4,
        top,
        fontSize:   10,
        fontFamily: 'Inter, sans-serif',
        fill:       style.color ?? '#475569',
        fontWeight: style.fontWeight ?? 'normal',
        textAlign:  style.textAlign ?? 'left',
        width:      CW - 8,
        selectable: false,
        evented:    false,
      }

      objects.push(
        style.wrap
          ? new Textbox(text, commonProps)
          : new IText(text, commonProps)
      )
    }
  }

  return new Group(objects, {
    data: { type: 'table', cols, rows, config },
  } as unknown as ConstructorParameters<typeof Group>[1])
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
