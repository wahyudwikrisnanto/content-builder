<script setup lang="ts">
import Icon from '../icons/Icon.vue'
import type { CmsElement } from '../types'

const props = defineProps<{ element: CmsElement; isEditing?: boolean }>()
void props
</script>

<template>
  <div :style="{ width: '100%', height: '100%', position: 'relative' }">
    <img
      v-if="element.content && !element.content.startsWith('data:')"
      :src="element.content"
      alt=""
      draggable="false"
      :style="{
        width: '100%',
        height: '100%',
        objectFit: element.styles.objectFit || 'cover',
        objectPosition: element.styles.objectPosition || 'center',
        borderRadius: element.styles.borderRadius + 'px',
        display: 'block',
      }"
    />
    <div v-else class="img-placeholder">
      <Icon name="image" :size="28" :style="{ opacity: 0.4 }" />
      <span>Double-click to set image</span>
    </div>
  </div>
</template>
