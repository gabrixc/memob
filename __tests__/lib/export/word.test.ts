/** @jest-environment node */
import { buildDocx, canvasJsonToDocElements, DocElement, type TextItem } from '@/lib/export/word'

describe('canvasJsonToDocElements', () => {
  it('extracts text elements from canvas JSON (pages format)', () => {
    const json = {
      pages: [
        {
          objects: [
            { type: 'IText', text: 'Hello World', fontSize: 14, fontWeight: 'normal', top: 0, left: 0, scaleX: 1 },
            { type: 'Rect', fill: '#fff', top: 100, left: 0 },
          ]
        }
      ]
    }
    const elements = canvasJsonToDocElements(json)
    const rows = elements.filter(e => e.type === 'row')
    expect(rows).toHaveLength(1)
    expect(rows[0].type).toBe('row')
    expect(rows[0].items[0].text).toBe('Hello World')
    expect(rows[0].items[0].fontSize).toBe(14)
  })

  it('inserts page breaks between pages', () => {
    const json = {
      pages: [
        { objects: [{ type: 'IText', text: 'Page 1', fontSize: 12, top: 0, left: 0, scaleX: 1 }] },
        { objects: [{ type: 'IText', text: 'Page 2', fontSize: 12, top: 0, left: 0, scaleX: 1 }] },
      ]
    }
    const elements = canvasJsonToDocElements(json)
    const breaks = elements.filter(e => e.type === 'pagebreak')
    expect(breaks).toHaveLength(1)
  })
})

describe('canvasJsonToDocElements – newline splitting', () => {
  it('splits multiline Textbox text into separate row elements', () => {
    const json = {
      objects: [
        { type: 'Textbox', text: 'Line one\nLine two\nLine three', fontSize: 12, top: 0, left: 0, scaleX: 1 },
      ]
    }
    const elements = canvasJsonToDocElements(json)
    // The single Textbox is still one RowElement; newline splitting happens in buildDocx
    const rows = elements.filter(e => e.type === 'row')
    expect(rows).toHaveLength(1)
    expect(rows[0].items[0].text).toBe('Line one\nLine two\nLine three')
  })
})

describe('buildDocx', () => {
  it('returns a non-empty Buffer', async () => {
    const buf = await buildDocx([
      { type: 'row', items: [{ text: 'Test', fontSize: 12, bold: false, italic: false, underline: false, color: '', fontFamily: '', textAlign: 'left', lineHeight: 1.15, left: 0, numbering: 'none', level: 1, indent: 0, tabStop: 0 }] },
    ])
    expect(buf).toBeInstanceOf(Buffer)
    expect(buf.length).toBeGreaterThan(0)
  })
})

describe('canvasJsonToDocElements – numbering/indent extraction', () => {
  it('extracts numbering fields from paragraph data', () => {
    const json = {
      objects: [
        {
          type: 'Textbox',
          text: 'a) First item',
          fontSize: 12,
          top: 0,
          left: 0,
          scaleX: 1,
          data: { type: 'paragraph', numbering: 'alpha', level: 2, indent: 72, tabStop: 36 },
        },
      ],
    }
    const elements = canvasJsonToDocElements(json)
    const row = elements.find(e => e.type === 'row') as Extract<typeof elements[0], { type: 'row' }>
    expect(row.items[0].numbering).toBe('alpha')
    expect(row.items[0].level).toBe(2)
    expect(row.items[0].indent).toBe(72)
    expect(row.items[0].tabStop).toBe(36)
  })

  it('defaults numbering fields when data is absent', () => {
    const json = {
      objects: [
        { type: 'IText', text: 'Hello', fontSize: 12, top: 0, left: 0, scaleX: 1 },
      ],
    }
    const elements = canvasJsonToDocElements(json)
    const row = elements.find(e => e.type === 'row') as Extract<typeof elements[0], { type: 'row' }>
    expect(row.items[0].numbering).toBe('none')
    expect(row.items[0].level).toBe(1)
    expect(row.items[0].indent).toBe(0)
    expect(row.items[0].tabStop).toBe(0)
  })
})

describe('buildDocx – indent and tabStop', () => {
  const makeItem = (overrides: Partial<TextItem> = {}): TextItem => ({
    text: 'a) First item', fontSize: 12, bold: false, italic: false,
    underline: false, color: '', fontFamily: '', textAlign: 'left',
    lineHeight: 1.15, left: 0, numbering: 'none', level: 1,
    indent: 0, tabStop: 0, ...overrides,
  })

  it('produces a non-empty buffer with indent and tabStop set', async () => {
    const buf = await buildDocx([
      { type: 'row', items: [makeItem({ indent: 72, tabStop: 36 })] },
    ])
    expect(buf).toBeInstanceOf(Buffer)
    expect(buf.length).toBeGreaterThan(0)
  })

  it('produces a non-empty buffer with alpha numbering', async () => {
    const buf = await buildDocx([
      { type: 'row', items: [makeItem({ numbering: 'alpha', level: 1, indent: 36, tabStop: 36 })] },
    ])
    expect(buf).toBeInstanceOf(Buffer)
    expect(buf.length).toBeGreaterThan(0)
  })

  it('produces a non-empty buffer with outline numbering at level 2', async () => {
    const buf = await buildDocx([
      { type: 'row', items: [makeItem({ numbering: 'outline', level: 2, indent: 72, tabStop: 36 })] },
    ])
    expect(buf).toBeInstanceOf(Buffer)
    expect(buf.length).toBeGreaterThan(0)
  })
})
