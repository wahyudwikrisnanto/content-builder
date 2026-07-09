<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useCms } from '../composables/useCms'
import { CmsFactories } from '../composables/factories'
import CanvasElement from './CanvasElement.vue'
import Guides from './Guides.vue'
import Icon from '../icons/Icon.vue'
import type { FactoryKey } from '../types'

const cms = useCms()
const canvasRef = ref<HTMLDivElement | null>(null)
const scrollRef = ref<HTMLDivElement | null>(null)
const dragOver = ref(false)

// Marquee in viewport (client) coords — rendered as position:fixed
const marquee = ref<{ cx1: number; cy1: number; cx2: number; cy2: number } | null>(null)

const marqueeStyle = computed(() => {
  if (!marquee.value) return {}
  const { cx1, cy1, cx2, cy2 } = marquee.value
  return {
    left: Math.min(cx1, cx2) + 'px',
    top: Math.min(cy1, cy2) + 'px',
    width: Math.abs(cx2 - cx1) + 'px',
    height: Math.abs(cy2 - cy1) + 'px',
  }
})

function onWheel(e: WheelEvent): void {
  if (!e.ctrlKey && !e.metaKey) return
  e.preventDefault()
  const delta = e.deltaY > 0 ? -0.1 : 0.1
  cms.setZoom(Math.round((cms.state.zoom + delta) * 10) / 10)
}

onMounted(() => {
  const el = scrollRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const padX = 80,
    padY = 100
  const fitZoom = Math.min(
    (rect.width - padX) / cms.state.canvasWidth,
    (rect.height - padY) / cms.state.canvasHeight,
    1,
  )
  const rounded = Math.round(fitZoom * 20) / 20
  if (rounded < 1) cms.setZoom(Math.max(0.25, rounded))
  // passive:false required to call preventDefault on wheel
  el.addEventListener('wheel', onWheel, { passive: false })
  document.addEventListener('click', onClickOutsideWorkspace)
})

onUnmounted(() => {
  scrollRef.value?.removeEventListener('wheel', onWheel)
  document.removeEventListener('click', onClickOutsideWorkspace)
})

function onDrop(e: DragEvent): void {
  e.preventDefault()
  dragOver.value = false
  if (!canvasRef.value || !e.dataTransfer) return
  const type = e.dataTransfer.getData('text/plain') as FactoryKey
  const rect = canvasRef.value.getBoundingClientRect()
  const z = cms.state.zoom
  const x = (e.clientX - rect.left) / z
  const y = (e.clientY - rect.top) / z

  if (type && CmsFactories[type]) {
    cms.addElement(CmsFactories[type](Math.max(0, x - 60), Math.max(0, y - 20)))
    return
  }

  // File drops intentionally not supported — use URL-based images only
}

function onScrollMouseDown(e: MouseEvent): void {
  if (cms.state.preview) return
  const t = e.target as HTMLElement
  const isScrollBg = t === scrollRef.value
  const isCanvasBg = t === canvasRef.value || t.classList.contains('canvas-inner')
  if (!isScrollBg && !isCanvasBg) return

  cms.select(null)
  cms.state.allSelected = false

  const startCX = e.clientX,
    startCY = e.clientY
  let dragging = false

  const onMove = (ev: MouseEvent): void => {
    dragging = true
    marquee.value = { cx1: startCX, cy1: startCY, cx2: ev.clientX, cy2: ev.clientY }
  }

  const onUp = (): void => {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
    if (dragging && marquee.value && canvasRef.value) {
      const { cx1, cy1, cx2, cy2 } = marquee.value
      const canvasRect = canvasRef.value.getBoundingClientRect()
      const z = cms.state.zoom
      const rx1 = (Math.min(cx1, cx2) - canvasRect.left) / z
      const ry1 = (Math.min(cy1, cy2) - canvasRect.top) / z
      const rx2 = (Math.max(cx1, cx2) - canvasRect.left) / z
      const ry2 = (Math.max(cy1, cy2) - canvasRect.top) / z
      const hits = cms.state.elements
        .filter((el) => {
          if (!cms.isEffectivelyVisible(el.id)) return false
          const abs = cms.absolutePosition(el)
          return abs.x < rx2 && abs.x + el.width > rx1 && abs.y < ry2 && abs.y + el.height > ry1
        })
        .map((el) => el.id)
      if (hits.length > 1) cms.setSelectedIds(hits)
      else if (hits.length === 1) cms.select(hits[0])
    }
    marquee.value = null
  }

  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

function onClickOutsideWorkspace(e: MouseEvent): void {
  const target = e.target as Element;

  if (target && !target.closest('.cb-root')) {
    cms.select(null);
    cms.state.allSelected = false;
    cms.state.selectedIds = [];
  }
}
</script>

<template>
  <div class="workspace">
    <div class="canvas-scroll" ref="scrollRef" @mousedown="onScrollMouseDown">
      <div
        class="canvas-wrapper"
        :style="{
          width: cms.state.canvasWidth * cms.state.zoom + 'px',
          height: cms.effectiveHeight.value * cms.state.zoom + 'px',
        }"
      >
        <div
          ref="canvasRef"
          :class="['canvas', { 'drag-over': dragOver }]"
          :style="{
            width: cms.state.canvasWidth + 'px',
            height: cms.effectiveHeight.value + 'px',
            transform: `scale(${cms.state.zoom})`,
            transformOrigin: 'top left',
          }"
          @dragover.prevent="dragOver = true"
          @dragleave="dragOver = false"
          @drop="onDrop"
        >
          <div class="canvas-inner" :style="{ position: 'absolute', inset: 0 }"></div>

          <template v-for="el in cms.state.elements" :key="el.id">
            <CanvasElement v-if="!el.parentId && cms.isEffectivelyVisible(el.id)" :element="el" />
          </template>

          <Guides />

          <div v-if="cms.state.allSelected" class="canvas-select-all-overlay">
            <span>All selected — press Delete to clear</span>
          </div>

          <div v-if="!cms.state.elements.length && !dragOver" class="canvas-empty">
            <Icon name="move" :size="32" :style="{ opacity: 0.2 }" />
            <p>Drag elements here<br />or click from sidebar</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Marquee rendered fixed over entire viewport -->
    <div v-if="marquee" class="canvas-marquee-fixed" :style="marqueeStyle" />
  </div>
</template>
