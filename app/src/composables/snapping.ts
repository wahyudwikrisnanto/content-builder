import type { CmsElement, Guide, GuideAxis } from '../types'

export const SNAP_THRESHOLD = 6

interface EdgeSet {
  /** x-axis lines (vertical guides): left, centerX, right */
  vx: number[]
  /** y-axis lines (horizontal guides): top, centerY, bottom */
  vy: number[]
}

function elEdges(el: { x: number; y: number; width: number; height: number }): EdgeSet {
  return {
    vx: [el.x, el.x + el.width / 2, el.x + el.width],
    vy: [el.y, el.y + el.height / 2, el.y + el.height],
  }
}

function canvasEdges(w: number, h: number): EdgeSet {
  return {
    vx: [0, w / 2, w],
    vy: [0, h / 2, h],
  }
}

interface SnapResult {
  x: number
  y: number
  guides: Guide[]
}

/**
 * Snap moving element bbox to canvas + sibling element edges/centers.
 * Threshold is in canvas units (divide screen pixels by zoom before calling).
 */
export function computeSnap(
  moving: { x: number; y: number; width: number; height: number },
  siblings: CmsElement[],
  canvasWidth: number,
  canvasHeight: number,
  threshold = SNAP_THRESHOLD,
  parentBox?: { x: number; y: number; width: number; height: number },
): SnapResult {
  const me = elEdges(moving)
  const targets: { edges: EdgeSet; bbox: { x: number; y: number; width: number; height: number } }[] = [
    { edges: canvasEdges(canvasWidth, canvasHeight), bbox: { x: 0, y: 0, width: canvasWidth, height: canvasHeight } },
    ...siblings.map(s => ({ edges: elEdges(s), bbox: { x: s.x, y: s.y, width: s.width, height: s.height } })),
  ]
  // Snap to parent frame's inner padding box (edges + centers)
  if (parentBox) {
    targets.push({ edges: elEdges(parentBox), bbox: parentBox })
  }

  let dx = 0, dy = 0
  let bestX = threshold + 1, bestY = threshold + 1
  const guides: Guide[] = []

  // x-axis (vertical guide lines): match my left/centerX/right against each target
  for (const t of targets) {
    for (const tx of t.edges.vx) {
      for (let i = 0; i < me.vx.length; i++) {
        const d = tx - me.vx[i]
        const abs = Math.abs(d)
        if (abs <= threshold && abs < bestX) { bestX = abs; dx = d }
      }
    }
    for (const ty of t.edges.vy) {
      for (let i = 0; i < me.vy.length; i++) {
        const d = ty - me.vy[i]
        const abs = Math.abs(d)
        if (abs <= threshold && abs < bestY) { bestY = abs; dy = d }
      }
    }
  }

  const nx = moving.x + dx
  const ny = moving.y + dy
  const snapped = { x: nx, y: ny, width: moving.width, height: moving.height }
  const snappedE = elEdges(snapped)

  // Build guides where snapped edges align to targets (exact equality after snap)
  for (const t of targets) {
    for (const tx of t.edges.vx) {
      for (const myx of snappedE.vx) {
        if (Math.abs(tx - myx) < 0.5) {
          const start = Math.min(snapped.y, t.bbox.y)
          const end = Math.max(snapped.y + snapped.height, t.bbox.y + t.bbox.height)
          guides.push({ axis: 'x', pos: tx, start, end })
        }
      }
    }
    for (const ty of t.edges.vy) {
      for (const myy of snappedE.vy) {
        if (Math.abs(ty - myy) < 0.5) {
          const start = Math.min(snapped.x, t.bbox.x)
          const end = Math.max(snapped.x + snapped.width, t.bbox.x + t.bbox.width)
          guides.push({ axis: 'y', pos: ty, start, end })
        }
      }
    }
  }

  return { x: nx, y: ny, guides: dedupeGuides(guides) }
}

function dedupeGuides(gs: Guide[]): Guide[] {
  const seen = new Map<string, Guide>()
  for (const g of gs) {
    const key = `${g.axis}:${Math.round(g.pos * 10) / 10}`
    const prev = seen.get(key)
    if (!prev) seen.set(key, g)
    else seen.set(key, {
      axis: g.axis, pos: g.pos,
      start: Math.min(prev.start, g.start),
      end: Math.max(prev.end, g.end),
    })
  }
  return [...seen.values()]
}

export type { Guide, GuideAxis }
