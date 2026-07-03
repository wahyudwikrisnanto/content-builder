<script setup lang="ts">
import { computed, type CSSProperties } from 'vue'
import { useCms } from '../composables/useCms'
import { cloneEl } from '../composables/factories'
import { computeSnap } from '../composables/snapping'
import { modKeys } from '../composables/useModifierKeys'
import { usePlugins, findRendererPlugin } from '../composables/usePlugins'
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

const props = defineProps<{ element: CmsElement; isSelected: boolean; isEditing: boolean }>()
const cms = useCms()
const plugins = usePlugins()

const RENDERERS: Record<ElementType, Component> = {
  text: TextEl, image: ImageEl, shape: ShapeEl,
  video: VideoEl, divider: DividerEl, container: ContainerEl,
  frame: FrameEl, code: CodeEl, button: ButtonEl, input: InputEl,
}

const activeRenderer = computed<Component>(() => {
  const plugin = findRendererPlugin(plugins, props.element)
  return plugin ? plugin.component : RENDERERS[props.element.type]
})

// Clip-path for elements inside a frame with clipContent:true
const clipStyle = computed<CSSProperties>(() => {
  const parentId = props.element.parentId
  if (!parentId) return {}
  const frame = cms.state.elements.find(e => e.id === parentId)
  if (!frame || !frame.clipContent) return {}
  // inset values relative to the child element's position
  const top    = frame.y - props.element.y
  const left   = frame.x - props.element.x
  const right  = (props.element.x + props.element.width)  - (frame.x + frame.width)
  const bottom = (props.element.y + props.element.height) - (frame.y + frame.height)
  return {
    clipPath: `inset(${Math.max(0, top)}px ${Math.max(0, right)}px ${Math.max(0, bottom)}px ${Math.max(0, left)}px)`,
  }
})

const isFrame = computed(() => props.element.type === 'frame')

function onMouseDown(e: MouseEvent): void {
  if (cms.state.preview) return
  if (props.element.locked || props.isEditing) return
  e.stopPropagation()

  // First click selects only — drag only starts when already selected
  if (!props.isSelected) {
    cms.select(props.element.id)
    return
  }

  cms.select(props.element.id)

  const z = cms.state.zoom
  const startX = e.clientX, startY = e.clientY
  const origX = props.element.x, origY = props.element.y
  const prev = cloneEl(cms.state.elements)
  let moved = false

  const onMove = (ev: MouseEvent): void => {
    moved = true
    const rawX = origX + (ev.clientX - startX) / z
    const rawY = origY + (ev.clientY - startY) / z
    const skipSnap = ev.altKey || modKeys.altDown.value
    if (skipSnap) {
      cms.clearGuides()
      cms.move(props.element.id, rawX, rawY)
      return
    }
    const siblings = cms.state.elements.filter(e => e.id !== props.element.id && cms.isEffectivelyVisible(e.id))
    const snap = computeSnap(
      { x: rawX, y: rawY, width: props.element.width, height: props.element.height },
      siblings, cms.state.canvasWidth, cms.effectiveHeight.value,
      6 / z,
    )
    cms.setGuides(snap.guides)
    cms.move(props.element.id, snap.x, snap.y)
  }
  const onUp = (): void => {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
    cms.clearGuides()
    if (moved) {
      cms.autoReparent(props.element.id)
      cms.pushSnapshot(prev)
    }
  }
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

function onDblClick(): void {
  if (cms.state.preview) return
  if (props.element.locked) return
  if (props.element.type === 'text' || props.element.type === 'shape' || props.element.type === 'code' || props.element.type === 'button') {
    cms.setEditing(props.element.id)
  }
}
</script>

<template>
  <div
    :class="['canvas-el', { selected: isSelected && !cms.state.preview, editing: isEditing, locked: element.locked, preview: cms.state.preview, responsive: element.responsive }]"
    :style="{
      position: 'absolute',
      left: element.x + 'px', top: element.y + 'px',
      width: element.width + 'px', height: element.height + 'px',
      opacity: element.styles.opacity != null ? element.styles.opacity : 1,
      ...clipStyle,
    }"
    @mousedown="onMouseDown"
    @dblclick="onDblClick"
  >
    <!-- Floating frame label — click to select the frame without starting a drag -->
    <div v-if="isFrame && !cms.state.preview" class="canvas-el-frame-label"
      @mousedown.stop="cms.select(element.id)">
      {{ element.name || 'Frame' }}
    </div>
    <component :is="activeRenderer" :element="element" :is-editing="isEditing" />
    <ResizeHandles v-if="isSelected && !element.locked && !isEditing && !cms.state.preview" :element="element" />
  </div>
</template>
