<script setup lang="ts">
import { computed } from 'vue'
import { useCms } from '../composables/useCms'
import { cloneEl } from '../composables/factories'
import { computeSnap, translateGuides } from '../composables/snapping'
import { modKeys } from '../composables/useModifierKeys'
import { usePlugins, findRendererPlugin, findActivatorPlugin } from '../composables/usePlugins'
import { openDialog } from '../composables/openDialog'
import ImageUrlDialog from './ImageUrlDialog.vue'
import TextEl from '../elements/TextEl.vue'
import ImageEl from '../elements/ImageEl.vue'
import ShapeEl from '../elements/ShapeEl.vue'
import VideoEl from '../elements/VideoEl.vue'
import DividerEl from '../elements/DividerEl.vue'
import ContainerEl from '../elements/ContainerEl.vue'
import FrameEl from '../elements/FrameEl.vue'
import CodeEl from '../elements/CodeEl.vue'
import ButtonEl from '../elements/ButtonEl.vue'
import InputEl from '../elements/InputEl.vue'
import ResizeHandles from './ResizeHandles.vue'
import type { CmsElement, ElementType } from '../types'
import type { Component } from 'vue'

const props = defineProps<{ element: CmsElement }>()
const cms = useCms()
const plugins = usePlugins()

const isSelected = computed(
  () =>
    cms.state.selectedId === props.element.id ||
    cms.state.selectedIds.includes(props.element.id),
)
const isEditing = computed(() => cms.state.editingTextId === props.element.id)

const RENDERERS: Record<ElementType, Component> = {
  text: TextEl,
  image: ImageEl,
  shape: ShapeEl,
  video: VideoEl,
  divider: DividerEl,
  container: ContainerEl,
  frame: FrameEl,
  code: CodeEl,
  button: ButtonEl,
  input: InputEl,
}

const activeRenderer = computed<Component>(() => {
  const plugin = findRendererPlugin(plugins, props.element)
  return plugin ? plugin.component : RENDERERS[props.element.type]
})

const isFrame = computed(() => props.element.type === 'frame')

const children = computed(() =>
  cms.state.elements.filter(
    (e) => e.parentId === props.element.id && cms.isEffectivelyVisible(e.id),
  ),
)

function beginDragFor(target: CmsElement, e: MouseEvent): void {
  const z = cms.state.zoom
  const startX = e.clientX,
    startY = e.clientY
  const origX = target.x,
    origY = target.y
  const prev = cloneEl(cms.state.elements)
  let moved = false

  // Multi-select: drag ALL selected elements together
  const groupIds =
    cms.state.selectedIds.length > 1 && cms.state.selectedIds.includes(target.id)
      ? [...cms.state.selectedIds]
      : null

  // Snapshot original positions of all elements that will move (group + descendants of frames)
  const originals = new Map<string, { x: number; y: number }>()
  if (groupIds) {
    for (const el of cms.state.elements) {
      originals.set(el.id, { x: el.x, y: el.y })
    }
  }

  const onMove = (ev: MouseEvent): void => {
    moved = true
    const dx = (ev.clientX - startX) / z
    const dy = (ev.clientY - startY) / z
    const skipSnap = ev.altKey || modKeys.altDown.value

    if (groupIds) {
      // Move the whole selection using original positions + delta
      cms.clearGuides()
      cms.moveMany(groupIds, originals, dx, dy)
      return
    }

    const rawX = origX + dx
    const rawY = origY + dy

    if (skipSnap) {
      cms.clearGuides()
      cms.move(target.id, rawX, rawY)
      return
    }
    const siblings = cms.state.elements.filter(
      (e) => e.id !== target.id && e.parentId === target.parentId && cms.isEffectivelyVisible(e.id),
    )
    const parentFrame = target.parentId
      ? cms.state.elements.find((e) => e.id === target.parentId)
      : undefined
    const containerWidth = parentFrame ? parentFrame.width : cms.state.canvasWidth
    const containerHeight = parentFrame ? parentFrame.height : cms.effectiveHeight.value
    const parentBox = cms.parentInnerBox(target)
    const snap = computeSnap(
      { x: rawX, y: rawY, width: target.width, height: target.height },
      siblings,
      containerWidth,
      containerHeight,
      6 / z,
      parentBox ?? undefined,
    )
    const origin = parentFrame ? cms.absolutePosition(parentFrame) : { x: 0, y: 0 }
    cms.setGuides(translateGuides(snap.guides, origin.x, origin.y))
    cms.move(target.id, snap.x, snap.y)
  }
  const onUp = (): void => {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
    cms.clearGuides()
    if (moved) {
      if (!groupIds) cms.autoReparent(target.id)
      // Reflow parent auto-layout frame after drag (snaps child into new order)
      const cur = cms.state.elements.find((e) => e.id === target.id)
      if (cur?.parentId) {
        const parent = cms.state.elements.find((e) => e.id === cur.parentId)
        if (parent?.type === 'frame' && (parent.layoutDirection ?? 'none') !== 'none') {
          cms.reorderAutoLayoutChildren(parent.id, target.id)
          cms.reflowFrame(parent.id)
        }
      }
      cms.pushSnapshot(prev)
    }
  }
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

function beginDrag(e: MouseEvent): void {
  beginDragFor(props.element, e)
}

// Walk up the parent chain to the top-most ancestor frame
function findTopFrameId(startId: string): string | null {
  let current = cms.state.elements.find((e) => e.id === startId)
  let topFrame: string | null = null
  while (current?.parentId) {
    const parent = cms.state.elements.find((e) => e.id === current!.parentId)
    if (!parent) break
    if (parent.type === 'frame') topFrame = parent.id
    current = parent
  }
  return topFrame
}

function onMouseDown(e: MouseEvent): void {
  if (cms.state.preview) return
  if (props.element.locked || isEditing.value) return
  e.stopPropagation()

  // Multi-select drag: if this element is part of a multi-selection, drag the whole group
  if (cms.state.selectedIds.length > 1 && cms.state.selectedIds.includes(props.element.id)) {
    beginDrag(e)
    return
  }

  // Ctrl/Cmd+click: bypass frame drill-in, select this element directly
  const deepPick = e.ctrlKey || e.metaKey

  // Figma-style: clicking a child inside a frame selects the frame
  // (so you can drag it). Double-click drills into the child.
  const topFrameId = findTopFrameId(props.element.id)
  if (!deepPick && topFrameId && props.element.type !== 'frame' && !isSelected.value) {
    const frameSelected = cms.state.selectedId === topFrameId
    if (!frameSelected) {
      cms.select(topFrameId)
      return
    }
    // Frame already selected → drag the frame (not the child)
    const frameEl = cms.state.elements.find((el) => el.id === topFrameId)
    if (frameEl) beginDragFor(frameEl, e)
    return
  }

  // Standard: first click selects, second click drags
  if (!isSelected.value) {
    cms.select(props.element.id)
    return
  }
  cms.select(props.element.id)
  beginDrag(e)
}

function onLabelMouseDown(e: MouseEvent): void {
  if (cms.state.preview || props.element.locked) return
  e.stopPropagation()
  cms.select(props.element.id)
  // Label is an explicit drag handle — start dragging immediately
  beginDrag(e)
}

async function onDblClick(): Promise<void> {
  if (cms.state.preview) return
  if (props.element.locked) return

  // If element sits inside a frame and isn't yet selected, double-click drills in
  const topFrameId = findTopFrameId(props.element.id)
  if (topFrameId && props.element.type !== 'frame' && !isSelected.value) {
    cms.select(props.element.id)
    return
  }

  // Activator plugins (image picker, etc.) only fire when the element is already selected
  const activator = findActivatorPlugin(plugins, props.element)
  if (activator) {
    const patch = await activator.activate(props.element)
    if (patch) cms.updateElement(props.element.id, patch)
    return
  }

  // Built-in fallback for images: simple URL dialog
  if (props.element.type === 'image') {
    const url = await openDialog<string>(ImageUrlDialog, { currentUrl: props.element.content })
    if (url) cms.updateElement(props.element.id, { content: url })
    return
  }

  if (
    props.element.type === 'text' ||
    props.element.type === 'shape' ||
    props.element.type === 'code' ||
    props.element.type === 'button'
  ) {
    cms.setEditing(props.element.id)
  }
}
</script>

<template>
  <div
    :class="[
      'canvas-el',
      {
        selected: isSelected && !cms.state.preview,
        editing: isEditing,
        locked: element.locked,
        preview: cms.state.preview,
        responsive: element.responsive,
      },
    ]"
    :style="{
      position: 'absolute',
      left: element.x + 'px',
      top: element.y + 'px',
      width: element.width + 'px',
      height: element.height + 'px',
    }"
    @mousedown="onMouseDown"
    @dblclick="onDblClick"
  >
    <!-- Floating frame label — drag handle: select + drag in one motion -->
    <div
      v-if="isFrame && !cms.state.preview"
      class="canvas-el-frame-label"
      @mousedown="onLabelMouseDown"
    >
      <svg
        width="10"
        height="10"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        style="opacity: 0.6"
      >
        <circle cx="9" cy="6" r="1" />
        <circle cx="15" cy="6" r="1" />
        <circle cx="9" cy="12" r="1" />
        <circle cx="15" cy="12" r="1" />
        <circle cx="9" cy="18" r="1" />
        <circle cx="15" cy="18" r="1" />
      </svg>
      {{ element.name || 'Frame' }}
    </div>
    <!-- Inner wrapper carries opacity so label + selection outline stay visible at 0 opacity -->
    <div
      :style="{
        width: '100%',
        height: '100%',
        opacity: element.styles.opacity != null ? element.styles.opacity : 1,
      }"
    >
      <component :is="activeRenderer" :element="element" :is-editing="isEditing">
        <CanvasElement v-for="child in children" :key="child.id" :element="child" />
      </component>
    </div>
    <ResizeHandles
      v-if="isSelected && !element.locked && !isEditing && !cms.state.preview"
      :element="element"
    />
  </div>
</template>
