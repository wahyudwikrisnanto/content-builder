<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import 'highlight.js/styles/atom-one-dark.css'
import { useCms } from '../composables/useCms'
import { renderHtml, renderFlowHtml, bindCopyButtons } from '../composables/renderHtml'
import Icon from '../icons/Icon.vue'

const cms = useCms()
const stageRef = ref<HTMLElement | null>(null)
const responsive = ref(false)
let unbind: (() => void) | null = null

onMounted(() => { if (stageRef.value) unbind = bindCopyButtons(stageRef.value) })
onUnmounted(() => { unbind?.() })
watch(() => cms.state.elements.length, async () => {
  await nextTick()
  unbind?.()
  if (stageRef.value) unbind = bindCopyButtons(stageRef.value)
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
  responsive.value
    ? renderFlowHtml(payload.value)
    : renderHtml(payload.value),
)
</script>

<template>
  <div :class="['preview-view', { fullscreen: cms.state.previewFullscreen }]">
    <div class="preview-toolbar">
      <button
        :class="['icon-btn', { 'icon-btn-active': responsive }]"
        title="Toggle responsive (flow) layout"
        @click="responsive = !responsive"
      >
        <Icon name="responsive" :size="17" />
      </button>
      <button class="icon-btn" @click="cms.togglePreviewFullscreen()"
        :title="cms.state.previewFullscreen ? 'Exit fullscreen' : 'Fullscreen preview'">
        <Icon :name="cms.state.previewFullscreen ? 'minimize' : 'maximize'" :size="17" />
      </button>
      <button class="icon-btn" @click="cms.togglePreview()" title="Exit preview (Esc)">
        <Icon name="eye-off" :size="17" />
      </button>
    </div>
    <div class="preview-scroll">
      <div
        class="preview-stage"
        :class="{ 'preview-stage--flow': responsive }"
        ref="stageRef"
        v-html="html"
      ></div>
    </div>
  </div>
</template>

<style scoped>
.preview-view {
  flex: 1; display: flex; flex-direction: column;
  background: var(--bg); overflow: hidden;
  position: relative;
}
.preview-view.fullscreen {
  position: fixed; inset: 0; z-index: 9999; background: #fff;
}
.preview-toolbar {
  position: absolute; top: 12px; right: 12px;
  display: flex; gap: 4px;
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  padding: 4px;
  box-shadow: var(--shadow);
  z-index: 10;
}
.preview-scroll {
  flex: 1; overflow: auto;
  display: flex; justify-content: center;
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
.preview-view.fullscreen .preview-scroll { padding: 0; }
.preview-view.fullscreen .preview-stage { box-shadow: none; }
</style>
