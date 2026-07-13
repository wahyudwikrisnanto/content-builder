<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { borderRadiusCss } from '../composables/useBorderRadius'
import { useDebouncedIconName } from '../composables/useDebouncedIconName'
import type { CmsElement } from '../types'

const props = defineProps<{ element: CmsElement; isEditing: boolean }>()

const s = computed(() => props.element.styles)
const iconName = computed(() => props.element.iconName?.trim() || '')
const debouncedName = useDebouncedIconName(iconName)

const resolved = computed(() => (debouncedName.value.includes(':') ? debouncedName.value : 'lucide:circle'))
</script>

<template>
  <div
    :style="{
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: s.color || '#222222',
      opacity: s.opacity ?? 1,
      backgroundColor: s.backgroundColor || 'transparent',
      borderRadius: borderRadiusCss(s.borderRadius),
      border: s.borderWidth ? `${s.borderWidth}px solid ${s.borderColor}` : 'none',
      boxSizing: 'border-box',
    }"
  >
    <Icon :icon="resolved" width="100%" height="100%" />
  </div>
</template>
