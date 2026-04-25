// __tests__/lib/canvas/tableBuilder.test.ts
import { buildTableGroup }    from '@/lib/canvas/tableBuilder'
import { defaultTableConfig } from '@/lib/canvas/tableConfig'

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue({
    fillRect: jest.fn(), clearRect: jest.fn(), getImageData: jest.fn(() => ({ data: [] })),
    putImageData: jest.fn(), createImageData: jest.fn(() => []),
    setTransform: jest.fn(), drawImage: jest.fn(), save: jest.fn(), restore: jest.fn(),
    scale: jest.fn(), rotate: jest.fn(), translate: jest.fn(), transform: jest.fn(),
    beginPath: jest.fn(), moveTo: jest.fn(), lineTo: jest.fn(), closePath: jest.fn(),
    stroke: jest.fn(), fill: jest.fn(), arc: jest.fn(), measureText: jest.fn(() => ({ width: 0 })),
    rect: jest.fn(), clip: jest.fn(),
  })
})

describe('buildTableGroup', () => {
  it('creates correct object count for 3 cols × 2 data rows', () => {
    const group = buildTableGroup(defaultTableConfig(3, 2))
    // 1 outer border + (3 rows × 3 cols × 2 objects [rect+text]) = 19
    expect(group.getObjects().length).toBe(19)
  })

  it('omits outer border rect when showOuter is false', () => {
    const config = { ...defaultTableConfig(2, 1), borderStyle: { showInner: true, showOuter: false, borderColor: '#000', borderWeight: 1 } }
    expect(buildTableGroup(config).getObjects().length).toBe(8)
  })

  it('stores config in group.data', () => {
    const config = defaultTableConfig(2, 3)
    const group = buildTableGroup(config)
    const data = (group as unknown as { data: { type: string; config: typeof config } }).data
    expect(data.type).toBe('table')
    expect(data.config.cols).toBe(2)
  })

  it('uses config.headers for header row text', () => {
    const config = { ...defaultTableConfig(2, 1), headers: ['Name', 'Score'] }
    const texts = buildTableGroup(config).getObjects()
      .filter(o => o.type === 'i-text') as import('fabric').IText[]
    expect(texts[0].text).toBe('Name')
    expect(texts[1].text).toBe('Score')
  })

  it('uses cellData for data rows', () => {
    const config = { ...defaultTableConfig(2, 1), cellData: [['{{name}}', '{{score}}']] }
    const texts = buildTableGroup(config).getObjects()
      .filter(o => o.type === 'i-text') as import('fabric').IText[]
    expect(texts[2].text).toBe('{{name}}')
    expect(texts[3].text).toBe('{{score}}')
  })
})

describe('defaultTableConfig', () => {
  it('generates cellData matching cols × rows', () => {
    const cfg = defaultTableConfig(4, 3)
    expect(cfg.cellData.length).toBe(3)
    expect(cfg.cellData[0].length).toBe(4)
  })
})
