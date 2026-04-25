import { computeBoundingBox, computeAlignedPosition, type ObjectBounds } from '@/lib/canvas/alignObjects'

const objs: ObjectBounds[] = [
  { left: 10,  top: 20,  width: 80,  height: 40 },
  { left: 150, top: 60,  width: 100, height: 60 },
  { left: 50,  top: 10,  width: 60,  height: 30 },
]

describe('computeBoundingBox', () => {
  it('returns correct overall bounding box', () => {
    const bb = computeBoundingBox(objs)
    expect(bb.left).toBe(10)
    expect(bb.top).toBe(10)
    expect(bb.width).toBe(240)   // max right 250 - min left 10
    expect(bb.height).toBe(110)  // max bottom 120 - min top 10
  })
  it('handles single object', () => {
    const bb = computeBoundingBox([{ left: 5, top: 15, width: 100, height: 50 }])
    expect(bb).toEqual({ left: 5, top: 15, width: 100, height: 50 })
  })
  it('throws for empty array', () => {
    expect(() => computeBoundingBox([])).toThrow('computeBoundingBox requires at least one object')
  })
})

describe('computeAlignedPosition', () => {
  const bbox = computeBoundingBox(objs) // { left:10, top:10, width:240, height:110 }
  const obj  = objs[0]                  // { left:10, top:20, width:80, height:40 }

  it('align left', ()    => expect(computeAlignedPosition(obj, bbox, 'left')).toEqual({ left: 10 }))
  it('align right', ()   => expect(computeAlignedPosition(obj, bbox, 'right')).toEqual({ left: 170 }))  // 10+240-80
  it('align top', ()     => expect(computeAlignedPosition(obj, bbox, 'top')).toEqual({ top: 10 }))
  it('align bottom', ()  => expect(computeAlignedPosition(obj, bbox, 'bottom')).toEqual({ top: 80 }))   // 10+110-40
  it('center H', ()      => expect(computeAlignedPosition(obj, bbox, 'centerH')).toEqual({ left: 90 })) // 10+120-40
  it('center V', ()      => expect(computeAlignedPosition(obj, bbox, 'centerV')).toEqual({ top: 45 }))  // 10+55-20
})
