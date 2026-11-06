<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import 'highlight.js/styles/atom-one-dark.css'
import { useCms } from '../composables/useCms'
import { renderHtml, renderFlowHtml } from '../composables/renderHtml'

const cms = useCms()
const scrollRef = ref<HTMLElement | null>(null)

function onWheel(e: WheelEvent): void {
  if (!e.ctrlKey && !e.metaKey) return
  e.preventDefault()
  cms.setPreviewZoom(e.deltaY > 0 ? -0.1 : 0.1)
}

onMounted(() => {
  // passive:false required to call preventDefault on wheel
  scrollRef.value?.addEventListener('wheel', onWheel, { passive: false })
})
onUnmounted(() => {
  scrollRef.value?.removeEventListener('wheel', onWheel)
})

const payload = computed(() => ({
  canvas: {
    width: cms.state.canvasWidth,
    height: cms.state.canvasHeight,
    flexibleHeight: cms.state.flexibleHeight,
  },
  elements: cms.state.elements,
}))

const html = computed(() =>
  cms.state.previewResponsive ? renderFlowHtml(payload.value) : renderHtml(payload.value),
)
</script>

<template>
  <div class="preview-view">
    <div ref="scrollRef" class="preview-scroll">
      <div
        class="preview-stage"
        :class="{ 'preview-stage--flow': cms.state.previewResponsive }"
        :style="{ transform: `scale(${cms.state.previewZoom})`, transformOrigin: 'top center' }"
        v-html="html"
      ></div>
    </div>
  </div>
</template>

<style scoped>
.preview-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  overflow: hidden;
  position: relative;
}
.preview-scroll {
  flex: 1;
  overflow: auto;
  display: flex;
  justify-content: center;
  padding: 40px;
}
.preview-stage {
  flex-shrink: 0;
  box-shadow: var(--shadow-lg);
}
.preview-stage--flow {
  width: 100%;
  max-width: 100%;
  box-shadow: none;
}
</style>
