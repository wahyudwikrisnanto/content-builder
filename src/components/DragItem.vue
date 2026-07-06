<script setup lang="ts">
import { useCms } from '../composables/useCms'
import { CmsFactories } from '../composables/factories'
import type { FactoryKey } from '../types'

const props = defineProps<{ type: FactoryKey; label: string }>()
const cms = useCms()

let clickOffset = 0

function onDragStart(e: DragEvent): void {
  e.dataTransfer?.setData('text/plain', props.type)
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'copy'
}

function onClick(): void {
  const y = 60 + (clickOffset % 6) * 80
  const x = 60 + (clickOffset % 3) * 40
  clickOffset++
  cms.addElement(CmsFactories[props.type](x, y))
}
</script>

<template>
  <div
    class="element-item"
    draggable="true"
    @dragstart="onDragStart"
    @click="onClick"
    :title="`Drag or click to add ${label}`"
  >
    <slot />
    <span class="element-item-label">{{ label }}</span>
  </div>
</template>
