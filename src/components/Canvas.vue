<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useCms } from '../composables/useCms'
import { CmsFactories } from '../composables/factories'
import CanvasElement from './CanvasElement.vue'
import CanvasContextMenu from './CanvasContextMenu.vue'
import Guides from './Guides.vue'
import Icon from '../icons/Icon.vue'
import type { FactoryKey } from '../types'
import type { ContextMenuItem } from './CanvasContextMenu.vue'

const cms = useCms()
const canvasRef = ref<HTMLDivElement | null>(null)
const scrollRef = ref<HTMLDivElement | null>(null)
const dragOver = ref(false)
const contextMenu = ref<{ x: number; y: number; targetId: string | null } | null>(null)

const contextItems = computed<ContextMenuItem[]>(() => {
  const menu = contextMenu.value
  if (!menu) return []
  if (!menu.targetId) {
    const targetId = cms.state.selectedId ?? cms.state.selectedIds[0] ?? null
    return [
      ...(targetId ? [{ id: 'clear-selection', label: 'Clear selection', shortcut: 'Esc' }] : []),
      ...(cms.state.elements.length
        ? [{ id: 'select-all', label: 'Select all', shortcut: 'Ctrl A' }]
        : []),
    ]
  }
  const target = cms.state.elements.find((el) => el.id === menu.targetId)
  if (!target) return []
  const multi = cms.state.selectedIds.length > 1
  const selected = multi
    ? cms.state.elements.filter((el) => cms.state.selectedIds.includes(el.id))
    : [target]
  const selectedIds = new Set(selected.map((el) => el.id))
  const hasNestedSelection = selected.some((el) => {
    let parentId = el.parentId
    while (parentId) {
      if (selectedIds.has(parentId)) return true
      parentId = cms.state.elements.find((item) => item.id === parentId)?.parentId
    }
    return false
  })
  const hasLocked = selected.some((el) => el.locked)
  const canGroup =
    multi &&
    !hasLocked &&
    !hasNestedSelection &&
    new Set(selected.map((el) => el.parentId ?? null)).size === 1
  const siblings = cms.state.elements.filter(
    (el) => (el.parentId ?? null) === (target.parentId ?? null),
  )
  const siblingIndex = siblings.findIndex((el) => el.id === target.id)
  return [
    { id: 'rename', label: 'Rename', disabled: multi || target.locked },
    { id: 'duplicate', label: 'Duplicate', shortcut: 'Ctrl D', disabled: multi || target.locked },
    ...(target.type === 'frame' && !multi
      ? [{ id: 'ungroup', label: 'Ungroup', disabled: target.locked }]
      : multi
        ? [{ id: 'group', label: 'Group selection', shortcut: 'Ctrl G', disabled: !canGroup }]
        : []),
    {
      id: 'bring-forward',
      label: 'Bring forward',
      separator: true,
      disabled: multi || target.locked || siblingIndex === siblings.length - 1,
    },
    {
      id: 'send-backward',
      label: 'Send backward',
      disabled: multi || target.locked || siblingIndex <= 0,
    },
    {
      id: 'responsive',
      label: target.responsive ? 'Exit full width' : 'Stretch to full width',
      disabled: multi || target.locked,
    },
    { id: 'visible', label: target.visible ? 'Hide' : 'Show', separator: true, disabled: multi },
    { id: 'lock', label: target.locked ? 'Unlock' : 'Lock', disabled: multi },
    {
      id: 'delete',
      label: 'Delete',
      shortcut: 'Delete',
      danger: true,
      separator: true,
      disabled: hasLocked,
    },
  ]
})

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
      const hitSet = new Set(
        cms.state.elements
          .filter((el) => {
            if (!cms.isEffectivelyVisible(el.id)) return false
            const abs = cms.absolutePosition(el)
            return abs.x < rx2 && abs.x + el.width > rx1 && abs.y < ry2 && abs.y + el.height > ry1
          })
          .map((el) => el.id),
      )
      const hits = [...hitSet].filter((id) => {
        let parentId = cms.state.elements.find((el) => el.id === id)?.parentId
        while (parentId) {
          if (hitSet.has(parentId)) return false
          parentId = cms.state.elements.find((el) => el.id === parentId)?.parentId
        }
        return true
      })
      if (hits.length > 1) cms.setSelectedIds(hits)
      else if (hits.length === 1) cms.select(hits[0])
    }
    marquee.value = null
  }

  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

function openContextMenu(e: MouseEvent, id: string | null): void {
  if (cms.state.preview) return
  if (id) {
    const selected = cms.state.selectedId === id || cms.state.selectedIds.includes(id)
    if (!selected) {
      if (e.ctrlKey || e.metaKey) {
        const current = cms.state.selectedId
          ? [cms.state.selectedId]
          : [...cms.state.selectedIds]
        cms.setSelectedIds([...current, id])
      } else {
        cms.select(id)
      }
    }
  } else if (!cms.state.selectedId && !cms.state.selectedIds.length) {
    cms.select(null)
  }
  contextMenu.value = { x: e.clientX, y: e.clientY, targetId: id }
}

function runContextAction(id: string): void {
  const targetId = contextMenu.value?.targetId
  if (id === 'select-all') {
    cms.selectAll()
    contextMenu.value = null
    return
  }
  if (id === 'clear-selection') {
    cms.select(null)
    contextMenu.value = null
    return
  }
  if (!targetId) {
    contextMenu.value = null
    return
  }
  const multi = cms.state.selectedIds.length > 1
  if (id === 'rename') {
    const target = cms.state.elements.find((el) => el.id === targetId)
    if (target && !target.locked) {
      const nextName = window.prompt('Layer name', target.name ?? '')
      if (nextName !== null) cms.updateElement(targetId, { name: nextName.trim() || undefined })
    }
  } else if (id === 'duplicate') cms.duplicate(targetId)
  else if (id === 'group') cms.groupSelection()
  else if (id === 'ungroup') cms.ungroupFrame(targetId)
  else if (id === 'bring-forward') cms.bringForward(targetId)
  else if (id === 'send-backward') cms.sendBackward(targetId)
  else if (id === 'responsive') cms.toggleResponsive(targetId)
  else if (id === 'visible') cms.toggleVisible(targetId)
  else if (id === 'lock') cms.toggleLock(targetId)
  else if (id === 'delete') {
    if (multi) cms.deleteSelected()
    else cms.deleteElement(targetId)
  }
  contextMenu.value = null
}

function onCanvasContextMenu(e: MouseEvent): void {
  const target = e.target as HTMLElement
  if (target.closest('[data-element-id]')) return
  e.preventDefault()
  openContextMenu(e, null)
}

function onClickOutsideWorkspace(e: MouseEvent): void {
  const target = e.target as Element;

  if (target && !target.closest('.cb-root') && !target.closest('.cb-resize-handles-wrapper')) {
    cms.select(null);
    cms.state.allSelected = false;
    cms.state.selectedIds = [];
  }
}
</script>

<template>
  <div class="workspace">
    <div
      class="canvas-scroll"
      ref="scrollRef"
      @mousedown="onScrollMouseDown"
      @contextmenu="onCanvasContextMenu"
    >
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
            <CanvasElement
              v-if="!el.parentId && cms.isEffectivelyVisible(el.id)"
              :element="el"
              @contextmenu="openContextMenu"
            />
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
    <CanvasContextMenu
      v-if="contextMenu && contextItems.length"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :items="contextItems"
      @action="runContextAction"
      @close="contextMenu = null"
    />
  </div>
</template>
