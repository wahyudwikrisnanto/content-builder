<script setup lang="ts">
import { computed } from 'vue'
import type { CSSProperties } from 'vue'
import { useCms } from '../composables/useCms'
import type { CmsElement } from '../types'

const props = defineProps<{ element: CmsElement }>()
const cms = useCms()

const style = computed<CSSProperties>(() => {
  const s = props.element.styles
  const bw = s.borderWidth ?? 0
  return {
    width: '100%', height: '100%',
    backgroundColor: s.backgroundColor || 'transparent',
    borderRadius: (s.borderRadius ?? 0) + 'px',
    border: bw > 0 ? `${bw}px solid ${s.borderColor || '#D4D4D4'}` : 'none',
    opacity: s.opacity ?? 1,
    position: 'relative',
    overflow: props.element.clipContent ? 'hidden' : 'visible',
  }
})

// Dotted guide border: shown in builder only when no real border set, so the frame
// is still visible when unselected. Hidden in preview/export.
const showGuide = computed(() => !cms.state.preview && (props.element.styles.borderWidth ?? 0) === 0)

// Layout guides (padding fills + gap bars) — show when the frame OR any of its
// direct children is selected. Lets you match padding when resizing a child.
const isSelected = computed(() => cms.state.selectedId === props.element.id)
const childSelected = computed(() => {
  const sid = cms.state.selectedId
  if (!sid) return false
  const sel = cms.state.elements.find(e => e.id === sid)
  return sel?.parentId === props.element.id
})
const layoutOn = computed(() => (props.element.layoutDirection ?? 'none') !== 'none')
const hasAnyPadding = computed(() => {
  const s = props.element.styles
  return (s.padding ?? 0) > 0 || (s.paddingTop ?? 0) > 0 || (s.paddingRight ?? 0) > 0 ||
         (s.paddingBottom ?? 0) > 0 || (s.paddingLeft ?? 0) > 0
})
const showLayoutGuides = computed(() =>
  !cms.state.preview && (isSelected.value || childSelected.value) &&
  (layoutOn.value || (childSelected.value && hasAnyPadding.value))
)

const pad = computed(() => {
  const s = props.element.styles
  const base = s.padding
  return {
    t: s.paddingTop    ?? base ?? 0,
    r: s.paddingRight  ?? base ?? 0,
    b: s.paddingBottom ?? base ?? 0,
    l: s.paddingLeft   ?? base ?? 0,
  }
})

// Gap bars between consecutive children (in local frame coords)
const gapRects = computed<CSSProperties[]>(() => {
  if (!showLayoutGuides.value) return []
  const gap = props.element.layoutGap ?? 8
  if (gap <= 0) return []
  const dir = props.element.layoutDirection
  const kids = cms.state.elements
    .filter(e => e.parentId === props.element.id)
    .sort((a, b) => dir === 'vertical' ? a.y - b.y : a.x - b.x)
  if (kids.length < 2) return []

  const rects: CSSProperties[] = []
  const p = pad.value
  for (let i = 0; i < kids.length - 1; i++) {
    const a = kids[i]
    if (dir === 'vertical') {
      const top = (a.y + a.height) - props.element.y
      rects.push({
        top: top + 'px',
        left: p.l + 'px',
        width: `calc(100% - ${p.l + p.r}px)`,
        height: gap + 'px',
      })
    } else {
      const left = (a.x + a.width) - props.element.x
      rects.push({
        top: p.t + 'px',
        left: left + 'px',
        width: gap + 'px',
        height: `calc(100% - ${p.t + p.b}px)`,
      })
    }
  }
  return rects
})
</script>

<template>
  <div :style="style">
    <div v-if="showGuide" class="frame-guide" />

    <!-- Padding guides — colored fills at each edge -->
    <template v-if="showLayoutGuides">
      <div v-if="pad.t > 0" class="pad-guide" :style="{ top: 0, left: 0, width: '100%', height: pad.t + 'px' }" />
      <div v-if="pad.r > 0" class="pad-guide" :style="{ top: pad.t + 'px', right: 0, width: pad.r + 'px', height: `calc(100% - ${pad.t + pad.b}px)` }" />
      <div v-if="pad.b > 0" class="pad-guide" :style="{ bottom: 0, left: 0, width: '100%', height: pad.b + 'px' }" />
      <div v-if="pad.l > 0" class="pad-guide" :style="{ top: pad.t + 'px', left: 0, width: pad.l + 'px', height: `calc(100% - ${pad.t + pad.b}px)` }" />

      <!-- Gap guides between children -->
      <div v-for="(r, i) in gapRects" :key="'g' + i" class="gap-guide" :style="r" />
    </template>
  </div>
</template>

<style scoped>
.frame-guide {
  position: absolute;
  inset: 0;
  border: 1px dashed #C4C4C4;
  border-radius: inherit;
  pointer-events: none;
}
.pad-guide {
  position: absolute;
  background: rgba(37, 99, 235, 0.08);
  border: 1px dashed rgba(37, 99, 235, 0.55);
  pointer-events: none;
  box-sizing: border-box;
}
.gap-guide {
  position: absolute;
  background: rgba(37, 99, 235, 0.08);
  border: 1px dashed rgba(37, 99, 235, 0.55);
  pointer-events: none;
  box-sizing: border-box;
}
</style>
