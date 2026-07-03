<script setup lang="ts">
import { computed } from 'vue'
import type { CSSProperties } from 'vue'
import type { CmsElement } from '../types'

const props = defineProps<{ element: CmsElement }>()

const style = computed<CSSProperties>(() => {
  const s = props.element.styles
  return {
    width: '100%', height: '100%',
    backgroundColor: s.backgroundColor || '#FFFFFF',
    borderRadius: (s.borderRadius ?? 0) + 'px',
    border: s.borderWidth ? `${s.borderWidth}px solid ${s.borderColor || '#D4D4D4'}` : '1px solid #D4D4D4',
    opacity: s.opacity ?? 1,
    position: 'relative',
    overflow: props.element.clipContent ? 'hidden' : 'visible',
  }
})
</script>

<template>
  <div :style="style" />
</template>
