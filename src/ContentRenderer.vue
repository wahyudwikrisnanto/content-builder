<script setup lang="ts">
import { computed, ref } from 'vue'
import 'highlight.js/styles/atom-one-dark.css'
import { renderHtml, renderFlowHtml } from './composables/renderHtml'

const props = defineProps<{
  json: string
  responsive?: boolean
}>()

const html = computed(() => {
  if (!props.json) return ''
  try {
    const data = JSON.parse(props.json)
    if (!data?.elements || !data?.canvas) return ''
    return props.responsive
      ? renderFlowHtml({ canvas: data.canvas, elements: data.elements })
      : renderHtml({ canvas: data.canvas, elements: data.elements })
  } catch {
    return ''
  }
})
</script>

<template>
  <div class="content-renderer" v-html="html" />
</template>
