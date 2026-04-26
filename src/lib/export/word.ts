import {
  Document, Paragraph, TextRun, Packer, PageBreak, TabStopType,
  ImageRun, HorizontalPositionRelativeFrom, VerticalPositionRelativeFrom, TextWrappingType,
  AlignmentType, LineRuleType,
} from 'docx'

// 1 CSS pixel (at 96 DPI) → EMU
const PX_TO_EMU = 9525

interface CanvasObj {
  type?: unknown; text?: unknown; fontSize?: unknown; fontWeight?: unknown
  top?: unknown; left?: unknown; scaleX?: unknown; scaleY?: unknown
  width?: unknown; height?: unknown; src?: unknown
  fontFamily?: unknown; fill?: unknown; fontStyle?: unknown
  underline?: unknown; textAlign?: unknown; lineHeight?: unknown
  data?: {
    textTransform?: string
    numbering?: 'none' | 'alpha' | 'outline'
    level?: number
    indent?: number
    tabStop?: number
    [key: string]: unknown
  }
}

export interface TextItem {
  text: string; fontSize: number; bold: boolean; italic: boolean
  underline: boolean; color: string; fontFamily: string
  textAlign: string; lineHeight: number; left: number
  numbering: 'none' | 'alpha' | 'outline'
  level: number
  indent: number
  tabStop: number
}
interface RowElement { type: 'row'; items: TextItem[] }
interface ImgElement { type: 'image'; src: string; imgType: 'png' | 'jpg' | 'gif'; top: number; left: number; w: number; h: number }
interface BreakElement { type: 'pagebreak' }
export type DocElement = RowElement | ImgElement | BreakElement

function applyTransform(text: string, transform?: string): string {
  if (transform === 'uppercase') return text.toUpperCase()
  if (transform === 'lowercase') return text.toLowerCase()
  if (transform === 'capitalize') return text.replace(/\b\w/g, c => c.toUpperCase())
  return text
}

const alignmentMap = {
  left:    AlignmentType.LEFT,
  center:  AlignmentType.CENTER,
  right:   AlignmentType.RIGHT,
  justify: AlignmentType.JUSTIFIED,
} as const

function collectPages(canvasJson: Record<string, unknown>): Record<string, unknown>[][] {
  if (Array.isArray(canvasJson.pages)) {
    return (canvasJson.pages as Record<string, unknown>[])
      .map(pg => (pg.objects as Record<string, unknown>[]) ?? [])
  }
  return [(canvasJson.objects as Record<string, unknown>[]) ?? []]
}

function isTextType(type: unknown): boolean {
  const t = String(type ?? '').toLowerCase().replace(/-/g, '')
  return t === 'itext' || t === 'textbox'
}

function isImageType(type: unknown): boolean {
  return String(type ?? '').toLowerCase() === 'image'
}

function mimeToDocxType(src: string): 'png' | 'jpg' | 'gif' {
  if (src.includes('image/jpeg') || src.includes('image/jpg')) return 'jpg'
  if (src.includes('image/gif')) return 'gif'
  return 'png'
}

export function canvasJsonToDocElements(canvasJson: Record<string, unknown>): DocElement[] {
  const pages = collectPages(canvasJson)
  const result: DocElement[] = []

  pages.forEach((pageObjs, pageIdx) => {
    if (pageIdx > 0) result.push({ type: 'pagebreak' })

    const objs = pageObjs as unknown as CanvasObj[]

    // Collect images as floating elements
    for (const o of objs) {
      if (!isImageType(o.type)) continue
      const src = String(o.src ?? '')
      if (!src.startsWith('data:')) continue
      const scaleX = Number(o.scaleX ?? 1)
      const scaleY = Number(o.scaleY ?? 1)
      result.push({
        type: 'image',
        src,
        imgType: mimeToDocxType(src),
        top: Number(o.top ?? 0),
        left: Number(o.left ?? 0),
        w: Math.round(Number(o.width ?? 0) * scaleX),
        h: Math.round(Number(o.height ?? 0) * scaleY),
      })
    }

    // Collect and sort text objects into rows
    const textObjs = objs
      .filter(o => isTextType(o.type))
      .map(o => ({
        text: applyTransform(String(o.text ?? ''), o.data?.textTransform),
        fontSize: Number(o.fontSize ?? 12) * Number(o.scaleX ?? 1),
        bold: o.fontWeight === 'bold',
        italic: String(o.fontStyle ?? '') === 'italic',
        underline: o.underline === true,
        color: String(o.fill ?? '').replace('#', ''),
        fontFamily: String(o.fontFamily ?? '').split(',')[0].trim(),
        textAlign: String(o.textAlign ?? 'left'),
        lineHeight: Number(o.lineHeight ?? 1.15),
        top: Number(o.top ?? 0),
        left: Number(o.left ?? 0),
        numbering: (o.data?.numbering ?? 'none') as 'none' | 'alpha' | 'outline',
        level:     Number(o.data?.level   ?? 1),
        indent:    Number(o.data?.indent  ?? 0),
        tabStop:   Number(o.data?.tabStop ?? 0),
      }))
      .sort((a, b) => a.top - b.top)

    const rows: (typeof textObjs)[] = []
    for (const obj of textObjs) {
      const lastRow = rows[rows.length - 1]
      if (lastRow && Math.abs(obj.top - lastRow[0].top) <= 6) {
        lastRow.push(obj)
      } else {
        rows.push([obj])
      }
    }

    for (const row of rows) {
      row.sort((a, b) => a.left - b.left)
      result.push({
        type: 'row',
        items: row.map(o => ({
          text: o.text, fontSize: o.fontSize, bold: o.bold,
          italic: o.italic, underline: o.underline, color: o.color,
          fontFamily: o.fontFamily, textAlign: o.textAlign, lineHeight: o.lineHeight,
          left: o.left,
          numbering: o.numbering,
          level:     o.level,
          indent:    o.indent,
          tabStop:   o.tabStop,
        })),
      })
    }
  })

  return result
}

function base64FromDataUrl(src: string): string {
  return src.replace(/^data:[^;]+;base64,/, '')
}

export async function buildDocx(elements: DocElement[]): Promise<Buffer> {
  const paragraphs: Paragraph[] = []

  // Collect floating images to anchor on the first paragraph of each "page section"
  const pendingImages: ImgElement[] = []

  function flushImages(): ImageRun[] {
    const runs = pendingImages.map(img =>
      new ImageRun({
        data: Buffer.from(base64FromDataUrl(img.src), 'base64'),
        transformation: { width: img.w, height: img.h },
        type: img.imgType,
        floating: {
          horizontalPosition: {
            relative: HorizontalPositionRelativeFrom.PAGE,
            offset: img.left * PX_TO_EMU,
          },
          verticalPosition: {
            relative: VerticalPositionRelativeFrom.PAGE,
            offset: img.top * PX_TO_EMU,
          },
          wrap: { type: TextWrappingType.NONE },
          zIndex: 1,
          allowOverlap: true,
        },
      })
    )
    pendingImages.length = 0
    return runs
  }

  for (const el of elements) {
    if (el.type === 'image') {
      pendingImages.push(el)
      continue
    }

    if (el.type === 'pagebreak') {
      paragraphs.push(new Paragraph({ children: [new PageBreak()] }))
      continue
    }

    // First text row after images: attach the floating image runs to this paragraph
    const imageRuns = pendingImages.length ? flushImages() : []

    const makeRun = (item: TextItem, text: string) => new TextRun({
      text,
      size: Math.round(item.fontSize * 2),
      bold: item.bold,
      italics: item.italic,
      underline: item.underline ? {} : undefined,
      color: item.color || undefined,
      font: item.fontFamily ? { name: item.fontFamily } : undefined,
    })

    const paraProps = (item: TextItem) => ({
      alignment: (alignmentMap as Record<string, typeof AlignmentType[keyof typeof AlignmentType]>)[item.textAlign] ?? AlignmentType.LEFT,
      spacing: { line: Math.round((item.lineHeight || 1.15) * 240), lineRule: LineRuleType.AUTO },
    })

    if (el.items.length === 1) {
      const item = el.items[0]
      const lines = item.text.split('\n')
      lines.forEach((line, i) => {
        paragraphs.push(new Paragraph({
          ...paraProps(item),
          children: [
            ...(i === 0 ? imageRuns : []),
            makeRun(item, line),
          ],
        }))
      })
      continue
    }

    // Multi-column row: use \n as soft line breaks within the same paragraph
    // to preserve tab stop column alignment across wrapped lines
    const tabTwips = Math.round((el.items[1].left - el.items[0].left) * 15)
    const runs: TextRun[] = []
    el.items.forEach((item, i) => {
      if (i > 0) runs.push(new TextRun({ text: '\t' }))
      const lines = item.text.split('\n')
      lines.forEach((line, li) => {
        if (li > 0) runs.push(new TextRun({ break: 1 }))
        runs.push(makeRun(item, line))
      })
    })
    paragraphs.push(new Paragraph({
      ...paraProps(el.items[0]),
      tabStops: [{ type: TabStopType.LEFT, position: tabTwips }],
      children: [...imageRuns, ...runs],
    }))
  }

  const doc = new Document({
    sections: [{
      properties: {
        page: { margin: { top: 720, bottom: 720, left: 1080, right: 720 } },
      },
      children: paragraphs,
    }],
  })
  return Buffer.from(await Packer.toBuffer(doc))
}
