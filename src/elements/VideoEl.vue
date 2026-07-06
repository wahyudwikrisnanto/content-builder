<script setup lang="ts">
import { computed } from 'vue'
import Icon from '../icons/Icon.vue'
import { useCms } from '../composables/useCms'
import type { CmsElement } from '../types'

const props = defineProps<{ element: CmsElement }>()
const cms = useCms()

const embedSrc = computed(() => {
  let src = props.element.content || ''
  if (src.includes('youtube.com/watch')) src = src.replace('watch?v=', 'embed/')
  if (src.includes('youtu.be/')) src = src.replace('youtu.be/', 'www.youtube.com/embed/')
  return src
})
</script>

<template>
  <iframe
    v-if="element.content"
    :src="embedSrc"
    :style="{
      width: '100%',
      height: '100%',
      border: 'none',
      borderRadius: element.styles.borderRadius + 'px',
      pointerEvents: cms.state.preview ? 'auto' : 'none',
    }"
    allowfullscreen
  ></iframe>
  <div v-else class="vid-placeholder">
    <Icon name="video" :size="28" :style="{ opacity: 0.5 }" />
    <span>Add video URL in properties</span>
  </div>
</template>
