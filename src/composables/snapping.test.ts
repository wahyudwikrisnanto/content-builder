import { describe, expect, it } from 'vitest'
import { translateGuides } from './snapping'

describe('translateGuides', () => {
  it('shifts x-axis guide pos by originX and start/end by originY', () => {
    const guides = translateGuides([{ axis: 'x', pos: 400, start: 0, end: 300 }], 60, 60)
    expect(guides).toEqual([{ axis: 'x', pos: 460, start: 60, end: 360 }])
  })

  it('shifts y-axis guide pos by originY and start/end by originX', () => {
    const guides = translateGuides([{ axis: 'y', pos: 260, start: 20, end: 380 }], 60, 60)
    expect(guides).toEqual([{ axis: 'y', pos: 320, start: 80, end: 440 }])
  })

  it('is a no-op at canvas origin', () => {
    const guides = translateGuides([{ axis: 'x', pos: 400, start: 0, end: 300 }], 0, 0)
    expect(guides).toEqual([{ axis: 'x', pos: 400, start: 0, end: 300 }])
  })
})
