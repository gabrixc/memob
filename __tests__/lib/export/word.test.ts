/** @jest-environment node */
import { buildDocx, canvasJsonToDocElements } from '@/lib/export/word'

describe('canvasJsonToDocElements', () => {
  it('extracts text elements from canvas JSON', () => {
    const json = {
      objects: [
        { type: 'i-text', text: 'Hello World', fontSize: 14, fontWeight: 'normal' },
        { type: 'rect', fill: '#fff' },
      ]
    }
    const elements = canvasJsonToDocElements(json)
    expect(elements).toHaveLength(1)
    expect(elements[0].text).toBe('Hello World')
    expect(elements[0].fontSize).toBe(14)
  })
})

describe('buildDocx', () => {
  it('returns a non-empty Buffer', async () => {
    const buf = await buildDocx([{ type: 'text', text: 'Test', fontSize: 12, bold: false }])
    expect(buf).toBeInstanceOf(Buffer)
    expect(buf.length).toBeGreaterThan(0)
  })
})
