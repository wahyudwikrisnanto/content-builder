<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import type { CSSProperties } from 'vue'
import { useCms } from '../composables/useCms'
import { cloneEl } from '../composables/factories'
import { computeSnap, translateGuides } from '../composables/snapping'
import { modKeys } from '../composables/useModifierKeys'
import type { CmsElement } from '../types'

const props = defineProps<{ element: CmsElement }>()
const cms = useCms()

// 1. Reactive trigger to force dynamic position updates on external browser events
const viewportTick = ref(0)
const triggerUpdate = () => {
  viewportTick.value++
}

onMounted(() => {
  // Catch scrolling on any scrollable container (useCapture: true catches all child scrolls)
  window.addEventListener('scroll', triggerUpdate, true)
  window.addEventListener('resize', triggerUpdate)
})

onUnmounted(() => {
  window.removeEventListener('scroll', triggerUpdate, true)
  window.removeEventListener('resize', triggerUpdate)
})

// 2. Computed wrapper style tracking both element state, zoom, and viewport changes
const wrapperStyle = computed(() => {
  // Reading these reactive properties ensures recalculation when zoom/element properties change:
  const _zoom = cms.state.zoom
  const _x = props.element.x
  const _y = props.element.y
  const _w = props.element.width
  const _h = props.element.height
  const _tick = viewportTick.value

  const realElement = document.querySelector(`[data-element-id="${props.element.id}"]`)
  if (!realElement) {
    return { display: 'none' }
  }

  const rect = realElement.getBoundingClientRect()

  return {
    position: 'absolute' as const,
    left: `${rect.left + window.scrollX}px`,
    top: `${rect.top + window.scrollY}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    pointerEvents: 'none' as const,
    zIndex: 9999,
  }
})

// --- Keep existing resize drag logic intact ---
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
  const startX = e.clientX
  const startY = e.clientY

  const orig = {
    x: props.element.x,
    y: props.element.y,
    w: props.element.width,
    h: props.element.height,
  }
  const prev = cloneEl(cms.state.elements)
  const touchesVertical = hid.includes('n') || hid.includes('s')

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
    const { containerWidth, containerHeight, origin } = cms.snapContainerFor(props.element)
    const parentBox = cms.parentInnerBox(props.element)

    const snap = computeSnap(
      { x, y, width: w, height: h },
      siblings,
      containerWidth,
      containerHeight,
      threshold,
      parentBox ?? undefined,
    )

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

    cms.setGuides(translateGuides(snap.guides, origin.x, origin.y))
    cms.resize(props.element.id, x, y, w, h)
  }

  const onUp = (): void => {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
    cms.clearGuides()

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
  <Teleport to="body">
    <div :style="wrapperStyle" class="cb-root-var cb-resize-handles-wrapper">
      <div
        v-for="h in HANDLES"
        :key="h.id"
        v-show="!element.responsive || h.id === 'n' || h.id === 's'"
        class="cb-resize-handle"
        :style="{ position: 'absolute', pointerEvents: 'auto', ...h.css }"
        @mousedown="start($event, h.id)"
      ></div>
    </div>
  </Teleport>
</template>
