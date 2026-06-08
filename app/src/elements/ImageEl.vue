<script setup lang="ts">
import { ref } from 'vue'
import { useCms } from '../composables/useCms'
import Icon from '../icons/Icon.vue'
import type { CmsElement } from '../types'

const props = defineProps<{ element: CmsElement }>()
const cms = useCms()
const fileRef = ref<HTMLInputElement | null>(null)

function onFile(e: Event): void {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => cms.updateElement(props.element.id, { content: ev.target?.result as string })
  reader.readAsDataURL(file)
}

function trigger(e: MouseEvent): void { e.stopPropagation(); fileRef.value?.click() }
</script>

<template>
  <img v-if="element.content" :src="element.content" alt="" draggable="false"
    :style="{ width: '100%', height: '100%', objectFit: element.styles.objectFit || 'cover',
              borderRadius: element.styles.borderRadius + 'px', display: 'block' }" />
  <div v-else class="img-placeholder" @click="trigger">
    <Icon name="image" :size="28" :style="{ opacity: 0.4 }" />
    <span>Click to upload</span>
    <input ref="fileRef" type="file" accept="image/*" hidden @change="onFile" />
  </div>
</template>
