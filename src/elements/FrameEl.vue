<script setup lang="ts">
import { computed } from 'vue'
import type { CSSProperties } from 'vue'
import { useCms } from '../composables/useCms'
import type { CmsElement } from '../types'

const props = defineProps<{ element: CmsElement }>()
const cms = useCms()

const style = computed<CSSProperties>(() => {
  const s = props.element.styles
  const bw = s.borderWidth ?? 0
  return {
    width: '100%', height: '100%',
    backgroundColor: s.backgroundColor || 'transparent',
    borderRadius: (s.borderRadius ?? 0) + 'px',
    border: bw > 0 ? `${bw}px solid ${s.borderColor || '#D4D4D4'}` : 'none',
    opacity: s.opacity ?? 1,
    position: 'relative',
    overflow: props.element.clipContent ? 'hidden' : 'visible',
  }
})

// Dotted guide border: shown in builder only when no real border set, so the frame
// is still visible when unselected. Hidden in preview/export.
const showGuide = computed(() => !cms.state.preview && (props.element.styles.borderWidth ?? 0) === 0)
</script>

<template>
  <div :style="style">
    <div v-if="showGuide" class="frame-guide" />
  </div>
</template>

<style scoped>
.frame-guide {
  position: absolute;
  inset: 0;
  border: 1px dashed #C4C4C4;
  border-radius: inherit;
  pointer-events: none;
}
</style>
