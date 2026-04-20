import { snapToGrid } from '@/lib/canvas/snap'

describe('snapToGrid', () => {
  it('snaps to nearest grid boundary', () => {
    expect(snapToGrid(13, 8)).toBe(16)
    expect(snapToGrid(11, 8)).toBe(8)
    expect(snapToGrid(0, 8)).toBe(0)
    expect(snapToGrid(8, 8)).toBe(8)
  })
  it('works with any grid size', () => {
    expect(snapToGrid(14, 10)).toBe(10)
    expect(snapToGrid(16, 10)).toBe(20)
  })
})
