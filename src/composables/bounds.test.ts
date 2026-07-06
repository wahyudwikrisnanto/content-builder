import { describe, it, expect } from 'vitest'
import { clampPos, clampSize } from './bounds'

describe('clampPos', () => {
  it('keeps position within canvas bounds', () => {
    expect(clampPos({ x: -10, y: -10, width: 50, height: 50 }, 200, 200, false)).toEqual({
      x: 0,
      y: 0,
    })
  })

  it('clamps against max when flexibleHeight is false', () => {
    expect(clampPos({ x: 190, y: 190, width: 50, height: 50 }, 200, 200, false)).toEqual({
      x: 150,
      y: 150,
    })
  })
})

describe('clampSize', () => {
  it('shrinks size to fit within canvas', () => {
    expect(clampSize({ x: 0, y: 0, width: 300, height: 300 }, 200, 200, false)).toEqual({
      x: 0,
      y: 0,
      width: 200,
      height: 200,
    })
  })
})
