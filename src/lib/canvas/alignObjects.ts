export type AlignMode = 'left' | 'right' | 'top' | 'bottom' | 'centerH' | 'centerV'

export interface ObjectBounds {
  left:   number
  top:    number
  width:  number
  height: number
}

export interface AlignResult { left?: number; top?: number }

export function computeBoundingBox(objects: ObjectBounds[]): ObjectBounds {
  if (objects.length === 0) throw new Error('computeBoundingBox requires at least one object')
  const minLeft   = Math.min(...objects.map(o => o.left))
  const minTop    = Math.min(...objects.map(o => o.top))
  const maxRight  = Math.max(...objects.map(o => o.left + o.width))
  const maxBottom = Math.max(...objects.map(o => o.top  + o.height))
  return { left: minLeft, top: minTop, width: maxRight - minLeft, height: maxBottom - minTop }
}

export function computeAlignedPosition(obj: ObjectBounds, bbox: ObjectBounds, mode: AlignMode): AlignResult {
  switch (mode) {
    case 'left':    return { left: bbox.left }
    case 'right':   return { left: bbox.left + bbox.width  - obj.width }
    case 'top':     return { top:  bbox.top }
    case 'bottom':  return { top:  bbox.top  + bbox.height - obj.height }
    case 'centerH': return { left: bbox.left + bbox.width  / 2 - obj.width  / 2 }
    case 'centerV': return { top:  bbox.top  + bbox.height / 2 - obj.height / 2 }
  }
}
