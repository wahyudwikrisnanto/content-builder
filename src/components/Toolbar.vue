<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useCms } from '../composables/useCms'
import { useBuilderConfig } from '../composables/useBuilderConfig'
import Icon from '../icons/Icon.vue'
import ImportModal from './ImportModal.vue'
import type { CanvasPreset } from '../types'

const cms = useCms()
const config = useBuilderConfig()
const showPresets = ref(false)
const dropRef = ref<HTMLDivElement | null>(null)
const scaleOnPreset = ref(true)

const BUILT_IN_PRESETS: CanvasPreset[] = [
  { label: 'Blog Post', w: 800, h: 1200 },
  { label: 'Landing Page', w: 1440, h: 900 },
  { label: 'Email', w: 600, h: 800 },
  { label: 'Square', w: 1080, h: 1080 },
  { label: 'Story', w: 1080, h: 1920 },
  { label: 'Mobile', w: 375, h: 812 },
  { label: 'Tablet', w: 768, h: 1024 },
  { label: 'A4 Portrait', w: 794, h: 1123 },
]

const presets = computed<CanvasPreset[]>(() =>
  config.canvasSizes?.length ? config.canvasSizes : BUILT_IN_PRESETS,
)
const singlePreset = computed(() => presets.value.length === 1)
const showScaleToggle = computed(() => config.showScaleToggle !== false)

function onDocClick(e: MouseEvent): void {
  const t = e.target as Node
  if (showPresets.value && dropRef.value && !dropRef.value.contains(t)) showPresets.value = false
  if (showExport.value && exportDropRef.value && !exportDropRef.value.contains(t))
    showExport.value = false
  if (showImport.value && importDropRef.value && !importDropRef.value.contains(t))
    showImport.value = false
}

function applyPreset(p: CanvasPreset): void {
  if (scaleOnPreset.value) {
    cms.scaleElements(p.w, p.h)
  } else {
    cms.setCanvas(p.w, p.h)
  }
  showPresets.value = false
}

type Format = 'json' | 'ckeditor'
const showExport = ref(false)
const showImport = ref(false)
const exportDropRef = ref<HTMLDivElement | null>(null)
const importDropRef = ref<HTMLDivElement | null>(null)
const importModalFormat = ref<Format | null>(null)

function download(content: string, mime: string, ext: string): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  a.download = `content-${ts}.${ext}`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function doExport(fmt: Format): void {
  showExport.value = false
  if (fmt === 'json') download(cms.exportJson(), 'application/json', 'json')
  else download(cms.exportCKEditorHtml(), 'text/html', 'html')
}

function openImport(fmt: Format): void {
  showImport.value = false
  importModalFormat.value = fmt
}

function onImportSubmit(text: string): void {
  const fmt = importModalFormat.value
  if (!fmt) return
  const r = fmt === 'ckeditor' ? cms.importCKEditorHtml(text) : cms.importJson(text)
  if (!r.ok) {
    alert('Import failed: ' + (r.error || 'unknown'))
    return
  }
  importModalFormat.value = null
}

onMounted(() => document.addEventListener('mousedown', onDocClick))
onUnmounted(() => document.removeEventListener('mousedown', onDocClick))
</script>

<template>
  <div class="toolbar">
    <div class="toolbar-brand">
      <Icon name="grid" :size="18" />
      <span>Builder</span>
    </div>

    <div class="toolbar-divider"></div>

    <div class="toolbar-group">
      <button
        class="icon-btn"
        :disabled="!cms.canUndo.value"
        @click="cms.undo()"
        title="Undo (Ctrl+Z)"
      >
        <Icon name="undo" :size="17" />
      </button>
      <button
        class="icon-btn"
        :disabled="!cms.canRedo.value"
        @click="cms.redo()"
        title="Redo (Ctrl+Shift+Z)"
      >
        <Icon name="redo" :size="17" />
      </button>
    </div>

    <div class="toolbar-divider"></div>

    <div class="canvas-size-selector" ref="dropRef">
      <button
        class="canvas-size-btn"
        :disabled="singlePreset"
        @click="!singlePreset && (showPresets = !showPresets)"
      >
        <span>{{ cms.state.canvasWidth }} × {{ cms.state.canvasHeight }}</span>
        <Icon v-if="!singlePreset" name="chevron-down" :size="14" />
      </button>
      <div v-if="showPresets && !singlePreset" class="canvas-size-dropdown">
        <div class="dropdown-label">Canvas presets</div>
        <button
          v-for="p in presets"
          :key="p.label"
          class="canvas-size-option"
          @click="applyPreset(p)"
        >
          <span>{{ p.label }}</span>
          <span class="dims">{{ p.w }}×{{ p.h }}</span>
        </button>
        <template v-if="showScaleToggle">
          <div class="dropdown-divider"></div>
          <label class="dropdown-toggle-row" @mousedown.prevent>
            <input type="checkbox" v-model="scaleOnPreset" />
            <span>Scale content to fit</span>
          </label>
        </template>
      </div>
    </div>

    <div class="toolbar-spacer"></div>

    <div class="toolbar-group">
      <button class="icon-btn" @click="cms.setZoom(cms.state.zoom - 0.1)" title="Zoom Out">
        <Icon name="minus" :size="16" />
      </button>
      <span class="zoom-label">{{ Math.round(cms.state.zoom * 100) }}%</span>
      <button class="icon-btn" @click="cms.setZoom(cms.state.zoom + 0.1)" title="Zoom In">
        <Icon name="plus" :size="16" />
      </button>
    </div>

    <div class="toolbar-divider"></div>

    <div class="toolbar-group">
      <button
        :class="['icon-btn', { 'icon-btn-active': cms.state.sidebarHidden }]"
        @click="cms.toggleSidebar()"
        title="Toggle sidebar"
      >
        <Icon name="sidebar-left" :size="17" />
      </button>
      <button
        :class="['icon-btn', { 'icon-btn-active': cms.state.preview }]"
        @click="cms.togglePreview()"
        :title="cms.state.preview ? 'Exit preview (Esc)' : 'Preview mode'"
      >
        <Icon name="eye" :size="17" />
      </button>
      <button
        :class="['icon-btn', { 'icon-btn-active': cms.state.flexibleHeight }]"
        @click="cms.toggleFlexibleHeight()"
        :title="cms.state.flexibleHeight ? 'Fixed height' : 'Flexible height'"
      >
        <Icon name="flex-height" :size="17" />
      </button>
      <button
        :class="['icon-btn', { 'icon-btn-active': cms.state.fullscreen }]"
        @click="cms.toggleFullscreen()"
        :title="cms.state.fullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen canvas'"
      >
        <Icon :name="cms.state.fullscreen ? 'minimize' : 'maximize'" :size="17" />
      </button>
    </div>

    <div class="toolbar-divider"></div>

    <div class="toolbar-group">
      <div class="fmt-menu" ref="importDropRef">
        <button
          class="icon-btn"
          @click="showImport = !showImport; showExport = false"
          title="Import"
        >
          <Icon name="upload" :size="17" />
          <Icon name="chevron-down" :size="11" />
        </button>
        <div v-if="showImport" class="fmt-dropdown">
          <div class="dropdown-label">Import from</div>
          <button class="fmt-option" @click="openImport('json')">
            <Icon name="download" :size="14" />
            <span>JSON design</span>
          </button>
          <button class="fmt-option" @click="openImport('ckeditor')">
            <Icon name="code" :size="14" />
            <span>CKEditor HTML</span>
          </button>
        </div>
      </div>

      <div class="fmt-menu" ref="exportDropRef">
        <button
          class="icon-btn"
          @click="showExport = !showExport; showImport = false"
          title="Export"
        >
          <Icon name="download" :size="17" />
          <Icon name="chevron-down" :size="11" />
        </button>
        <div v-if="showExport" class="fmt-dropdown">
          <div class="dropdown-label">Export as</div>
          <button class="fmt-option" @click="doExport('json')">
            <Icon name="download" :size="14" />
            <span>JSON design</span>
          </button>
          <button class="fmt-option" @click="doExport('ckeditor')">
            <Icon name="code" :size="14" />
            <span>CKEditor HTML</span>
          </button>
        </div>
      </div>
    </div>

    <ImportModal
      v-if="importModalFormat"
      :format="importModalFormat"
      @close="importModalFormat = null"
      @submit="(p) => onImportSubmit(p.text)"
    />
  </div>
</template>
