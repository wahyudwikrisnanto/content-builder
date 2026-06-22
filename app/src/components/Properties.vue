<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useCms } from '../composables/useCms'
import Icon from '../icons/Icon.vue'
import ColorInput from './ColorInput.vue'
import SearchableSelect from './SearchableSelect.vue'
import type { ElementType, TextAlign, ListType } from '../types'

const cms = useCms()
const sel = cms.selected

const TYPE_LABELS: Record<ElementType, string> = {
  text: 'Text', image: 'Image', shape: 'Shape',
  video: 'Video', divider: 'Divider', container: 'Container',
  frame: 'Frame', code: 'Code', button: 'Button',
}

const LANGUAGES = [
  'plaintext', 'javascript', 'typescript', 'python', 'ruby', 'go', 'rust',
  'java', 'c', 'cpp', 'csharp', 'php', 'swift', 'kotlin', 'objectivec',
  'perl', 'lua', 'r', 'sql', 'shell', 'bash', 'makefile',
  'xml', 'css', 'scss', 'less', 'json', 'yaml', 'markdown', 'diff', 'graphql', 'ini',
]
interface WeightOpt { v: string; label: string }
const WEIGHTS: WeightOpt[] = [
  { v: '300', label: 'Light' }, { v: '400', label: 'Regular' },
  { v: '500', label: 'Medium' }, { v: '600', label: 'Semibold' },
  { v: '700', label: 'Bold' },
]
interface AlignOpt { v: TextAlign; icon: string }
const ALIGNS: AlignOpt[] = [
  { v: 'left', icon: 'align-left' },
  { v: 'center', icon: 'align-center' },
  { v: 'right', icon: 'align-right' },
  { v: 'justify', icon: 'align-justify' },
]

interface ListOpt { v: ListType; icon: string; title: string }
const LISTS: ListOpt[] = [
  { v: 'none', icon: 'minus', title: 'No list' },
  { v: 'bullet', icon: 'list-bullet', title: 'Bullet list' },
  { v: 'number', icon: 'list-number', title: 'Numbered list' },
]

const cw = ref(cms.state.canvasWidth)
const ch = ref(cms.state.canvasHeight)
watch(() => cms.state.canvasWidth, v => cw.value = v)
watch(() => cms.state.canvasHeight, v => ch.value = v)
function applyCanvas(): void { cms.setCanvas(Math.max(100, +cw.value), Math.max(100, +ch.value)) }

const targetValue = (e: Event): string => (e.target as HTMLInputElement).value
const targetNumber = (e: Event): number => +(e.target as HTMLInputElement).value

function upd(id: string, k: 'x' | 'y' | 'width' | 'height' | 'content' | 'name' | 'language' | 'href' | 'target' | 'copyEnabled', v: number | string | boolean): void {
  cms.updateElement(id, { [k]: v } as any)
}
function sty(id: string, k: string, v: number | string): void {
  cms.updateStyles(id, { [k]: v } as any)
}

const fillValue = computed(() => {
  const el = sel.value; if (!el) return '#FFFFFF'
  const bg = el.styles.backgroundColor
  return bg === 'transparent' ? '#FFFFFF' : (bg || '#FFFFFF')
})

const headerLabel = computed(() => {
  const el = sel.value; if (!el) return ''
  return TYPE_LABELS[el.type] + (el.type === 'shape' ? ` · ${el.shapeType}` : '')
})
</script>

<template>
  <div v-if="cms.state.selectedIds.length" class="properties">
    <div class="properties-header">
      <span>{{ cms.state.selectedIds.length }} selected</span>
      <div :style="{ display: 'flex', gap: '2px', marginLeft: 'auto' }">
        <button class="icon-btn" title="Delete selected" @click="cms.deleteSelected()">
          <Icon name="trash" :size="15" />
        </button>
      </div>
    </div>
    <div class="prop-hint">Press Delete to remove all selected elements</div>
  </div>

  <div v-else-if="!sel" class="properties">
    <div class="properties-header"><span>Canvas</span></div>
    <div class="prop-section">
      <div class="prop-section-title">Size</div>
      <div class="prop-row">
        <span class="prop-label">W</span>
        <input class="prop-input" type="number" :value="cw" :min="100"
          @input="cw = targetNumber($event)" @blur="applyCanvas"
          @keydown.enter="applyCanvas" />
      </div>
      <div class="prop-row">
        <span class="prop-label">H</span>
        <input class="prop-input" type="number" :value="ch" :min="100"
          :disabled="cms.state.flexibleHeight"
          @input="ch = targetNumber($event)" @blur="applyCanvas"
          @keydown.enter="applyCanvas" />
      </div>
      <div class="prop-row">
        <span class="prop-label">Flex H</span>
        <label class="prop-toggle">
          <input type="checkbox" :checked="cms.state.flexibleHeight" @change="cms.toggleFlexibleHeight()" />
          <span>Grow with content</span>
        </label>
      </div>
    </div>
    <div class="prop-hint">Select an element to edit its properties</div>
  </div>

  <div v-else class="properties">
    <div class="properties-header">
      <span>{{ headerLabel }}</span>
      <div :style="{ display: 'flex', gap: '2px', marginLeft: 'auto' }">
        <button class="icon-btn" title="Duplicate (Ctrl+D)" @click="cms.duplicate(sel.id)">
          <Icon name="copy" :size="15" />
        </button>
<button class="icon-btn" title="Delete" @click="cms.deleteElement(sel.id)">
          <Icon name="trash" :size="15" />
        </button>
      </div>
    </div>

    <div class="prop-section">
      <div class="prop-section-title">Position & Size</div>
      <div class="prop-row-pair">
        <div class="prop-row">
          <span class="prop-label">X</span>
          <input class="prop-input" type="number" :value="Math.round(sel.x)"
            @input="upd(sel.id, 'x', targetNumber($event))" />
        </div>
        <div class="prop-row">
          <span class="prop-label">Y</span>
          <input class="prop-input" type="number" :value="Math.round(sel.y)"
            @input="upd(sel.id, 'y', targetNumber($event))" />
        </div>
      </div>
      <div class="prop-row-pair">
        <div class="prop-row">
          <span class="prop-label">W</span>
          <input class="prop-input" type="number" :value="Math.round(sel.width)" :min="20"
            @input="upd(sel.id, 'width', Math.max(20, targetNumber($event)))" />
        </div>
        <div class="prop-row">
          <span class="prop-label">H</span>
          <input class="prop-input" type="number" :value="Math.round(sel.height)" :min="8"
            @input="upd(sel.id, 'height', Math.max(8, targetNumber($event)))" />
        </div>
      </div>
    </div>

    <div v-if="sel.type === 'text' || sel.type === 'shape' || sel.type === 'button'" class="prop-section">
      <div class="prop-section-title">Typography</div>
      <div class="prop-row">
        <span class="prop-label">Size</span>
        <input class="prop-input" type="number" :value="sel.styles.fontSize" :min="8" :max="200"
          :style="{ width: '64px', flex: 'none' }"
          @input="sty(sel.id, 'fontSize', targetNumber($event))" />
        <select class="prop-select" :value="sel.styles.fontWeight"
          @change="sty(sel.id, 'fontWeight', targetValue($event))">
          <option v-for="w in WEIGHTS" :key="w.v" :value="w.v">{{ w.label }}</option>
        </select>
      </div>
      <div class="prop-row">
        <span class="prop-label">Color</span>
        <ColorInput :model-value="sel.styles.color" @update:model-value="(v: string) => sty(sel!.id, 'color', v)" />
      </div>
      <div class="prop-row">
        <span class="prop-label">Stroke</span>
        <input class="prop-input" type="number" :min="0" :step="0.5"
          :value="sel.styles.textStrokeWidth ?? 0"
          :style="{ width: '64px', flex: 'none' }"
          @input="sty(sel.id, 'textStrokeWidth', targetNumber($event))" />
        <ColorInput :model-value="sel.styles.textStrokeColor || '#000000'"
          @update:model-value="(v: string) => sty(sel!.id, 'textStrokeColor', v)" />
      </div>
      <div class="prop-row">
        <span class="prop-label">Align</span>
        <div class="toggle-group">
          <button v-for="a in ALIGNS" :key="a.v"
            :class="['toggle-btn', { active: sel.styles.textAlign === a.v }]"
            @click="sty(sel.id, 'textAlign', a.v)">
            <Icon :name="a.icon" :size="14" />
          </button>
        </div>
      </div>
      <div class="prop-row">
        <span class="prop-label">Style</span>
        <div class="toggle-group">
          <button :class="['toggle-btn', { active: sel.styles.fontStyle === 'italic' }]"
            @click="sty(sel.id, 'fontStyle', sel.styles.fontStyle === 'italic' ? 'normal' : 'italic')">
            <Icon name="italic" :size="14" />
          </button>
          <button :class="['toggle-btn', { active: sel.styles.textDecoration === 'underline' }]"
            @click="sty(sel.id, 'textDecoration', sel.styles.textDecoration === 'underline' ? 'none' : 'underline')">
            <Icon name="underline" :size="14" />
          </button>
        </div>
      </div>
      <div class="prop-row">
        <span class="prop-label">List</span>
        <div class="toggle-group">
          <button v-for="l in LISTS" :key="l.v"
            :class="['toggle-btn', { active: (sel.styles.listType || 'none') === l.v }]"
            :title="l.title"
            @click="sty(sel.id, 'listType', l.v)">
            <Icon :name="l.icon" :size="14" />
          </button>
        </div>
      </div>
      <div class="prop-row">
        <span class="prop-label">Line</span>
        <input class="prop-input" type="number" step="0.1" :min="0.8" :max="4"
          :value="sel.styles.lineHeight"
          @input="sty(sel.id, 'lineHeight', targetNumber($event))" />
      </div>
    </div>

    <div class="prop-section">
      <div class="prop-section-title">Appearance</div>
      <div v-if="sel.type === 'divider'" class="prop-row">
        <span class="prop-label">Color</span>
        <ColorInput :model-value="sel.styles.backgroundColor || '#DDDDDD'"
          @update:model-value="(v: string) => sty(sel!.id, 'backgroundColor', v)" />
      </div>
      <div v-else class="prop-row">
        <span class="prop-label">Fill</span>
        <ColorInput :model-value="sel.styles.backgroundColor" clearable
          @update:model-value="(v: string) => sty(sel!.id, 'backgroundColor', v)" />
      </div>

      <div v-if="sel.styles.borderRadius !== undefined && sel.type !== 'divider'" class="prop-row">
        <span class="prop-label">Radius</span>
        <input class="prop-input" type="number" :min="0" :value="sel.styles.borderRadius"
          @input="sty(sel.id, 'borderRadius', targetNumber($event))" />
      </div>

      <div v-if="sel.styles.borderWidth !== undefined && sel.type !== 'divider'" class="prop-row">
        <span class="prop-label">Border</span>
        <input class="prop-input" type="number" :min="0" :value="sel.styles.borderWidth"
          :style="{ width: '64px', flex: 'none' }"
          @input="sty(sel.id, 'borderWidth', targetNumber($event))" />
        <ColorInput :model-value="sel.styles.borderColor || '#DDDDDD'"
          @update:model-value="(v: string) => sty(sel!.id, 'borderColor', v)" />
      </div>

      <div class="prop-row">
        <span class="prop-label">Opacity</span>
        <input class="prop-slider" type="range" :min="0" :max="1" :step="0.01"
          :value="sel.styles.opacity != null ? sel.styles.opacity : 1"
          @input="sty(sel.id, 'opacity', targetNumber($event))" />
        <span class="opacity-val">{{ Math.round((sel.styles.opacity != null ? sel.styles.opacity : 1) * 100) }}%</span>
      </div>
    </div>

    <div v-if="sel.type === 'image'" class="prop-section">
      <div class="prop-section-title">Image</div>
      <div class="prop-row">
        <span class="prop-label">URL</span>
        <input class="prop-input" type="text" placeholder="https://..."
          :value="sel.content?.startsWith('data:') ? '' : (sel.content || '')"
          @input="upd(sel.id, 'content', targetValue($event))" />
      </div>
      <div class="prop-row">
        <span class="prop-label">Fit</span>
        <select class="prop-select" :value="sel.styles.objectFit || 'cover'"
          @change="sty(sel.id, 'objectFit', targetValue($event))">
          <option value="cover">Cover</option>
          <option value="contain">Contain</option>
          <option value="fill">Fill</option>
        </select>
      </div>
    </div>

    <div v-if="sel.type === 'video'" class="prop-section">
      <div class="prop-section-title">Video</div>
      <div class="prop-row">
        <span class="prop-label">URL</span>
        <input class="prop-input" type="text" placeholder="YouTube or Vimeo URL"
          :value="sel.content || ''"
          @input="upd(sel.id, 'content', targetValue($event))" />
      </div>
    </div>

    <div v-if="sel.type === 'button'" class="prop-section">
      <div class="prop-section-title">Link</div>
      <div class="prop-row">
        <span class="prop-label">URL</span>
        <input class="prop-input" type="text" placeholder="https://..."
          :value="sel.href || ''"
          @input="upd(sel.id, 'href', targetValue($event))" />
      </div>
      <div class="prop-row">
        <span class="prop-label">Open</span>
        <select class="prop-select" :value="sel.target || '_self'"
          @change="upd(sel.id, 'target', targetValue($event))">
          <option value="_self">Same tab</option>
          <option value="_blank">New tab</option>
        </select>
      </div>
    </div>

    <div v-if="sel.type === 'code'" class="prop-section">
      <div class="prop-section-title">Code</div>
      <div class="prop-row">
        <span class="prop-label">Lang</span>
        <SearchableSelect :model-value="sel.language || 'plaintext'" :options="LANGUAGES"
          placeholder="Search language..."
          @update:model-value="(v: string) => upd(sel!.id, 'language', v)" />
      </div>
      <div class="prop-row" :style="{ alignItems: 'flex-start' }">
        <span class="prop-label" :style="{ marginTop: '6px' }">Code</span>
        <textarea class="prop-input" :style="{ height: '120px', padding: '6px', fontFamily: 'monospace', resize: 'vertical' }"
          :value="sel.content || ''"
          @input="upd(sel.id, 'content', targetValue($event))"></textarea>
      </div>
      <div class="prop-row">
        <span class="prop-label">Copy</span>
        <label class="prop-toggle">
          <input type="checkbox" :checked="sel.copyEnabled !== false"
            @change="upd(sel.id, 'copyEnabled', ($event.target as HTMLInputElement).checked)" />
          <span>Show copy button</span>
        </label>
      </div>
    </div>

    <div v-if="sel.type === 'frame'" class="prop-section">
      <div class="prop-section-title">Frame</div>
      <div class="prop-row">
        <span class="prop-label">Name</span>
        <input class="prop-input" type="text" :value="sel.name || ''"
          @input="upd(sel.id, 'name', targetValue($event))" />
      </div>
      <div :style="{ display: 'flex', gap: '6px', marginTop: '4px' }">
        <button class="btn-sm" @click="cms.ungroupFrame(sel.id)">Ungroup</button>
      </div>
    </div>

    <div class="prop-section">
      <div class="prop-section-title">Layer</div>
      <div :style="{ display: 'flex', gap: '6px' }">
        <button class="btn-sm" @click="cms.bringForward(sel.id)">
          <Icon name="arrow-up" :size="13" /> Forward
        </button>
        <button class="btn-sm" @click="cms.sendBackward(sel.id)">
          <Icon name="arrow-down" :size="13" /> Backward
        </button>
      </div>
    </div>
  </div>
</template>
