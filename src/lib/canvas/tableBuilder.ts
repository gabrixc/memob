// src/lib/canvas/tableBuilder.ts
import { Rect, IText, Group, type Canvas as FabricCanvas } from 'fabric'
import type { TableConfig } from './tableConfig'

const CW = 80
const CH = 28

export function buildTableGroup(config: TableConfig): Group {
  const { headers, cols, rows, cellData, borderStyle } = config
  const totalRows = rows + 1
  const objects: (Rect | IText)[] = []

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
      objects.push(new Rect({
        left:   c * CW,  top: r * CH,
        width:  CW,      height: CH,
        fill:   isHeader ? '#f8fafc' : '#ffffff',
        stroke:      borderStyle.showInner ? borderStyle.borderColor : 'transparent',
        strokeWidth: borderStyle.showInner ? borderStyle.borderWeight : 0,
        selectable: false, evented: false,
      }))
      objects.push(new IText(isHeader ? (headers[c] ?? `Col ${c + 1}`) : (cellData[r - 1]?.[c] ?? ''), {
        left: c * CW + 4, top: r * CH + 6,
        fontSize: 10, fontFamily: 'Inter, sans-serif', fill: '#475569',
        width: CW - 8,
        selectable: false, evented: false,
      }))
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
