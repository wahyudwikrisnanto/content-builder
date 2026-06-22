<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useCms } from './composables/useCms'
import { useModifierKeys } from './composables/useModifierKeys'
import Toolbar from './components/Toolbar.vue'
import Sidebar from './components/Sidebar.vue'
import Canvas from './components/Canvas.vue'
import Properties from './components/Properties.vue'
import PreviewView from './components/PreviewView.vue'

const cms = useCms()
useModifierKeys()

function onKey(e: KeyboardEvent): void {
  const tag = document.activeElement?.tagName
  const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
  const isCE = (document.activeElement as HTMLElement | null)?.contentEditable === 'true'
  const mod = e.ctrlKey || e.metaKey

  if (e.key === 'z' && mod && !e.shiftKey) { e.preventDefault(); cms.undo(); return }
  if ((e.key === 'z' && mod && e.shiftKey) || (e.key === 'y' && mod)) { e.preventDefault(); cms.redo(); return }

  if (isInput || isCE) {
    if (e.key === 'Escape' && isCE) (document.activeElement as HTMLElement | null)?.blur()
    return
  }
  if (e.key === 'a' && mod) {
    e.preventDefault(); cms.selectAll(); return
  }
  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (cms.state.allSelected) { e.preventDefault(); cms.deleteAll(); return }
    if (cms.state.selectedIds.length) { e.preventDefault(); cms.deleteSelected(); return }
    if (cms.state.selectedId) { e.preventDefault(); cms.deleteElement(cms.state.selectedId) }
  }
  if (e.key === 'Escape') {
    if (cms.state.previewFullscreen) cms.togglePreviewFullscreen()
    else if (cms.state.preview) cms.togglePreview()
    else if (cms.state.fullscreen) cms.toggleFullscreen()
    else { cms.select(null); cms.state.allSelected = false; cms.state.selectedIds = [] }
  }
  if (e.key === 'd' && mod) {
    if (cms.state.selectedId) { e.preventDefault(); cms.duplicate(cms.state.selectedId) }
  }
}

onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div :class="['app', { fullscreen: cms.state.fullscreen, preview: cms.state.preview }]">
    <Toolbar v-if="!cms.state.preview || !cms.state.previewFullscreen" />
    <div class="main-area">
      <template v-if="cms.state.preview">
        <PreviewView />
      </template>
      <template v-else>
        <Sidebar v-if="!cms.state.fullscreen" />
        <Canvas />
        <Properties v-if="!cms.state.fullscreen" />
      </template>
    </div>
  </div>
</template>
