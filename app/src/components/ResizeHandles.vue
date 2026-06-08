<script setup lang="ts">
import type { CSSProperties } from 'vue'
import { useCms } from '../composables/useCms'
import { cloneEl } from '../composables/factories'
import { computeSnap } from '../composables/snapping'
import { modKeys } from '../composables/useModifierKeys'
import type { CmsElement } from '../types'

const props = defineProps<{ element: CmsElement }>()
const cms = useCms()

type HandleId = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'
interface Handle { id: HandleId; css: CSSProperties }

const HANDLES: Handle[] = [
  { id: 'nw', css: { top: '-5px', left: '-5px', cursor: 'nwse-resize' } },
  { id: 'n',  css: { top: '-5px', left: '50%', marginLeft: '-5px', cursor: 'ns-resize' } },
  { id: 'ne', css: { top: '-5px', right: '-5px', cursor: 'nesw-resize' } },
  { id: 'e',  css: { top: '50%', right: '-5px', marginTop: '-5px', cursor: 'ew-resize' } },
  { id: 'se', css: { bottom: '-5px', right: '-5px', cursor: 'nwse-resize' } },
  { id: 's',  css: { bottom: '-5px', left: '50%', marginLeft: '-5px', cursor: 'ns-resize' } },
  { id: 'sw', css: { bottom: '-5px', left: '-5px', cursor: 'nesw-resize' } },
  { id: 'w',  css: { top: '50%', left: '-5px', marginTop: '-5px', cursor: 'ew-resize' } },
]

function start(e: MouseEvent, hid: HandleId): void {
  e.stopPropagation(); e.preventDefault()
  const z = cms.state.zoom
  const startX = e.clientX, startY = e.clientY
  const orig = { x: props.element.x, y: props.element.y, w: props.element.width, h: props.element.height }
  const prev = cloneEl(cms.state.elements)

  const onMove = (ev: MouseEvent): void => {
    const dx = (ev.clientX - startX) / z
    const dy = (ev.clientY - startY) / z
    let { x, y, w, h } = orig
    if (hid.includes('e')) w = Math.max(20, orig.w + dx)
    if (hid.includes('w')) { w = Math.max(20, orig.w - dx); x = orig.x + orig.w - w }
    if (hid.includes('s')) h = Math.max(8, orig.h + dy)
    if (hid.includes('n')) { h = Math.max(8, orig.h - dy); y = orig.y + orig.h - h }

    const skipSnap = ev.altKey || modKeys.altDown.value
    if (skipSnap) {
      w = Math.max(20, w); h = Math.max(8, h)
      cms.clearGuides()
      cms.resize(props.element.id, x, y, w, h)
      return
    }
    const siblings = cms.state.elements.filter(e => e.id !== props.element.id && cms.isEffectivelyVisible(e.id))
    const threshold = 6 / z
    const snap = computeSnap({ x, y, width: w, height: h }, siblings, cms.state.canvasWidth, cms.effectiveHeight.value, threshold)
    // Only apply snap on the edge being dragged, preserve opposite edge
    const sdx = snap.x - x
    const sdy = snap.y - y
    if (hid.includes('e')) { w += sdx }
    else if (hid.includes('w')) { x += sdx; w -= sdx }
    if (hid.includes('s')) { h += sdy }
    else if (hid.includes('n')) { y += sdy; h -= sdy }
    w = Math.max(20, w); h = Math.max(8, h)

    cms.setGuides(snap.guides)
    cms.resize(props.element.id, x, y, w, h)
  }
  const onUp = (): void => {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
    cms.clearGuides()
    cms.pushSnapshot(prev)
  }
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}
</script>

<template>
  <div v-for="h in HANDLES" :key="h.id" class="resize-handle"
    :style="{ position: 'absolute', ...h.css }"
    @mousedown="start($event, h.id)"></div>
</template>
