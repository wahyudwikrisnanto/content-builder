<script setup lang="ts">
import { ref, onMounted } from 'vue'
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

onMounted(() => {
  const el = scrollRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const padX = 80, padY = 100
  const fitZoom = Math.min(
    (rect.width - padX) / cms.state.canvasWidth,
    (rect.height - padY) / cms.state.canvasHeight,
    1,
  )
  const rounded = Math.round(fitZoom * 20) / 20
  if (rounded < 1) cms.setZoom(Math.max(0.25, rounded))
})

function onDrop(e: DragEvent): void {
  e.preventDefault(); dragOver.value = false
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

  const file = e.dataTransfer.files?.[0]
  if (file && file.type.startsWith('image/')) {
    const reader = new FileReader()
    reader.onload = (ev) => {
      const el = CmsFactories.image(Math.max(0, x - 100), Math.max(0, y - 80))
      el.content = ev.target?.result as string
      cms.addElement(el)
    }
    reader.readAsDataURL(file)
  }
}

function onCanvasClick(e: MouseEvent): void {
  const t = e.target as HTMLElement
  if (t === canvasRef.value || t.classList.contains('canvas-inner')) cms.select(null)
}
</script>

<template>
  <div class="workspace">
    <div class="canvas-scroll" ref="scrollRef">
      <div class="canvas-wrapper"
        :style="{ width: cms.state.canvasWidth * cms.state.zoom + 'px',
                  height: cms.effectiveHeight.value * cms.state.zoom + 'px' }">
        <div
          ref="canvasRef"
          :class="['canvas', { 'drag-over': dragOver }]"
          :style="{ width: cms.state.canvasWidth + 'px',
                    height: cms.effectiveHeight.value + 'px',
                    transform: `scale(${cms.state.zoom})`,
                    transformOrigin: 'top left' }"
          @click="onCanvasClick"
          @dragover.prevent="dragOver = true"
          @dragleave="dragOver = false"
          @drop="onDrop"
        >
          <div class="canvas-inner" :style="{ position: 'absolute', inset: 0 }"></div>

          <template v-for="el in cms.state.elements" :key="el.id">
            <CanvasElement v-if="cms.isEffectivelyVisible(el.id)" :element="el"
              :is-selected="el.id === cms.state.selectedId"
              :is-editing="el.id === cms.state.editingTextId" />
          </template>

          <Guides />

          <div v-if="!cms.state.elements.length && !dragOver" class="canvas-empty">
            <Icon name="move" :size="32" :style="{ opacity: 0.2 }" />
            <p>Drag elements here<br/>or click from sidebar</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
