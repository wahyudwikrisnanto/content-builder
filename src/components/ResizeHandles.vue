<script setup lang="ts">
import type { CSSProperties } from 'vue'
import { useCms } from '../composables/useCms'
import { cloneEl } from '../composables/factories'
import { computeSnap, translateGuides } from '../composables/snapping'
import { modKeys } from '../composables/useModifierKeys'
import type { CmsElement } from '../types'

const props = defineProps<{ element: CmsElement }>()
const cms = useCms()

type HandleId = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'
interface Handle {
  id: HandleId
  css: CSSProperties
}

const HANDLES: Handle[] = [
  { id: 'nw', css: { top: '-5px', left: '-5px', cursor: 'nwse-resize' } },
  { id: 'n', css: { top: '-5px', left: '50%', marginLeft: '-5px', cursor: 'ns-resize' } },
  { id: 'ne', css: { top: '-5px', right: '-5px', cursor: 'nesw-resize' } },
  { id: 'e', css: { top: '50%', right: '-5px', marginTop: '-5px', cursor: 'ew-resize' } },
  { id: 'se', css: { bottom: '-5px', right: '-5px', cursor: 'nwse-resize' } },
  { id: 's', css: { bottom: '-5px', left: '50%', marginLeft: '-5px', cursor: 'ns-resize' } },
  { id: 'sw', css: { bottom: '-5px', left: '-5px', cursor: 'nesw-resize' } },
  { id: 'w', css: { top: '50%', left: '-5px', marginTop: '-5px', cursor: 'ew-resize' } },
]

function start(e: MouseEvent, hid: HandleId): void {
  e.stopPropagation()
  e.preventDefault()
  const z = cms.state.zoom
  const startX = e.clientX,
    startY = e.clientY
  const orig = {
    x: props.element.x,
    y: props.element.y,
    w: props.element.width,
    h: props.element.height,
  }
  const prev = cloneEl(cms.state.elements)
  const touchesVertical = hid.includes('n') || hid.includes('s')
  // Set manualHeight IMMEDIATELY via direct state mutation so useAutoSize honors it during drag.
  // (Going through updateElement would fire a parent-reflow that snaps back.)
  if (touchesVertical) {
    cms.setManualHeight(props.element.id, true)
  }

  const onMove = (ev: MouseEvent): void => {
    const dx = (ev.clientX - startX) / z
    const dy = (ev.clientY - startY) / z
    let { x, y, w, h } = orig
    if (!props.element.responsive) {
      if (hid.includes('e')) w = Math.max(20, orig.w + dx)
      if (hid.includes('w')) {
        w = Math.max(20, orig.w - dx)
        x = orig.x + orig.w - w
      }
    }
    if (hid.includes('s')) h = Math.max(8, orig.h + dy)
    if (hid.includes('n')) {
      h = Math.max(8, orig.h - dy)
      y = orig.y + orig.h - h
    }

    const skipSnap = ev.altKey || modKeys.altDown.value
    if (skipSnap) {
      w = Math.max(20, w)
      h = Math.max(8, h)
      cms.clearGuides()
      cms.resize(props.element.id, x, y, w, h)
      return
    }
    const siblings = cms.state.elements.filter(
      (e) =>
        e.id !== props.element.id &&
        e.parentId === props.element.parentId &&
        cms.isEffectivelyVisible(e.id),
    )
    const threshold = 6 / z
    // Snap to parent frame's inner padding zone if this element is a child
    const parentFrame = props.element.parentId
      ? cms.state.elements.find((e) => e.id === props.element.parentId)
      : undefined
    const containerWidth = parentFrame ? parentFrame.width : cms.state.canvasWidth
    const containerHeight = parentFrame ? parentFrame.height : cms.effectiveHeight.value
    const parentBox = cms.parentInnerBox(props.element)
    const snap = computeSnap(
      { x, y, width: w, height: h },
      siblings,
      containerWidth,
      containerHeight,
      threshold,
      parentBox ?? undefined,
    )
    // Only apply snap on the edge being dragged, preserve opposite edge
    const sdx = snap.x - x
    const sdy = snap.y - y
    if (hid.includes('e')) {
      w += sdx
    } else if (hid.includes('w')) {
      x += sdx
      w -= sdx
    }
    if (hid.includes('s')) {
      h += sdy
    } else if (hid.includes('n')) {
      y += sdy
      h -= sdy
    }
    w = Math.max(20, w)
    h = Math.max(8, h)

    const origin = parentFrame ? cms.absolutePosition(parentFrame) : { x: 0, y: 0 }
    cms.setGuides(translateGuides(snap.guides, origin.x, origin.y))
    cms.resize(props.element.id, x, y, w, h)
  }
  const onUp = (): void => {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
    cms.clearGuides()
    // If child of an auto-layout frame, reflow so siblings shift after resize.
    // Own axis-locked dims (main-axis cursor position, cross-axis stretch)
    // will be re-applied — that's expected: the user picked stretch/etc.
    const cur = cms.state.elements.find((e) => e.id === props.element.id)
    if (cur?.parentId) {
      const parent = cms.state.elements.find((e) => e.id === cur.parentId)
      if (parent?.type === 'frame' && (parent.layoutDirection ?? 'none') !== 'none') {
        cms.reflowFrame(parent.id)
      }
    }
    cms.pushSnapshot(prev)
  }
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}
</script>

<template>
  <div
    v-for="h in HANDLES"
    :key="h.id"
    v-show="!element.responsive || h.id === 'n' || h.id === 's'"
    class="resize-handle"
    :style="{ position: 'absolute', ...h.css }"
    @mousedown="start($event, h.id)"
  ></div>
</template>
