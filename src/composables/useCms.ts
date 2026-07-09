import { reactive, computed } from 'vue'
import { cmsUid, cloneEl } from './factories'
import { clampPos, clampSize, maxElementBottom } from './bounds'
import { renderCKEditorHtml } from './renderCKEditor'
import { parseCKEditorHtml } from './importCKEditor'
import type { CmsElement, CmsState, ElementStyles, Guide, SidebarTab } from '../types'

const HISTORY_MAX = 49

const state = reactive<CmsState>({
  elements: [],
  selectedId: null,
  selectedIds: [],
  editingTextId: null,
  allSelected: false,
  canvasWidth: 800,
  canvasHeight: 1100,
  zoom: 1,
  sidebarTab: 'elements',
  history: [],
  future: [],
  guides: [],
  fullscreen: false,
  flexibleHeight: false,
  preview: false,
  previewFullscreen: false,
  sidebarHidden: false,
})

function snapshot(): void {
  state.history.push(cloneEl(state.elements))
  if (state.history.length > HISTORY_MAX) state.history.shift()
  state.future = []
}

const findIdx = (id: string): number => state.elements.findIndex((e) => e.id === id)

function collectDescendantIds(parentId: string, elements: CmsElement[]): string[] {
  const out: string[] = []
  const stack = [parentId]
  while (stack.length) {
    const p = stack.pop()!
    for (const e of elements) {
      if (e.parentId === p) {
        out.push(e.id)
        stack.push(e.id)
      }
    }
  }
  return out
}

function absolutePosition(el: CmsElement): { x: number; y: number } {
  let x = 0,
    y = 0
  let cur: CmsElement | undefined = el
  while (cur) {
    x += cur.x
    y += cur.y
    cur = cur.parentId ? state.elements.find((e) => e.id === cur!.parentId) : undefined
  }
  return { x, y }
}

/**
 * Return the containing box for `el` — parent frame's padding zone, or canvas bounds.
 */
function parentBox(el: CmsElement): { x: number; y: number; width: number; height: number } {
  if (el.parentId) {
    const parent = state.elements.find((e) => e.id === el.parentId)
    if (parent?.type === 'frame') return framePaddingBox(parent)
  }
  const h = state.flexibleHeight
    ? Math.max(state.canvasHeight, maxElementBottom(state.elements) + 40)
    : state.canvasHeight
  return { x: 0, y: 0, width: state.canvasWidth, height: h }
}

/**
 * Compute the frame's inner padding box (where children may be placed).
 */
function framePaddingBox(frame: CmsElement): {
  x: number
  y: number
  width: number
  height: number
} {
  const p = sidePad(frame)
  return {
    x: p.l,
    y: p.t,
    width: Math.max(0, frame.width - p.l - p.r),
    height: Math.max(0, frame.height - p.t - p.b),
  }
}

/**
 * Clamp `bbox` so it stays inside its parent frame's padding box.
 * Returns { x, y } only (does not resize).
 */
function clampInsideParent(
  el: CmsElement,
  proposed: { x: number; y: number },
): { x: number; y: number } {
  if (!el.parentId) return proposed
  const parent = state.elements.find((e) => e.id === el.parentId)
  if (!parent || parent.type !== 'frame') return proposed
  const box = framePaddingBox(parent)
  if (box.width <= 0 || box.height <= 0) return proposed
  const minX = box.x
  const minY = box.y
  const maxX = box.x + box.width - el.width
  const maxY = box.y + box.height - el.height
  return {
    x: Math.min(Math.max(proposed.x, minX), Math.max(minX, maxX)),
    y: Math.min(Math.max(proposed.y, minY), Math.max(minY, maxY)),
  }
}

// Per-side padding resolver (unified — style padding wins, then per-side, no fallback)
function sidePad(frame: CmsElement): { t: number; r: number; b: number; l: number } {
  const s = frame.styles
  const base = s.padding
  return {
    t: s.paddingTop ?? base ?? 0,
    r: s.paddingRight ?? base ?? 0,
    b: s.paddingBottom ?? base ?? 0,
    l: s.paddingLeft ?? base ?? 0,
  }
}

/**
 * Text elements report height:0 until useAutoSize's ResizeObserver measures the mounted
 * DOM node (see useAutoSize.ts) — a brief but real window (e.g. right after creation, or
 * for elements never mounted). Stacking children by raw `child.height` during that window
 * packs them `layoutGap` apart with no allowance for the text's real content height,
 * producing visible overlap. Estimate it the same way importCKEditor.ts does so the frame
 * still reflows sensibly before the real measurement lands.
 */
function estimatedChildHeight(el: CmsElement): number {
  if (el.height > 0 || el.type !== 'text') return el.height
  const s = el.styles
  const lines = Math.max(1, (el.content || '').split('\n').length)
  return Math.ceil((s.fontSize ?? 16) * (s.lineHeight ?? 1.5) * lines + (s.padding ?? 0) * 2)
}

/**
 * Auto-layout: reposition (and stretch) direct children of a frame based on its layout config.
 * Children are placed vertically or horizontally with gap + per-side padding.
 * `skipGrow`: pass true when user manually resizes the frame so their size sticks.
 */
function reflowFrame(frameId: string, opts: { skipGrow?: boolean } = {}): void {
  const i = state.elements.findIndex((e) => e.id === frameId)
  if (i < 0) return

  const frame = state.elements[i]
  if (frame.type !== 'frame') return

  const dir = frame.layoutDirection ?? 'none'
  if (dir === 'none') return

  const gap = frame.layoutGap ?? 8
  const align = frame.layoutAlign ?? 'start'
  const pad = sidePad(frame)

  const order = new Map(state.elements.map((e, idx) => [e.id, idx]))
  const children = state.elements
    .filter((e) => e.parentId === frameId)
    .sort((a, b) => order.get(a.id)! - order.get(b.id)!)

  let cursor = dir === 'vertical' ? pad.t : pad.l
  const nextElements = [...state.elements]

  for (const child of children) {
    const idx = nextElements.findIndex((e) => e.id === child.id)
    if (idx < 0) continue

    let x: number, y: number
    let w = child.width
    let h = child.height

    if (dir === 'vertical') {
      y = cursor

      if (align === 'stretch') {
        x = pad.l
        w = Math.max(1, frame.width - pad.l - pad.r)
      } else if (align === 'center') {
        x = (frame.width - w) / 2
      } else if (align === 'end') {
        x = frame.width - pad.r - w
      } else {
        x = pad.l
      }

      cursor = y + estimatedChildHeight(child) + gap
    } else {
      x = cursor

      if (align === 'stretch') {
        y = pad.t
        h = Math.max(1, frame.height - pad.t - pad.b)
      } else if (align === 'center') {
        y = (frame.height - h) / 2
      } else if (align === 'end') {
        y = frame.height - pad.b - h
      } else {
        y = pad.t
      }

      cursor = x + w + gap
    }

    nextElements[idx] = { ...child, x, y, width: w, height: h }
  }

  if (frame.layoutGrow && !opts.skipGrow && children.length) {
    const contentEnd = cursor - gap

    let newW: number
    let newH: number

    if (dir === 'vertical') {
      newH = Math.max(1, contentEnd + pad.b)

      const rightMost = Math.max(
        ...children.map((c) => {
          const cur = nextElements.find((n) => n.id === c.id)!
          return cur.x + cur.width
        }),
      )

      newW = Math.max(1, rightMost + pad.r)
    } else {
      newW = Math.max(1, contentEnd + pad.r)

      const bottomMost = Math.max(
        ...children.map((c) => {
          const cur = nextElements.find((n) => n.id === c.id)!
          return cur.y + cur.height
        }),
      )

      newH = Math.max(1, bottomMost + pad.b)
    }

    const fIdx = nextElements.findIndex((e) => e.id === frameId)
    if (fIdx >= 0 && (nextElements[fIdx].width !== newW || nextElements[fIdx].height !== newH)) {
      nextElements[fIdx] = {
        ...nextElements[fIdx],
        width: newW,
        height: newH,
      }
    }
  }

  state.elements = nextElements

  // Reflow parent frame if this frame is nested.
  const updatedFrame = state.elements.find((e) => e.id === frameId)
  if (updatedFrame?.parentId) {
    reflowFrame(updatedFrame.parentId, opts)
  }
}
/**
 * Persist a drag-reorder within an auto-layout frame: reflowFrame sorts children by their
 * position in state.elements (see reflowFrame), so dragging one past a sibling only changes
 * x/y, not that array order — reflow would otherwise snap it right back. Call this once at
 * drag-end, before reflowFrame, to write the post-drag spatial order back into state.elements
 * so it sticks.
 *
 * `draggedId`, when given, is inserted by comparing its center against every OTHER child's
 * center (never against itself) and takes the slot where it first falls before one. Sorting
 * all children by raw edge position instead would tie whenever drag-snapping locks the
 * dragged item exactly onto a sibling's edge — a very common case — and a tie loses to
 * Array.sort's stability, silently keeping the old order even though the drop looked like a
 * clean swap. Comparing centers against siblings only sidesteps that: the two coordinates
 * being compared are never equal by construction (self is excluded from the anchor set).
 */
function reorderAutoLayoutChildren(frameId: string, draggedId?: string): void {
  const frame = state.elements.find((e) => e.id === frameId)
  if (!frame || frame.type !== 'frame') return
  const dir = frame.layoutDirection ?? 'none'
  if (dir === 'none') return
  const isChild = (e: CmsElement): boolean => e.parentId === frameId
  const children = state.elements.filter(isChild)
  if (children.length < 2) return
  const center = (e: CmsElement): number =>
    dir === 'vertical' ? e.y + e.height / 2 : e.x + e.width / 2

  let sorted: CmsElement[]
  const dragged = draggedId ? children.find((c) => c.id === draggedId) : undefined
  if (dragged) {
    const others = children.filter((c) => c.id !== dragged.id).sort((a, b) => center(a) - center(b))
    const dc = center(dragged)
    // <=, not <: equal-size siblings + edge-snapping means dropping "onto" a sibling aligns
    // both edges AND centers exactly. A strict "<" would treat that dead-even tie as "not
    // before it" and leave the order unchanged — exactly the common case a same-size drag
    // hits, and exactly what should reorder. Ties resolve to "insert before the tied sibling".
    const insertAt = others.findIndex((o) => dc <= center(o))
    sorted =
      insertAt < 0
        ? [...others, dragged]
        : [...others.slice(0, insertAt), dragged, ...others.slice(insertAt)]
  } else {
    sorted = [...children].sort((a, b) => center(a) - center(b))
  }

  const slots: number[] = []
  state.elements.forEach((e, idx) => {
    if (isChild(e)) slots.push(idx)
  })
  const next = [...state.elements]
  slots.forEach((slotIdx, i) => {
    next[slotIdx] = sorted[i]
  })
  state.elements = next
}

const actions = {
  reflowFrame,
  reorderAutoLayoutChildren,
  absolutePosition,
  /** Returns parent frame's inner padding box, or null if element has no frame parent. */
  parentInnerBox(el: CmsElement): { x: number; y: number; width: number; height: number } | null {
    if (!el.parentId) return null
    const parent = state.elements.find((e) => e.id === el.parentId)
    if (!parent || parent.type !== 'frame') return null
    return framePaddingBox(parent)
  },
  /** Coordinate-space container for drag/resize snapping: parent frame (if any), its dimensions, and its canvas-absolute origin. */
  snapContainerFor(el: CmsElement): {
    parentFrame: CmsElement | undefined
    containerWidth: number
    containerHeight: number
    origin: { x: number; y: number }
  } {
    const parentFrame = el.parentId ? state.elements.find((e) => e.id === el.parentId) : undefined
    return {
      parentFrame,
      containerWidth: parentFrame ? parentFrame.width : state.canvasWidth,
      containerHeight: parentFrame ? parentFrame.height : effectiveHeight.value,
      origin: parentFrame ? absolutePosition(parentFrame) : { x: 0, y: 0 },
    }
  },
  addElement(element: CmsElement): void {
    snapshot()
    const sized = clampSize(element, state.canvasWidth, state.canvasHeight, state.flexibleHeight)
    Object.assign(element, sized)
    state.elements.push(element)
    state.selectedId = element.id
    state.editingTextId = null
  },
  updateElement(
    id: string,
    updates: Partial<CmsElement>,
    opts: { noHistory?: boolean } = {},
  ): void {
    const i = findIdx(id)
    if (i < 0) return
    if (!opts.noHistory) snapshot()
    const next = { ...state.elements[i], ...updates }
    const bboxKeys: (keyof CmsElement)[] = ['x', 'y', 'width', 'height']
    if (bboxKeys.some((k) => k in updates)) {
      const c = clampSize(next, state.canvasWidth, state.canvasHeight, state.flexibleHeight)
      next.x = c.x
      next.y = c.y
      next.width = c.width
      next.height = c.height
      const clamped = clampInsideParent(next, { x: next.x, y: next.y })
      next.x = clamped.x
      next.y = clamped.y
    }
    state.elements[i] = next
    // Auto-layout reflow triggers
    const layoutKeys = [
      'layoutDirection',
      'layoutGap',
      'layoutPadding',
      'layoutAlign',
      'layoutGrow',
      'x',
      'y',
      'width',
      'height',
    ]
    // When the frame is being manually resized, skip layoutGrow so user's size wins
    const isSizeEdit = ('width' in updates || 'height' in updates) && !('layoutGrow' in updates)
    if (next.type === 'frame' && layoutKeys.some((k) => k in updates)) {
      reflowFrame(next.id, { skipGrow: isSizeEdit })
    }

    if (next.parentId) {
      reflowFrame(next.parentId)
    }
  },
  updateStyles(
    id: string,
    styles: Partial<ElementStyles>,
    opts: { noHistory?: boolean } = {},
  ): void {
    const i = findIdx(id)
    if (i < 0) return
    if (!opts.noHistory) snapshot()
    state.elements[i] = { ...state.elements[i], styles: { ...state.elements[i].styles, ...styles } }
    const el = state.elements[i]
    // Reflow frame if its own padding changed (affects children layout)
    const padKeys = ['padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft']
    if (el.type === 'frame' && padKeys.some((k) => k in styles)) reflowFrame(id)
  },
  deleteElement(id: string | null): void {
    if (!id) return
    snapshot()
    const target = state.elements.find((e) => e.id === id)
    const parentId = target?.parentId ?? null
    const kill = new Set<string>([id, ...collectDescendantIds(id, state.elements)])
    state.elements = state.elements.filter((e) => !kill.has(e.id))
    if (state.selectedId && kill.has(state.selectedId)) state.selectedId = null
    if (state.editingTextId && kill.has(state.editingTextId)) state.editingTextId = null
    state.allSelected = false
    state.selectedIds = state.selectedIds.filter((id) => !kill.has(id))
    if (parentId) reflowFrame(parentId)
  },
  select(id: string | null): void {
    state.selectedId = id
    state.editingTextId = null
    state.allSelected = false
    state.selectedIds = []
  },
  setSelectedIds(ids: string[]): void {
    state.selectedIds = ids
    state.selectedId = null
    state.editingTextId = null
    state.allSelected = false
  },
  deleteSelected(): void {
    if (!state.selectedIds.length) return
    snapshot()
    const kill = new Set<string>(
      state.selectedIds.flatMap((id) => [id, ...collectDescendantIds(id, state.elements)]),
    )
    state.elements = state.elements.filter((e) => !kill.has(e.id))
    state.selectedIds = []
    state.selectedId = null
    state.editingTextId = null
    state.guides = []
  },
  selectAll(): void {
    if (!state.elements.length) return
    state.allSelected = true
    state.selectedId = null
    state.editingTextId = null
  },
  deleteAll(): void {
    if (!state.elements.length) return
    snapshot()
    state.elements = []
    state.selectedId = null
    state.selectedIds = []
    state.editingTextId = null
    state.allSelected = false
    state.guides = []
  },
  setEditing(id: string | null): void {
    state.editingTextId = id
  },
  toggleSidebar(): void {
    state.sidebarHidden = !state.sidebarHidden
  },
  move(id: string, x: number, y: number): void {
    const i = findIdx(id)
    if (i < 0) return
    const el = state.elements[i]
    if (el.responsive) x = 0
    const c = clampPos(
      { x, y, width: el.width, height: el.height },
      state.canvasWidth,
      state.canvasHeight,
      state.flexibleHeight,
    )
    const clamped = clampInsideParent(el, { x: c.x, y: c.y })
    state.elements[i] = { ...el, x: clamped.x, y: clamped.y }
  },
  /**
   * Set positions of many elements from absolute (originalX + dx, originalY + dy).
   * `originals` maps id → starting position captured at drag start.
   * Delta is clamped so the group's bounding box stays on-canvas.
   */
  moveMany(
    ids: string[],
    originals: Map<string, { x: number; y: number }>,
    dx: number,
    dy: number,
  ): void {
    if (!ids.length) return
    const idSet = new Set(ids)
    // Exclude any id whose nearest selected ancestor is itself already being moved — its
    // coordinate is frame-relative, so it moves for free when that ancestor moves, and
    // applying the same delta to it directly would double-shift it.
    const isCarriedByAnotherSelected = (id: string): boolean => {
      let cur = state.elements.find((e) => e.id === id)
      while (cur?.parentId) {
        if (idSet.has(cur.parentId)) return true
        cur = state.elements.find((e) => e.id === cur!.parentId)
      }
      return false
    }
    const ownership = new Set<string>(ids.filter((id) => !isCarriedByAnotherSelected(id)))
    // Compute the group's original bounding box from originals + current sizes
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity
    for (const id of ownership) {
      const orig = originals.get(id)
      if (!orig) continue
      const el = state.elements.find((e) => e.id === id)
      if (!el) continue
      if (orig.x < minX) minX = orig.x
      if (orig.y < minY) minY = orig.y
      if (orig.x + el.width > maxX) maxX = orig.x + el.width
      if (orig.y + el.height > maxY) maxY = orig.y + el.height
    }
    if (minX === Infinity) return
    // Clamp the group as a single box
    const groupC = clampPos(
      { x: minX + dx, y: minY + dy, width: maxX - minX, height: maxY - minY },
      state.canvasWidth,
      state.canvasHeight,
      state.flexibleHeight,
    )
    const finalDx = groupC.x - minX
    const finalDy = groupC.y - minY
    state.elements = state.elements.map((el) => {
      if (!ownership.has(el.id)) return el
      const orig = originals.get(el.id)
      if (!orig) return el
      const proposed = { x: el.responsive ? 0 : orig.x + finalDx, y: orig.y + finalDy }
      const clamped = clampInsideParent(el, proposed)
      return { ...el, x: clamped.x, y: clamped.y }
    })
  },
  moveLayer(id: string, targetId: string, position: 'before' | 'after' | 'inside'): void {
    if (id === targetId) return
    const els = state.elements
    const src = els.find((e) => e.id === id)
    const dst = els.find((e) => e.id === targetId)
    if (!src || !dst) return
    // Disallow dropping onto own descendant
    const descendants = new Set(collectDescendantIds(id, els))
    if (descendants.has(targetId)) return

    snapshot()

    const newParentId =
      position === 'inside' ? (dst.type === 'frame' ? dst.id : null) : (dst.parentId ?? null)

    // Remove src + descendants block (preserve their order)
    const blockIds = [id, ...collectDescendantIds(id, els)]
    const block = blockIds.map((bid) => els.find((e) => e.id === bid)!).filter(Boolean)
    const rest = els.filter((e) => !blockIds.includes(e.id))

    // Update src parentId
    const updatedSrc = { ...src, parentId: newParentId }
    const updatedBlock = [updatedSrc, ...block.slice(1)]

    // Insert relative to target
    const dstIdx = rest.findIndex((e) => e.id === targetId)
    if (position === 'inside') {
      // Append at end of parent's children → put block right after last child of dst
      const dstDesc = new Set(collectDescendantIds(targetId, rest))
      let insertAt = dstIdx + 1
      for (let i = dstIdx + 1; i < rest.length; i++) {
        if (dstDesc.has(rest[i].id)) insertAt = i + 1
        else break
      }
      rest.splice(insertAt, 0, ...updatedBlock)
    } else if (position === 'before') {
      rest.splice(dstIdx, 0, ...updatedBlock)
    } else {
      // after: skip past dst's descendants too
      const dstDesc = new Set(collectDescendantIds(targetId, rest))
      let insertAt = dstIdx + 1
      for (let i = dstIdx + 1; i < rest.length; i++) {
        if (dstDesc.has(rest[i].id)) insertAt = i + 1
        else break
      }
      rest.splice(insertAt, 0, ...updatedBlock)
    }

    state.elements = rest
    // Reflow both ends of the move: the old parent's remaining children need to close the
    // gap, and the new parent (if auto-layout) needs to slot the moved block into place —
    // otherwise their x/y stay stale until some unrelated edit happens to trigger a reflow.
    if (src.parentId && src.parentId !== newParentId) reflowFrame(src.parentId)
    if (newParentId) reflowFrame(newParentId)
  },
  reparent(id: string, parentId: string | null, opts: { noHistory?: boolean } = {}): void {
    const i = findIdx(id)
    if (i < 0) return
    if (!opts.noHistory) snapshot()
    state.elements[i] = { ...state.elements[i], parentId }
  },
  groupSelection(): void {
    // Future hook: collect multi-select. Currently single-select: noop unless extended.
  },
  autoReparent(id: string): void {
    const i = findIdx(id)
    if (i < 0) return
    const el = state.elements[i]
    // descendants includes id itself so a frame can't be nested in its own subtree
    const descendants = new Set([id, ...collectDescendantIds(id, state.elements)])
    const absEl = absolutePosition(el)
    const cx = absEl.x + el.width / 2
    const cy = absEl.y + el.height / 2
    let target: string | null = null
    // For nested frames: pick the smallest containing frame (deepest fit)
    let bestArea = Infinity
    for (const f of state.elements) {
      if (f.type !== 'frame') continue
      if (descendants.has(f.id)) continue
      const absF = absolutePosition(f)
      if (cx < absF.x || cx > absF.x + f.width || cy < absF.y || cy > absF.y + f.height) continue
      const area = f.width * f.height
      if (area < bestArea) {
        bestArea = area
        target = f.id
      }
    }
    const prevParent = el.parentId
    if (el.parentId !== target) {
      const targetFrame = target ? state.elements.find((e) => e.id === target) : undefined
      const newOrigin = targetFrame ? absolutePosition(targetFrame) : { x: 0, y: 0 }
      const updated = {
        ...el,
        parentId: target,
        x: absEl.x - newOrigin.x,
        y: absEl.y - newOrigin.y,
      }
      state.elements = [...state.elements.filter((e) => e.id !== id), updated]
      // Only reflow here when the parent actually changed (close the old parent's gap, slot
      // into the new one). Reflowing unconditionally — even for a same-frame drag — snaps the
      // dragged element back into its pre-drag slot using the still-old array order, before
      // the caller's own reorderAutoLayoutChildren gets a chance to read the dragged position.
      if (prevParent) reflowFrame(prevParent)
      if (target) reflowFrame(target)
    }
  },
  ungroupFrame(frameId: string): void {
    snapshot()
    state.elements = state.elements
      .map((el) => (el.parentId === frameId ? { ...el, parentId: null } : el))
      .filter((el) => el.id !== frameId)
    if (state.selectedId === frameId) state.selectedId = null
  },
  resize(id: string, x: number, y: number, w: number, h: number): void {
    const i = findIdx(id)
    if (i < 0) return
    const c = clampSize(
      { x, y, width: w, height: h },
      state.canvasWidth,
      state.canvasHeight,
      state.flexibleHeight,
    )
    state.elements[i] = { ...state.elements[i], x: c.x, y: c.y, width: c.width, height: c.height }
  },
  /** Set manualHeight flag directly (no reflow, no history) — used mid-drag by ResizeHandles. */
  setManualHeight(id: string, value: boolean): void {
    const i = findIdx(id)
    if (i < 0) return
    state.elements[i] = { ...state.elements[i], manualHeight: value }
  },
  pushSnapshot(prev: CmsElement[]): void {
    state.history.push(prev)
    if (state.history.length > HISTORY_MAX) state.history.shift()
    state.future = []
  },
  bringForward(id: string): void {
    const i = findIdx(id)
    if (i < 0) return
    const el = state.elements[i]
    // Swap with the next element that shares the same parent — a blind i+1 swap could cross
    // into a different frame's children (or the top level), corrupting both groups' order.
    let j = i + 1
    while (j < state.elements.length && state.elements[j].parentId !== el.parentId) j++
    if (j >= state.elements.length) return
    snapshot()
    const els = [...state.elements]
    ;[els[i], els[j]] = [els[j], els[i]]
    state.elements = els
    if (el.parentId) reflowFrame(el.parentId)
  },
  sendBackward(id: string): void {
    const i = findIdx(id)
    if (i < 0) return
    const el = state.elements[i]
    let j = i - 1
    while (j >= 0 && state.elements[j].parentId !== el.parentId) j--
    if (j < 0) return
    snapshot()
    const els = [...state.elements]
    ;[els[i], els[j]] = [els[j], els[i]]
    state.elements = els
    if (el.parentId) reflowFrame(el.parentId)
  },
  duplicate(id: string): void {
    const root = state.elements.find((e) => e.id === id)
    if (!root) return

    snapshot()

    // Get root + all descendants
    const originals: CmsElement[] = []

    const collect = (parentId: string) => {
      const children = state.elements.filter((e) => e.parentId === parentId)
      for (const child of children) {
        originals.push(child)
        collect(child.id)
      }
    }

    originals.push(root)
    collect(root.id)

    // old id -> new id
    const idMap = new Map<string, string>()

    for (const el of originals) {
      idMap.set(el.id, cmsUid())
    }

    const clones = originals.map((el) => {
      const clone = cloneEl(el)

      clone.id = idMap.get(el.id)!

      if (el.parentId && idMap.has(el.parentId)) {
        // Parent is also duplicated
        clone.parentId = idMap.get(el.parentId)!
      } else {
        // Keep original parent
        clone.parentId = el.parentId
      }

      // Offset only the duplicated root
      if (el.id === root.id) {
        clone.x += 20
        clone.y += 20

        Object.assign(
          clone,
          clampSize(clone, state.canvasWidth, state.canvasHeight, state.flexibleHeight),
        )
      }

      return clone
    })

    state.elements.push(...clones)

    const duplicatedRoot = clones[0]

    if (duplicatedRoot.parentId) {
      reflowFrame(duplicatedRoot.parentId)
    }

    state.selectedId = duplicatedRoot.id
  },
  toggleVisible(id: string): void {
    const i = findIdx(id)
    if (i < 0) return
    state.elements[i] = { ...state.elements[i], visible: !state.elements[i].visible }
  },
  toggleLock(id: string): void {
    const i = findIdx(id)
    if (i < 0) return
    state.elements[i] = { ...state.elements[i], locked: !state.elements[i].locked }
  },
  toggleResponsive(id: string): void {
    const i = findIdx(id)
    if (i < 0) return
    snapshot()
    const el = state.elements[i]
    const next = !el.responsive
    const updates: Partial<typeof el> = { responsive: next }
    if (next) {
      const box = parentBox(el)
      updates.x = box.x
      updates.width = box.width
    }
    state.elements[i] = { ...el, ...updates }
  },
  alignH(id: string, side: 'left' | 'center' | 'right'): void {
    const i = findIdx(id)
    if (i < 0) return
    snapshot()
    const el = state.elements[i]
    const box = parentBox(el)
    const x =
      side === 'left'
        ? box.x
        : side === 'right'
          ? box.x + box.width - el.width
          : box.x + (box.width - el.width) / 2
    state.elements[i] = { ...el, x }
  },
  alignV(id: string, side: 'top' | 'middle' | 'bottom'): void {
    const i = findIdx(id)
    if (i < 0) return
    snapshot()
    const el = state.elements[i]
    const box = parentBox(el)
    const y =
      side === 'top'
        ? box.y
        : side === 'bottom'
          ? box.y + box.height - el.height
          : box.y + (box.height - el.height) / 2
    state.elements[i] = { ...el, y }
  },
  setCanvas(w: number, h: number): void {
    state.canvasWidth = w
    state.canvasHeight = h
    state.elements = state.elements.map((el) => (el.responsive ? { ...el, x: 0, width: w } : el))
  },
  scaleElements(toWidth: number, toHeight: number): void {
    const fromW = state.canvasWidth
    const fromH = state.canvasHeight
    if (fromW === toWidth && fromH === toHeight) return
    snapshot()
    const sx = toWidth / fromW
    const sy = toHeight / fromH
    state.elements = state.elements.map((el) => {
      const next: typeof el = {
        ...el,
        x: Math.round(el.x * sx),
        y: Math.round(el.y * sy),
        width: Math.max(20, Math.round(el.width * sx)),
        height: Math.max(8, Math.round(el.height * sy)),
      }
      if (el.styles.fontSize) {
        next.styles = { ...el.styles, fontSize: Math.max(8, Math.round(el.styles.fontSize * sx)) }
      }
      if (el.responsive) {
        next.x = 0
        next.width = toWidth
      }
      return next
    })
    state.canvasWidth = toWidth
    state.canvasHeight = toHeight
  },
  setZoom(z: number): void {
    state.zoom = Math.max(0.25, Math.min(3, z))
  },
  setTab(tab: SidebarTab): void {
    state.sidebarTab = tab
  },
  setGuides(g: Guide[]): void {
    state.guides = g
  },
  clearGuides(): void {
    state.guides = []
  },
  isEffectivelyVisible(id: string): boolean {
    let cur = state.elements.find((e) => e.id === id)
    while (cur) {
      if (!cur.visible) return false
      if (!cur.parentId) return true
      cur = state.elements.find((e) => e.id === cur!.parentId)
    }
    return true
  },
  toggleFullscreen(): void {
    state.fullscreen = !state.fullscreen
  },
  toggleFlexibleHeight(): void {
    state.flexibleHeight = !state.flexibleHeight
  },
  toggleAdvancedBorderRadius(id: string): void {
    const i = findIdx(id)
    if (i < 0) return

    const target = state.elements[i]
    target.advancedBorderRadius = !target.advancedBorderRadius

    if (!target.advancedBorderRadius) {
      target.styles.borderRadius = 0
      return
    }

    target.styles.borderRadius = {
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      borderTopLeftRadius: 0,
      borderTopRightRadius: 0,
    }
  },
  togglePreview(): void {
    state.preview = !state.preview
    if (state.preview) {
      state.selectedId = null
      state.editingTextId = null
      state.guides = []
    } else {
      state.previewFullscreen = false
    }
  },
  togglePreviewFullscreen(): void {
    state.previewFullscreen = !state.previewFullscreen
  },
  exportJson(): string {
    const payload = {
      version: 2,
      exportedAt: new Date().toISOString(),
      canvas: {
        width: state.canvasWidth,
        height: state.canvasHeight,
        flexibleHeight: state.flexibleHeight,
      },
      elements: cloneEl(state.elements),
    }
    return JSON.stringify(payload, null, 2)
  },
  importCKEditorHtml(html: string): { ok: boolean; error?: string } {
    try {
      const result = parseCKEditorHtml(html, state.canvasWidth)
      state.history.push(cloneEl(state.elements))
      if (state.history.length > HISTORY_MAX) state.history.shift()
      state.future = []
      state.elements = result.elements
      state.canvasHeight = Math.max(state.canvasHeight, result.height)
      state.selectedId = null
      state.editingTextId = null
      state.guides = []
      return { ok: true }
    } catch (e) {
      return { ok: false, error: (e as Error).message }
    }
  },
  exportCKEditorHtml(): string {
    return renderCKEditorHtml({
      canvas: {
        width: state.canvasWidth,
        height: state.canvasHeight,
        flexibleHeight: state.flexibleHeight,
      },
      elements: cloneEl(state.elements),
    })
  },
  importJson(json: string): { ok: boolean; error?: string } {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- parsing untrusted JSON before validation
    let data: any
    try {
      data = JSON.parse(json)
    } catch {
      return { ok: false, error: 'Invalid JSON' }
    }
    if (!data || typeof data !== 'object') return { ok: false, error: 'Bad payload' }
    if (!Array.isArray(data.elements)) return { ok: false, error: 'Missing elements array' }

    // Snapshot before mutation so user can undo
    state.history.push(cloneEl(state.elements))
    if (state.history.length > HISTORY_MAX) state.history.shift()
    state.future = []

    if (data.canvas && typeof data.canvas === 'object') {
      const c = data.canvas
      if (typeof c.width === 'number') state.canvasWidth = c.width
      if (typeof c.height === 'number') state.canvasHeight = c.height
      if (typeof c.flexibleHeight === 'boolean') state.flexibleHeight = c.flexibleHeight
    }

    state.elements = (data.elements as CmsElement[]).map((e) => ({ ...cloneEl(e) }))
    state.selectedId = null
    state.editingTextId = null
    state.guides = []
    return { ok: true }
  },
  undo(): void {
    if (!state.history.length) return
    const prev = state.history.pop()!
    state.future.unshift(cloneEl(state.elements))
    state.elements = prev
    state.selectedId = null
    state.selectedIds = []
    state.editingTextId = null
  },
  redo(): void {
    if (!state.future.length) return
    const next = state.future.shift()!
    state.history.push(cloneEl(state.elements))
    state.elements = next
    state.selectedId = null
    state.selectedIds = []
    state.editingTextId = null
  },
}

const selected = computed<CmsElement | null>(
  () => state.elements.find((e) => e.id === state.selectedId) || null,
)
const canUndo = computed(() => state.history.length > 0)
const canRedo = computed(() => state.future.length > 0)
const effectiveHeight = computed(() =>
  state.flexibleHeight
    ? Math.max(state.canvasHeight, maxElementBottom(state.elements) + 40)
    : state.canvasHeight,
)

export function useCms() {
  return { state, selected, canUndo, canRedo, effectiveHeight, ...actions }
}
