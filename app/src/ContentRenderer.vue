<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import 'highlight.js/styles/atom-one-dark.css'
import { renderHtml, bindCopyButtons } from './composables/renderHtml'

const props = defineProps<{
  json: string
}>()

const rootRef = ref<HTMLElement | null>(null)
let unbind: (() => void) | null = null

const html = computed(() => {
  if (!props.json) return ''
  try {
    const data = JSON.parse(props.json)
    if (!data?.elements || !data?.canvas) return ''
    return renderHtml({ canvas: data.canvas, elements: data.elements })
  } catch {
    return ''
  }
})

function rebind(): void {
  unbind?.()
  if (rootRef.value) unbind = bindCopyButtons(rootRef.value)
}

onMounted(rebind)
onUnmounted(() => unbind?.())
watch(html, () => nextTick(rebind))
</script>

<template>
  <div ref="rootRef" class="content-renderer" v-html="html" />
</template>
