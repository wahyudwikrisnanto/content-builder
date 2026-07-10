<script setup lang="ts">
import { computed } from 'vue'
import type { CSSProperties } from 'vue'
import { Icon } from '@iconify/vue'
import { borderRadiusCss } from '../composables/useBorderRadius'
import type { CmsElement } from '../types'

const props = defineProps<{ element: CmsElement; isEditing: boolean }>()

const iconSize = computed(() => {
  const s = props.element.iconSize
  if (s && s > 0) return s
  return Math.min(props.element.width, props.element.height)
})

const wrapStyle = computed<CSSProperties>(() => ({
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: props.element.styles.color || '#222222',
  opacity: props.element.styles.opacity ?? 1,
  backgroundColor: props.element.styles.backgroundColor || 'transparent',
  borderRadius: borderRadiusCss(props.element.styles.borderRadius),
  border: props.element.styles.borderWidth
    ? `${props.element.styles.borderWidth}px solid ${props.element.styles.borderColor}`
    : 'none',
  boxSizing: 'border-box' as const,
}))
</script>

<template>
  <div :style="wrapStyle">
    <Icon
      :icon="element.iconName || 'mdi:square-outline'"
      :width="iconSize"
      :height="iconSize"
    />
  </div>
</template>
