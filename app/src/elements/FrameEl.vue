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
  }
})
</script>

<template>
  <div :style="style">
    <div class="frame-label">{{ element.name || 'Frame' }}</div>
  </div>
</template>

<style scoped>
.frame-label {
  position: absolute;
  left: 0;
  top: -18px;
  font-size: 11px;
  color: var(--text-2);
  font-weight: 500;
  pointer-events: none;
  user-select: none;
  white-space: nowrap;
}
</style>
