<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import './style.css'
import './layout.css'
import { useCms } from './composables/useCms'
import { useModifierKeys } from './composables/useModifierKeys'
import { parseCKEditorHtml } from './composables/importCKEditor'
import { providePlugins } from './composables/usePlugins'
import { provideBuilderConfig } from './composables/useBuilderConfig'
import { resolveDefaultPreset } from './composables/config'
import Toolbar from './components/Toolbar.vue'
import Sidebar from './components/Sidebar.vue'
import Canvas from './components/Canvas.vue'
import Properties from './components/Properties.vue'
import PreviewView from './components/PreviewView.vue'
import type { CmsPlugin } from './composables/usePlugins'
import type { BuilderConfig } from './types'
import { fullscreenPortalRoot } from './composables/fullscreenPortal'

// NOTE: useCms() is a module-level singleton — safe for single-instance use.
// When packaging for multi-instance support, move state into provide/inject per component tree.

const props = defineProps<{ plugins?: CmsPlugin[]; config?: BuilderConfig }>()
const modelValue = defineModel<string>()

const emit = defineEmits<{
  change: [value: string]
}>()

const cms = useCms()
const rootRef = ref<HTMLElement | null>(null)
useModifierKeys()
providePlugins(props.plugins ?? [])
provideBuilderConfig(props.config)

// Guard against feedback loops between external modelValue changes and internal state watches
let _loading = false
let _lastEmittedJson = ''

// Exposed: convert CKEditor HTML → JSON string (use the result as v-model value)
function htmlToJson(html: string, width?: number): string {
  const result = parseCKEditorHtml(html, width ?? cms.state.canvasWidth)
  const payload = {
    version: 1,
    canvas: {
      width: result.width,
      height: result.height,
      flexibleHeight: false,
    },
    elements: result.elements,
  }
  return JSON.stringify(payload, null, 2)
}

defineExpose({ htmlToJson })

function syncFullscreen(): void {
  cms.state.fullscreen = document.fullscreenElement === rootRef.value
}

async function toggleFullscreen(): Promise<void> {
  const root = rootRef.value
  if (!root) return
  if (!root.requestFullscreen || !document.exitFullscreen) {
    cms.toggleFullscreen()
    return
  }
  try {
    if (document.fullscreenElement === root) await document.exitFullscreen()
    else await root.requestFullscreen()
  } catch {
    syncFullscreen()
  }
}

function exitOwnedFullscreen(): void {
  if (document.fullscreenElement === rootRef.value) void document.exitFullscreen()
}

// Load initial content once on mount
onMounted(() => {
  fullscreenPortalRoot.value = rootRef.value
  // Apply canvas height mode from config before loading content
  if (props.config?.canvasHeightMode === 'flexible') cms.state.flexibleHeight = true
  else if (props.config?.canvasHeightMode === 'fixed') cms.state.flexibleHeight = false

  if (modelValue.value) {
    _loading = true
    cms.importJson(modelValue.value)
    _loading = false
  } else {
    // Apply default canvas size preset only when no content is loaded
    const defaultPreset = resolveDefaultPreset(props.config?.canvasSizes)
    if (defaultPreset) cms.setCanvas(defaultPreset.w, defaultPreset.h)
  }
  window.addEventListener('keydown', onKey)
  document.addEventListener('fullscreenchange', syncFullscreen)
})

onUnmounted(() => {
  exitOwnedFullscreen()
  window.removeEventListener('keydown', onKey)
  document.removeEventListener('fullscreenchange', syncFullscreen)
})

// Sync external modelValue → internal state (e.g. parent replaces content)
watch(modelValue, (val) => {
  if (!val || _loading) return
  if (val === _lastEmittedJson) return
  _loading = true
  cms.importJson(val)
  _lastEmittedJson = val
  _loading = false
})

// Sync internal state → modelValue (deep watch covers element edits)
watch(
  () =>
    [
      cms.state.elements,
      cms.state.canvasWidth,
      cms.state.canvasHeight,
      cms.state.flexibleHeight,
    ] as const,
  () => {
    if (_loading) return
    const json = cms.exportJson()
    _lastEmittedJson = json
    modelValue.value = json
    emit('change', json)
  },
  { deep: true },
)

function onKey(e: KeyboardEvent): void {
  const tag = document.activeElement?.tagName
  const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
  const isCE = (document.activeElement as HTMLElement | null)?.contentEditable === 'true'
  const mod = e.ctrlKey || e.metaKey

  if (e.key === 'z' && mod && !e.shiftKey) {
    e.preventDefault()
    cms.undo()
    return
  }
  if ((e.key === 'z' && mod && e.shiftKey) || (e.key === 'y' && mod)) {
    e.preventDefault()
    cms.redo()
    return
  }

  if (isInput || isCE) {
    if (e.key === 'Escape') (document.activeElement as HTMLElement | null)?.blur()
    return
  }
  if (e.key === 'a' && mod) {
    e.preventDefault()
    cms.selectAll()
    return
  }
  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (cms.state.allSelected) {
      e.preventDefault()
      cms.deleteAll()
      return
    }
    if (cms.state.selectedIds.length) {
      e.preventDefault()
      cms.deleteSelected()
      return
    }
    if (cms.state.selectedId) {
      e.preventDefault()
      cms.deleteElement(cms.state.selectedId)
    }
  }
  if (e.key === 'Escape') {
    if (cms.state.fullscreen) {
      if (document.fullscreenElement) void document.exitFullscreen()
      else cms.toggleFullscreen()
      return
    }
    if (cms.state.preview) cms.togglePreview()
    else {
      cms.select(null)
      cms.state.allSelected = false
      cms.state.selectedIds = []
    }
  }
  if (e.key === 'd' && mod) {
    if (cms.state.selectedId) {
      e.preventDefault()
      cms.duplicate(cms.state.selectedId)
    }
  }
  if (e.key === 'g' && mod && cms.state.selectedIds.length > 1) {
    e.preventDefault()
    cms.groupSelection()
  }
}
</script>

<template>
  <div
    ref="rootRef"
    :class="['cb-root cb-root-var', { fullscreen: cms.state.fullscreen, preview: cms.state.preview }]"
  >
    <Toolbar @toggle-fullscreen="toggleFullscreen" />
    <div class="main-area">
      <template v-if="cms.state.preview">
        <PreviewView />
      </template>
      <template v-else>
        <Sidebar v-if="!cms.state.sidebarHidden" />
        <Canvas />
        <Properties v-if="!cms.state.propertiesHidden" />
      </template>
    </div>
  </div>
</template>
