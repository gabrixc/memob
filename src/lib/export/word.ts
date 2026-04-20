import { Document, Paragraph, TextRun, Packer } from 'docx'

export interface TextElement { type: 'text'; text: string; fontSize: number; bold: boolean }
export type DocElement = TextElement

export function canvasJsonToDocElements(canvasJson: Record<string, unknown>): DocElement[] {
  const objects = (canvasJson.objects as Record<string, unknown>[]) ?? []
  return objects
    .filter(o => o.type === 'i-text' || o.type === 'textbox')
    .map(o => ({
      type: 'text' as const,
      text: String(o.text ?? ''),
      fontSize: Number(o.fontSize ?? 12),
      bold: o.fontWeight === 'bold',
    }))
}

export async function buildDocx(elements: DocElement[]): Promise<Buffer> {
  const paragraphs = elements.map(el =>
    new Paragraph({
      children: [new TextRun({ text: el.text, size: el.fontSize * 2, bold: el.bold })],
    })
  )
  const doc = new Document({ sections: [{ children: paragraphs }] })
  return Buffer.from(await Packer.toBuffer(doc))
}
