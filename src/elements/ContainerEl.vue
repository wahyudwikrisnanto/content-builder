<script setup lang="ts">
import { computed } from 'vue'
import type { CSSProperties } from 'vue'
import { borderRadiusCss } from '../composables/useBorderRadius'
import type { CmsElement } from '../types'

const props = defineProps<{ element: CmsElement }>()

const style = computed<CSSProperties>(() => {
  const s = props.element.styles
  return {
    width: '100%',
    height: '100%',
    backgroundColor: s.backgroundColor,
    borderRadius: borderRadiusCss(s.borderRadius),
    border: s.borderWidth ? `${s.borderWidth}px solid ${s.borderColor}` : 'none',
    opacity: s.opacity,
  }
})
</script>

<template>
  <div :style="style"></div>
</template>
