<script setup lang="ts">
import { computed, ref } from 'vue'
import type { CSSProperties } from 'vue'
import { useCms } from '../composables/useCms'
import { useBuilderConfig } from '../composables/useBuilderConfig'
import { resolveVisibleSections, resolveSectionLabel } from '../composables/config'
import { CmsFactories } from '../composables/factories'
import Icon from '../icons/Icon.vue'
import DragItem from './DragItem.vue'
import type { CmsElement, ElementType, FactoryKey, SidebarTab, SidebarSection } from '../types'

const cms = useCms()
const config = useBuilderConfig()

interface Tab {
  id: SidebarSection
  label: string
  icon: string
}
const SECTION_ICONS: Record<SidebarSection, string> = {
  elements: 'plus',
  layers: 'layers',
  textStyles: 'type',
}

const visibleTabs = computed<Tab[]>(() =>
  resolveVisibleSections(config.sidebar).map((id) => ({
    id,
    label: resolveSectionLabel(id, config.sidebar),
    icon: SECTION_ICONS[id],
  })),
)

const TYPE_ICON: Record<ElementType, string> = {
  text: 'type',
  image: 'image',
  shape: 'square',
  video: 'video',
  divider: 'divider',
  container: 'container',
  frame: 'frame',
  code: 'code',
  button: 'button',
  input: 'input',
}

interface TextPreset {
  key: FactoryKey
  label: string
  desc: string
  style: CSSProperties
}
const TEXT_PRESETS: TextPreset[] = [
  {
    key: 'text-heading',
    label: 'Heading',
    desc: 'Bold, 36px',
    style: { fontSize: '18px', fontWeight: 700 },
  },
  {
    key: 'text-subheading',
    label: 'Subheading',
    desc: 'Semibold, 22px',
    style: { fontSize: '14px', fontWeight: 600 },
  },
  {
    key: 'text-body',
    label: 'Body text',
    desc: 'Regular, 16px',
    style: { fontSize: '13px', fontWeight: 400 },
  },
  {
    key: 'text-caption',
    label: 'Caption',
    desc: 'Regular, 12px · Gray',
    style: { fontSize: '11px', fontWeight: 400, color: '#717171' },
  },
]

interface LayerNode {
  el: CmsElement
  depth: number
}

const layerTree = computed<LayerNode[]>(() => {
  const els = cms.state.elements
  const byParent = new Map<string | null, CmsElement[]>()
  for (const e of els) {
    const p = e.parentId ?? null
    const arr = byParent.get(p) ?? []
    arr.push(e)
    byParent.set(p, arr)
  }
  const out: LayerNode[] = []
  const walk = (parent: string | null, depth: number): void => {
    const children = byParent.get(parent) ?? []
    // reverse so topmost (highest index) shown first
    for (let i = children.length - 1; i >= 0; i--) {
      const c = children[i]
      out.push({ el: c, depth })
      walk(c.id, depth + 1)
    }
  }
  walk(null, 0)
  return out
})

function layerName(el: CmsElement): string {
  // Explicit user name wins for every element type
  if (el.name) return el.name
  if (el.type === 'text') return (el.content || '').slice(0, 24) || 'Text'
  if (el.type === 'button') return (el.content || '').slice(0, 24) || 'Button'
  if (el.type === 'shape')
    return el.shapeType === 'circle' ? 'Circle' : el.shapeType === 'line' ? 'Line' : 'Rectangle'
  if (el.type === 'frame') return 'Frame'
  return el.type.charAt(0).toUpperCase() + el.type.slice(1)
}

type DropPos = 'before' | 'after' | 'inside'
const dragId = ref<string | null>(null)
const dropOver = ref<{ id: string; pos: DropPos } | null>(null)

function onLayerDragStart(e: DragEvent, id: string): void {
  dragId.value = id
  e.dataTransfer?.setData('text/plain', `layer:${id}`)
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}
function onLayerDragOver(e: DragEvent, targetId: string, isFrame: boolean): void {
  if (!dragId.value || dragId.value === targetId) return
  e.preventDefault()
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const y = e.clientY - rect.top
  const h = rect.height
  let pos: DropPos
  if (isFrame) {
    // Frame: top/bottom 5px = sibling gaps, entire body = inside (drop as frame child)
    if (y < 5) pos = 'before'
    else if (y > h - 5) pos = 'after'
    else pos = 'inside'
  } else {
    pos = y < h / 2 ? 'before' : 'after'
  }
  dropOver.value = { id: targetId, pos }
}
function onLayerDrop(e: DragEvent, targetId: string): void {
  e.preventDefault()
  const id = dragId.value
  const dp = dropOver.value
  dragId.value = null
  dropOver.value = null
  if (!id || !dp || dp.id !== targetId) return
  // Translate UI position → array position: UI list is reversed of array order
  const arrayPos: DropPos =
    dp.pos === 'inside' ? 'inside' : dp.pos === 'before' ? 'after' : 'before'
  cms.moveLayer(id, targetId, arrayPos)
}
function onLayerDragEnd(): void {
  dragId.value = null
  dropOver.value = null
}

function addPreset(key: FactoryKey): void {
  cms.addElement(CmsFactories[key](cms.state.canvasWidth / 2 - 120, 80 + Math.random() * 100))
}

const presetColor = (s: CSSProperties): string => (s.color as string) || '#222'
</script>

<template>
  <div v-if="visibleTabs.length" class="sidebar">
    <div class="sidebar-tabs">
      <button
        v-for="t in visibleTabs"
        :key="t.id"
        :class="['sidebar-tab', { active: cms.state.sidebarTab === t.id }]"
        @click="cms.setTab(t.id as SidebarTab)"
      >
        <Icon :name="t.icon" :size="15" />
        <span>{{ t.label }}</span>
      </button>
    </div>

    <div class="sidebar-content">
      <div v-if="cms.state.sidebarTab === 'elements'">
        <div class="element-section">
          <div class="element-section-title">Text</div>
          <div class="element-grid">
            <DragItem type="text-heading" label="Heading">
              <span :style="{ fontSize: '16px', fontWeight: 700, color: '#222' }">Heading</span>
            </DragItem>
            <DragItem type="text-subheading" label="Subheading">
              <span :style="{ fontSize: '13px', fontWeight: 600, color: '#222' }">Subheading</span>
            </DragItem>
            <DragItem type="text-body" label="Body">
              <span :style="{ fontSize: '12px', fontWeight: 400, color: '#555' }">Body text</span>
            </DragItem>
            <DragItem type="text-caption" label="Caption">
              <span :style="{ fontSize: '11px', fontWeight: 400, color: '#999' }">Caption</span>
            </DragItem>
          </div>
        </div>

        <div class="element-section">
          <div class="element-section-title">Media</div>
          <div class="element-grid">
            <DragItem type="image" label="Image">
              <div class="element-item-icon"><Icon name="image" :size="24" /></div>
            </DragItem>
            <DragItem type="video" label="Video">
              <div class="element-item-icon"><Icon name="video" :size="24" /></div>
            </DragItem>
          </div>
        </div>

        <div class="element-section">
          <div class="element-section-title">Interactive</div>
          <div class="element-grid">
            <DragItem type="button" label="Button">
              <div class="element-item-icon"><Icon name="button" :size="22" /></div>
            </DragItem>
            <DragItem type="code" label="Code Block">
              <div class="element-item-icon"><Icon name="code" :size="22" /></div>
            </DragItem>
          </div>
        </div>

        <div class="element-section">
          <div class="element-section-title">Shapes</div>
          <div class="element-grid three-col">
            <DragItem type="shape-rect" label="Rectangle">
              <div
                :style="{
                  width: '28px',
                  height: '22px',
                  borderRadius: '4px',
                  background: '#E8E8E8',
                  border: '1.5px solid #CFCFCF',
                }"
              ></div>
            </DragItem>
            <DragItem type="shape-circle" label="Circle">
              <div
                :style="{
                  width: '24px',
                  height: '24px',
                  borderRadius: '999px',
                  background: '#E8E8E8',
                  border: '1.5px solid #CFCFCF',
                }"
              ></div>
            </DragItem>
            <DragItem type="shape-line" label="Line">
              <div
                :style="{
                  width: '28px',
                  height: '2px',
                  background: '#ABABAB',
                  borderRadius: '1px',
                }"
              ></div>
            </DragItem>
          </div>
        </div>

        <div class="element-section">
          <div class="element-section-title">Layout</div>
          <div class="element-grid">
            <DragItem type="frame" label="Frame">
              <div
                :style="{
                  width: '28px',
                  height: '22px',
                  borderRadius: '2px',
                  background: '#FFF',
                  border: '1.5px solid #8A8A8A',
                }"
              ></div>
            </DragItem>
            <DragItem type="divider" label="Divider">
              <div
                :style="{
                  width: '32px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  alignItems: 'center',
                }"
              >
                <div :style="{ width: '100%', height: '1px', background: '#D0D0D0' }"></div>
              </div>
            </DragItem>
          </div>
        </div>

        <div class="element-section">
          <div class="element-section-title">Forms</div>
          <div class="element-grid">
            <DragItem type="input-text" label="Text input">
              <div class="element-item-icon"><Icon name="input" :size="22" /></div>
            </DragItem>
            <DragItem type="input-email" label="Email">
              <div class="element-item-icon"><Icon name="input" :size="22" /></div>
            </DragItem>
            <DragItem type="input-password" label="Password">
              <div class="element-item-icon"><Icon name="input" :size="22" /></div>
            </DragItem>
            <DragItem type="input-number" label="Number">
              <div class="element-item-icon"><Icon name="input" :size="22" /></div>
            </DragItem>
            <DragItem type="input-textarea" label="Textarea">
              <div class="element-item-icon"><Icon name="input-textarea" :size="22" /></div>
            </DragItem>
            <DragItem type="input-select" label="Select">
              <div class="element-item-icon"><Icon name="input-select" :size="22" /></div>
            </DragItem>
            <DragItem type="input-checkbox" label="Checkbox">
              <div class="element-item-icon"><Icon name="input-checkbox" :size="22" /></div>
            </DragItem>
            <DragItem type="input-radio" label="Radio">
              <div class="element-item-icon"><Icon name="input-radio" :size="22" /></div>
            </DragItem>
          </div>
        </div>
      </div>

      <div v-else-if="cms.state.sidebarTab === 'layers'">
        <div v-if="!cms.state.elements.length" class="empty-panel">
          <Icon name="layers" :size="28" :style="{ opacity: 0.3 }" />
          <p>No layers yet</p>
          <p class="empty-sub">Add elements to see them here</p>
        </div>
        <div v-else class="layers-list">
          <div
            v-for="node in layerTree"
            :key="node.el.id"
            :class="[
              'layer-item',
              {
                active: node.el.id === cms.state.selectedId,
                'drop-before': dropOver?.id === node.el.id && dropOver.pos === 'before',
                'drop-after': dropOver?.id === node.el.id && dropOver.pos === 'after',
                'drop-inside': dropOver?.id === node.el.id && dropOver.pos === 'inside',
                dragging: dragId === node.el.id,
              },
            ]"
            :style="{ paddingLeft: 10 + node.depth * 14 + 'px' }"
            draggable="true"
            @click="cms.select(node.el.id)"
            @dragstart="onLayerDragStart($event, node.el.id)"
            @dragover="onLayerDragOver($event, node.el.id, node.el.type === 'frame')"
            @dragleave="dropOver = null"
            @drop="onLayerDrop($event, node.el.id)"
            @dragend="onLayerDragEnd"
          >
            <span
              class="layer-item-icon"
              :style="{ opacity: cms.isEffectivelyVisible(node.el.id) ? 1 : 0.3 }"
            >
              <Icon :name="TYPE_ICON[node.el.type]" :size="14" />
            </span>
            <span
              class="layer-item-name"
              :style="{ opacity: cms.isEffectivelyVisible(node.el.id) ? 1 : 0.4 }"
              >{{ layerName(node.el) }}</span
            >
            <div class="layer-item-actions">
              <button
                class="icon-btn-sm"
                @click.stop="cms.toggleVisible(node.el.id)"
                :title="node.el.visible ? 'Hide' : 'Show'"
              >
                <Icon :name="node.el.visible ? 'eye' : 'eye-off'" :size="13" />
              </button>
              <button
                class="icon-btn-sm"
                @click.stop="cms.toggleLock(node.el.id)"
                :title="node.el.locked ? 'Unlock' : 'Lock'"
              >
                <Icon :name="node.el.locked ? 'lock' : 'unlock'" :size="13" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="cms.state.sidebarTab === 'textStyles'">
        <div
          v-for="p in TEXT_PRESETS"
          :key="p.key"
          class="text-style-card"
          @click="addPreset(p.key)"
        >
          <span :style="{ ...p.style, color: presetColor(p.style) }">{{ p.label }}</span>
          <span class="text-style-desc">{{ p.desc }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
