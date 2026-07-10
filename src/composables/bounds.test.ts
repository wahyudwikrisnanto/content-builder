import { describe, it, expect } from 'vitest'
import type { CmsElement } from '../types'
import { clampPos, clampSize, maxElementBottom } from './bounds'

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

describe('maxElementBottom', () => {
  it('ignores nested children — their y is frame-local, not canvas-comparable', () => {
    const elements = [
      { id: 'root', parentId: null, x: 0, y: 0, width: 10, height: 50, visible: true } as CmsElement,
      { id: 'child', parentId: 'frame-1', x: 0, y: 900, width: 10, height: 20, visible: true } as CmsElement,
    ]
    expect(maxElementBottom(elements)).toBe(50)
  })
})
