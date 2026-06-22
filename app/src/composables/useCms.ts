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

const actions = {
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
    }
    state.elements[i] = next
  },
  updateStyles(id: string, styles: Partial<ElementStyles>, opts: { noHistory?: boolean } = {}): void {
    const i = findIdx(id); if (i < 0) return
    if (!opts.noHistory) snapshot()
    state.elements[i] = { ...state.elements[i], styles: { ...state.elements[i].styles, ...styles } }
  },
  deleteElement(id: string | null): void {
    if (!id) return
    snapshot()
    const kill = new Set<string>([id, ...collectDescendantIds(id, state.elements)])
    state.elements = state.elements.filter(e => !kill.has(e.id))
    if (state.selectedId && kill.has(state.selectedId)) state.selectedId = null
    if (state.editingTextId && kill.has(state.editingTextId)) state.editingTextId = null
    state.allSelected = false
    state.selectedIds = state.selectedIds.filter(id => !kill.has(id))
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
  setEditing(id: string | null): void { state.editingTextId = id },
  move(id: string, x: number, y: number): void {
    const i = findIdx(id); if (i < 0) return
    const el = state.elements[i]
    const c = clampPos({ x, y, width: el.width, height: el.height }, state.canvasWidth, state.canvasHeight, state.flexibleHeight)
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
    if (el.type === 'frame') return
    const descendants = new Set(collectDescendantIds(id, state.elements))
    const cx = el.x + el.width / 2
    const cy = el.y + el.height / 2
    let target: string | null = null
    for (const f of state.elements) {
      if (f.type !== 'frame') continue
      if (f.id === id || descendants.has(f.id)) continue
      if (cx >= f.x && cx <= f.x + f.width && cy >= f.y && cy <= f.y + f.height) {
        target = f.id // last frame wins (topmost in array order)
      }
    }
    if (el.parentId !== target) {
      const updated = { ...el, parentId: target }
      state.elements = [...state.elements.filter(e => e.id !== id), updated]
    }
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
  setCanvas(w: number, h: number): void { state.canvasWidth = w; state.canvasHeight = h },
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
