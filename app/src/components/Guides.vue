<script setup lang="ts">
import { useCms } from '../composables/useCms'

const cms = useCms()
</script>

<template>
  <svg class="guides-svg" :width="cms.state.canvasWidth" :height="cms.effectiveHeight.value"
       :viewBox="`0 0 ${cms.state.canvasWidth} ${cms.effectiveHeight.value}`">
    <template v-for="(g, i) in cms.state.guides" :key="i">
      <line v-if="g.axis === 'x'"
        :x1="g.pos" :x2="g.pos" :y1="g.start" :y2="g.end"
        stroke="#FF3366" :stroke-width="1 / cms.state.zoom" shape-rendering="crispEdges" />
      <line v-else
        :y1="g.pos" :y2="g.pos" :x1="g.start" :x2="g.end"
        stroke="#FF3366" :stroke-width="1 / cms.state.zoom" shape-rendering="crispEdges" />
    </template>
  </svg>
</template>

<style scoped>
.guides-svg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 20;
  overflow: visible;
}
</style>
