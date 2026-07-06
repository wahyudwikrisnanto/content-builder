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

const findIdx = (id: string): number => state.elements.findIndex(e => e.id === id)

function collectDescendantIds(parentId: string, elements: CmsElement[]): string[] {
  const out: string[] = []
  const stack = [parentId]
  while (stack.length) {
    const p = stack.pop()!
    for (const e of elements) {
      if (e.parentId === p) { out.push(e.id); stack.push(e.id) }
    }
  }
  return out
}

/**
 * Return the containing box for `el` — parent frame's padding zone, or canvas bounds.
 */
function parentBox(el: CmsElement): { x: number; y: number; width: number; height: number } {
  if (el.parentId) {
    const parent = state.elements.find(e => e.id === el.parentId)
    if (parent?.type === 'frame') return framePaddingBox(parent)
  }
  const h = state.flexibleHeight ? Math.max(state.canvasHeight, maxElementBottom(state.elements) + 40) : state.canvasHeight
  return { x: 0, y: 0, width: state.canvasWidth, height: h }
}

/**
 * Compute the frame's inner padding box (where children may be placed).
 */
function framePaddingBox(frame: CmsElement): { x: number; y: number; width: number; height: number } {
  const p = sidePad(frame)
  return {
    x: frame.x + p.l,
    y: frame.y + p.t,
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
  const parent = state.elements.find(e => e.id === el.parentId)
  if (!parent || parent.type !== 'frame') return proposed
  const box = framePaddingBox(parent)
  if (box.width <= 0 || box.height <= 0) return proposed
  const minX = box.x
  const minY = box.y
  const maxX = box.x + box.width  - el.width
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
    t: s.paddingTop    ?? base ?? 0,
    r: s.paddingRight  ?? base ?? 0,
    b: s.paddingBottom ?? base ?? 0,
    l: s.paddingLeft   ?? base ?? 0,
  }
}

/**
 * Auto-layout: reposition (and stretch) direct children of a frame based on its layout config.
 * Children are placed vertically or horizontally with gap + per-side padding.
 * `skipGrow`: pass true when user manually resizes the frame so their size sticks.
 */
function reflowFrame(frameId: string, opts: { skipGrow?: boolean } = {}): void {
  const i = state.elements.findIndex(e => e.id === frameId)
  if (i < 0) return
  const frame = state.elements[i]
  if (frame.type !== 'frame') return
  const dir = frame.layoutDirection ?? 'none'
  if (dir === 'none') return
  const gap = frame.layoutGap ?? 8
  const align = frame.layoutAlign ?? 'start'
  const pad = sidePad(frame)

  const children = state.elements
    .filter(e => e.parentId === frameId)
    .sort((a, b) => dir === 'vertical' ? a.y - b.y : a.x - b.x)

  let cursor = dir === 'vertical' ? frame.y + pad.t : frame.x + pad.l
  const nextElements = [...state.elements]

  for (const child of children) {
    const idx = nextElements.findIndex(e => e.id === child.id)
    if (idx < 0) continue
    let x = child.x, y = child.y, w = child.width, h = child.height

    if (dir === 'vertical') {
      y = cursor
      if (align === 'stretch')      { x = frame.x + pad.l;                     w = Math.max(1, frame.width - pad.l - pad.r) }
      else if (align === 'center')  { x = frame.x + (frame.width - w) / 2 }
      else if (align === 'end')     { x = frame.x + frame.width - pad.r - w }
      else                          { x = frame.x + pad.l }
      cursor = y + h + gap
    } else {
      x = cursor
      if (align === 'stretch')      { y = frame.y + pad.t;                     h = Math.max(1, frame.height - pad.t - pad.b) }
      else if (align === 'center')  { y = frame.y + (frame.height - h) / 2 }
      else if (align === 'end')     { y = frame.y + frame.height - pad.b - h }
      else                          { y = frame.y + pad.t }
      cursor = x + w + gap
    }
    nextElements[idx] = { ...child, x, y, width: w, height: h }
  }

  // Grow the frame to fit its laid-out children
  if (frame.layoutGrow && !opts.skipGrow && children.length) {
    // cursor now sits at the trailing edge (with gap). Content-end = cursor - gap.
    const contentEnd = cursor - gap
    let newW = frame.width, newH = frame.height
    if (dir === 'vertical') {
      newH = Math.max(1, (contentEnd - frame.y) + pad.b)
      // Cross axis: fit the widest child
      const rightMost = Math.max(...children.map(c => {
        const cur = nextElements.find(n => n.id === c.id)!
        return cur.x + cur.width
      }))
      newW = Math.max(1, (rightMost - frame.x) + pad.r)
    } else {
      newW = Math.max(1, (contentEnd - frame.x) + pad.r)
      const bottomMost = Math.max(...children.map(c => {
        const cur = nextElements.find(n => n.id === c.id)!
        return cur.y + cur.height
      }))
      newH = Math.max(1, (bottomMost - frame.y) + pad.b)
    }
    const fIdx = nextElements.findIndex(e => e.id === frameId)
    if (fIdx >= 0 && (nextElements[fIdx].width !== newW || nextElements[fIdx].height !== newH)) {
      nextElements[fIdx] = { ...nextElements[fIdx], width: newW, height: newH }
    }
  }

  state.elements = nextElements
}

const actions = {
  reflowFrame,
  /** Returns parent frame's inner padding box, or null if element has no frame parent. */
  parentInnerBox(el: CmsElement): { x: number; y: number; width: number; height: number } | null {
    if (!el.parentId) return null
    const parent = state.elements.find(e => e.id === el.parentId)
    if (!parent || parent.type !== 'frame') return null
    return framePaddingBox(parent)
  },
  addElement(element: CmsElement): void {
    snapshot()
    const sized = clampSize(element, state.canvasWidth, state.canvasHeight, state.flexibleHeight)
    Object.assign(element, sized)
    state.elements.push(element)
    state.selectedId = element.id
    state.editingTextId = null
  },
  updateElement(id: string, updates: Partial<CmsElement>, opts: { noHistory?: boolean } = {}): void {
    const i = findIdx(id); if (i < 0) return
    if (!opts.noHistory) snapshot()
    const next = { ...state.elements[i], ...updates }
    const bboxKeys: (keyof CmsElement)[] = ['x', 'y', 'width', 'height']
    if (bboxKeys.some(k => k in updates)) {
      const c = clampSize(next, state.canvasWidth, state.canvasHeight, state.flexibleHeight)
      next.x = c.x; next.y = c.y; next.width = c.width; next.height = c.height
      const clamped = clampInsideParent(next, { x: next.x, y: next.y })
      next.x = clamped.x; next.y = clamped.y
    }
    state.elements[i] = next
    // Auto-layout reflow triggers
    const layoutKeys = ['layoutDirection', 'layoutGap', 'layoutPadding', 'layoutAlign', 'layoutGrow', 'x', 'y', 'width', 'height']
    // When the frame is being manually resized, skip layoutGrow so user's size wins
    const isSizeEdit = ('width' in updates || 'height' in updates) && !('layoutGrow' in updates)
    if (next.type === 'frame' && layoutKeys.some(k => k in updates)) {
      reflowFrame(next.id, { skipGrow: isSizeEdit })
    }
    if (next.parentId) reflowFrame(next.parentId)
  },
  updateStyles(id: string, styles: Partial<ElementStyles>, opts: { noHistory?: boolean } = {}): void {
    const i = findIdx(id); if (i < 0) return
    if (!opts.noHistory) snapshot()
    state.elements[i] = { ...state.elements[i], styles: { ...state.elements[i].styles, ...styles } }
    const el = state.elements[i]
    // Reflow frame if its own padding changed (affects children layout)
    const padKeys = ['padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft']
    if (el.type === 'frame' && padKeys.some(k => k in styles)) reflowFrame(id)
  },
  deleteElement(id: string | null): void {
    if (!id) return
    snapshot()
    const target = state.elements.find(e => e.id === id)
    const parentId = target?.parentId ?? null
    const kill = new Set<string>([id, ...collectDescendantIds(id, state.elements)])
    state.elements = state.elements.filter(e => !kill.has(e.id))
    if (state.selectedId && kill.has(state.selectedId)) state.selectedId = null
    if (state.editingTextId && kill.has(state.editingTextId)) state.editingTextId = null
    state.allSelected = false
    state.selectedIds = state.selectedIds.filter(id => !kill.has(id))
    if (parentId) reflowFrame(parentId)
  },
  select(id: string | null): void { state.selectedId = id; state.editingTextId = null; state.allSelected = false; state.selectedIds = [] },
  setSelectedIds(ids: string[]): void {
    state.selectedIds = ids
    state.selectedId = null
    state.editingTextId = null
    state.allSelected = false
  },
  deleteSelected(): void {
    if (!state.selectedIds.length) return
    snapshot()
    const kill = new Set<string>(state.selectedIds.flatMap(id => [id, ...collectDescendantIds(id, state.elements)]))
    state.elements = state.elements.filter(e => !kill.has(e.id))
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
    if (id) state.sidebarHidden = true
    else state.sidebarHidden = false
  },
  toggleSidebar(): void { state.sidebarHidden = !state.sidebarHidden },
  move(id: string, x: number, y: number): void {
    const i = findIdx(id); if (i < 0) return
    const el = state.elements[i]
    if (el.responsive) x = 0
    let c = clampPos({ x, y, width: el.width, height: el.height }, state.canvasWidth, state.canvasHeight, state.flexibleHeight)
    const clamped = clampInsideParent(el, { x: c.x, y: c.y })
    c = { ...c, x: clamped.x, y: clamped.y }
    const dx = c.x - el.x, dy = c.y - el.y
    state.elements[i] = { ...el, x: c.x, y: c.y }
    // Move descendants with frame
    if (el.type === 'frame' && (dx || dy)) {
      const descendants = collectDescendantIds(id, state.elements)
      for (const did of descendants) {
        const j = findIdx(did)
        if (j < 0) continue
        const d = state.elements[j]
        state.elements[j] = { ...d, x: d.x + dx, y: d.y + dy }
      }
    }
  },
  /**
   * Set positions of many elements from absolute (originalX + dx, originalY + dy).
   * `originals` maps id → starting position captured at drag start.
   * Descendants of frames in the id list are moved automatically.
   * Delta is clamped so the group's bounding box stays on-canvas.
   */
  moveMany(ids: string[], originals: Map<string, { x: number; y: number }>, dx: number, dy: number): void {
    if (!ids.length) return
    const ownership = new Set<string>()
    for (const id of ids) {
      ownership.add(id)
      for (const d of collectDescendantIds(id, state.elements)) ownership.add(d)
    }
    // Compute the group's original bounding box from originals + current sizes
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const id of ownership) {
      const orig = originals.get(id); if (!orig) continue
      const el = state.elements.find(e => e.id === id); if (!el) continue
      if (orig.x < minX) minX = orig.x
      if (orig.y < minY) minY = orig.y
      if (orig.x + el.width  > maxX) maxX = orig.x + el.width
      if (orig.y + el.height > maxY) maxY = orig.y + el.height
    }
    if (minX === Infinity) return
    // Clamp the group as a single box
    const groupC = clampPos(
      { x: minX + dx, y: minY + dy, width: maxX - minX, height: maxY - minY },
      state.canvasWidth, state.canvasHeight, state.flexibleHeight,
    )
    const finalDx = groupC.x - minX
    const finalDy = groupC.y - minY
    state.elements = state.elements.map(el => {
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
    const src = els.find(e => e.id === id)
    const dst = els.find(e => e.id === targetId)
    if (!src || !dst) return
    // Disallow dropping onto own descendant
    const descendants = new Set(collectDescendantIds(id, els))
    if (descendants.has(targetId)) return

    snapshot()

    const newParentId = position === 'inside'
      ? (dst.type === 'frame' ? dst.id : null)
      : (dst.parentId ?? null)

    // Remove src + descendants block (preserve their order)
    const blockIds = [id, ...collectDescendantIds(id, els)]
    const block = blockIds.map(bid => els.find(e => e.id === bid)!).filter(Boolean)
    let rest = els.filter(e => !blockIds.includes(e.id))

    // Update src parentId
    const updatedSrc = { ...src, parentId: newParentId }
    const updatedBlock = [updatedSrc, ...block.slice(1)]

    // Insert relative to target
    const dstIdx = rest.findIndex(e => e.id === targetId)
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
  },
  reparent(id: string, parentId: string | null, opts: { noHistory?: boolean } = {}): void {
    const i = findIdx(id); if (i < 0) return
    if (!opts.noHistory) snapshot()
    state.elements[i] = { ...state.elements[i], parentId }
  },
  groupSelection(): void {
    // Future hook: collect multi-select. Currently single-select: noop unless extended.
  },
  autoReparent(id: string): void {
    const i = findIdx(id); if (i < 0) return
    const el = state.elements[i]
    // descendants includes id itself so a frame can't be nested in its own subtree
    const descendants = new Set([id, ...collectDescendantIds(id, state.elements)])
    const cx = el.x + el.width / 2
    const cy = el.y + el.height / 2
    let target: string | null = null
    // For nested frames: pick the smallest containing frame (deepest fit)
    let bestArea = Infinity
    for (const f of state.elements) {
      if (f.type !== 'frame') continue
      if (descendants.has(f.id)) continue
      if (cx < f.x || cx > f.x + f.width || cy < f.y || cy > f.y + f.height) continue
      const area = f.width * f.height
      if (area < bestArea) { bestArea = area; target = f.id }
    }
    const prevParent = el.parentId
    if (el.parentId !== target) {
      const updated = { ...el, parentId: target }
      state.elements = [...state.elements.filter(e => e.id !== id), updated]
    }
    if (prevParent) reflowFrame(prevParent)
    if (target) reflowFrame(target)
  },
  ungroupFrame(frameId: string): void {
    snapshot()
    state.elements = state.elements.map(el =>
      el.parentId === frameId ? { ...el, parentId: null } : el,
    ).filter(el => el.id !== frameId)
    if (state.selectedId === frameId) state.selectedId = null
  },
  resize(id: string, x: number, y: number, w: number, h: number): void {
    const i = findIdx(id); if (i < 0) return
    const c = clampSize({ x, y, width: w, height: h }, state.canvasWidth, state.canvasHeight, state.flexibleHeight)
    state.elements[i] = { ...state.elements[i], x: c.x, y: c.y, width: c.width, height: c.height }
  },
  /** Set manualHeight flag directly (no reflow, no history) — used mid-drag by ResizeHandles. */
  setManualHeight(id: string, value: boolean): void {
    const i = findIdx(id); if (i < 0) return
    state.elements[i] = { ...state.elements[i], manualHeight: value }
  },
  pushSnapshot(prev: CmsElement[]): void {
    state.history.push(prev)
    if (state.history.length > HISTORY_MAX) state.history.shift()
    state.future = []
  },
  bringForward(id: string): void {
    const i = findIdx(id)
    if (i < 0 || i >= state.elements.length - 1) return
    snapshot()
    const els = [...state.elements]
    ;[els[i], els[i + 1]] = [els[i + 1], els[i]]
    state.elements = els
  },
  sendBackward(id: string): void {
    const i = findIdx(id)
    if (i <= 0) return
    snapshot()
    const els = [...state.elements]
    ;[els[i], els[i - 1]] = [els[i - 1], els[i]]
    state.elements = els
  },
  duplicate(id: string): void {
    const el = state.elements.find(e => e.id === id)
    if (!el) return
    snapshot()
    const dup: CmsElement = { ...cloneEl(el), id: cmsUid(), x: el.x + 20, y: el.y + 20 }
    const sized = clampSize(dup, state.canvasWidth, state.canvasHeight, state.flexibleHeight)
    Object.assign(dup, sized)
    state.elements.push(dup)
    state.selectedId = dup.id
  },
  toggleVisible(id: string): void {
    const i = findIdx(id); if (i < 0) return
    state.elements[i] = { ...state.elements[i], visible: !state.elements[i].visible }
  },
  toggleLock(id: string): void {
    const i = findIdx(id); if (i < 0) return
    state.elements[i] = { ...state.elements[i], locked: !state.elements[i].locked }
  },
  toggleResponsive(id: string): void {
    const i = findIdx(id); if (i < 0) return
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
    const i = findIdx(id); if (i < 0) return
    snapshot()
    const el = state.elements[i]
    const box = parentBox(el)
    const x = side === 'left' ? box.x
      : side === 'right' ? box.x + box.width - el.width
      : box.x + (box.width - el.width) / 2
    state.elements[i] = { ...el, x }
  },
  alignV(id: string, side: 'top' | 'middle' | 'bottom'): void {
    const i = findIdx(id); if (i < 0) return
    snapshot()
    const el = state.elements[i]
    const box = parentBox(el)
    const y = side === 'top' ? box.y
      : side === 'bottom' ? box.y + box.height - el.height
      : box.y + (box.height - el.height) / 2
    state.elements[i] = { ...el, y }
  },
  setCanvas(w: number, h: number): void {
    state.canvasWidth = w; state.canvasHeight = h
    state.elements = state.elements.map(el =>
      el.responsive ? { ...el, x: 0, width: w } : el,
    )
  },
  scaleElements(toWidth: number, toHeight: number): void {
    const fromW = state.canvasWidth
    const fromH = state.canvasHeight
    if (fromW === toWidth && fromH === toHeight) return
    snapshot()
    const sx = toWidth / fromW
    const sy = toHeight / fromH
    state.elements = state.elements.map(el => {
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
      if (el.responsive) { next.x = 0; next.width = toWidth }
      return next
    })
    state.canvasWidth = toWidth
    state.canvasHeight = toHeight
  },
  setZoom(z: number): void { state.zoom = Math.max(0.25, Math.min(3, z)) },
  setTab(tab: SidebarTab): void { state.sidebarTab = tab },
  setGuides(g: Guide[]): void { state.guides = g },
  clearGuides(): void { state.guides = [] },
  isEffectivelyVisible(id: string): boolean {
    let cur = state.elements.find(e => e.id === id)
    while (cur) {
      if (!cur.visible) return false
      if (!cur.parentId) return true
      cur = state.elements.find(e => e.id === cur!.parentId)
    }
    return true
  },
  toggleFullscreen(): void { state.fullscreen = !state.fullscreen },
  toggleFlexibleHeight(): void { state.flexibleHeight = !state.flexibleHeight },
  togglePreview(): void {
    state.preview = !state.preview
    if (state.preview) { state.selectedId = null; state.editingTextId = null; state.guides = [] }
    else { state.previewFullscreen = false }
  },
  togglePreviewFullscreen(): void { state.previewFullscreen = !state.previewFullscreen },
  exportJson(): string {
    const payload = {
      version: 1,
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
      canvas: { width: state.canvasWidth, height: state.canvasHeight, flexibleHeight: state.flexibleHeight },
      elements: cloneEl(state.elements),
    })
  },
  importJson(json: string): { ok: boolean; error?: string } {
    let data: any
    try { data = JSON.parse(json) }
    catch (e) { return { ok: false, error: 'Invalid JSON' } }
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

    state.elements = (data.elements as CmsElement[]).map(e => ({ ...cloneEl(e) }))
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
    state.selectedId = null; state.selectedIds = []; state.editingTextId = null
  },
  redo(): void {
    if (!state.future.length) return
    const next = state.future.shift()!
    state.history.push(cloneEl(state.elements))
    state.elements = next
    state.selectedId = null; state.selectedIds = []; state.editingTextId = null
  },
}

const selected = computed<CmsElement | null>(() => state.elements.find(e => e.id === state.selectedId) || null)
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
