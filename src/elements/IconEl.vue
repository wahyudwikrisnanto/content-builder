<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Icon, loadIcon } from '@iconify/vue'
import type { CmsElement } from '../types'

const props = defineProps<{ element: CmsElement }>()

const s = computed(() => props.element.styles)
const iconName = computed(() => props.element.content?.trim() || '')
const valid = ref(true)

watch(
  iconName,
  async (name) => {
    if (!name || !name.includes(':')) { valid.value = false; return }
    try { await loadIcon(name); valid.value = true }
    catch { valid.value = false }
  },
  { immediate: true },
)

const resolved = computed(() => (valid.value && iconName.value ? iconName.value : 'lucide:circle-help'))
</script>

<template>
  <div
    :style="{
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: s.color || 'currentColor',
      opacity: s.opacity ?? 1,
    }"
  >
    <Icon :icon="resolved" :width="'100%'" :height="'100%'" />
  </div>
</template>
