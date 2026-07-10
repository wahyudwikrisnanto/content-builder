<script setup lang="ts">
import { radiusValue } from '../composables/styleHelpers'
import type { CmsElement } from '../types'
defineProps<{ element: CmsElement }>()
</script>

<template>
  <div
    :style="{
      width: '100%',
      height: '100%',
      backgroundColor: element.styles.backgroundColor,
      opacity: element.styles.opacity,
      borderRadius: radiusValue(element.styles.borderRadius),
    }"
  ></div>
</template>
