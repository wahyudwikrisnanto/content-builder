import type { CmsElement } from '../types'

export interface BBox {
  x: number
  y: number
  width: number
  height: number
}

export function clampPos(
  b: BBox,
  canvasW: number,
  canvasH: number,
  flexibleHeight: boolean,
): { x: number; y: number } {
  const maxX = Math.max(0, canvasW - b.width)
  const x = Math.min(maxX, Math.max(0, b.x))
  if (flexibleHeight) return { x, y: Math.max(0, b.y) }
  const maxY = Math.max(0, canvasH - b.height)
  const y = Math.min(maxY, Math.max(0, b.y))
  return { x, y }
}

export function clampSize(
  b: BBox,
  canvasW: number,
  canvasH: number,
  flexibleHeight: boolean,
): BBox {
  const width = Math.min(b.width, canvasW)
  const height = flexibleHeight ? b.height : Math.min(b.height, canvasH)
  const x = Math.min(Math.max(0, b.x), canvasW - width)
  const y = flexibleHeight ? Math.max(0, b.y) : Math.min(Math.max(0, b.y), canvasH - height)
  return { x, y, width, height }
}

export function maxElementBottom(elements: CmsElement[]): number {
  let m = 0
  for (const e of elements) {
    if (!e.visible || e.parentId) continue
    const b = e.y + e.height
    if (b > m) m = b
  }
  return m
}
