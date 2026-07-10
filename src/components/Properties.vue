<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useCms } from '../composables/useCms'
import { usePlugins, findDialogPlugins } from '../composables/usePlugins'
import Icon from '../icons/Icon.vue'
import ColorInput from './ColorInput.vue'
import SearchableSelect from './SearchableSelect.vue'
import { FONT_FAMILIES } from '../composables/fontFamilies'
import type {
  ElementType,
  InputType,
  TextAlign,
  ListType,
  CmsElement,
  ElementStyles,
} from '../types'

const cms = useCms()
const sel = cms.selected
const plugins = usePlugins()
const dialogPlugins = computed(() => (sel.value ? findDialogPlugins(plugins, sel.value) : []))

async function runDialogPlugin(idx: number): Promise<void> {
  const el = sel.value
  if (!el) return
  const plugin = dialogPlugins.value[idx]
  if (!plugin) return
  const patch = await plugin.open(el)
  if (patch) cms.updateElement(el.id, patch)
}

const TYPE_LABELS: Record<ElementType, string> = {
  text: 'Text',
  image: 'Image',
  shape: 'Shape',
  video: 'Video',
  divider: 'Divider',
  container: 'Container',
  frame: 'Frame',
  code: 'Code',
  button: 'Button',
  input: 'Input',
  icon: 'Icon',
}

const INPUT_TYPES: { v: InputType; label: string }[] = [
  { v: 'text', label: 'Text' },
  { v: 'email', label: 'Email' },
  { v: 'password', label: 'Password' },
  { v: 'number', label: 'Number' },
  { v: 'tel', label: 'Phone' },
  { v: 'url', label: 'URL' },
  { v: 'textarea', label: 'Textarea' },
  { v: 'select', label: 'Select' },
  { v: 'checkbox', label: 'Checkbox' },
  { v: 'radio', label: 'Radio' },
]

const LANGUAGES = [
  'plaintext',
  'javascript',
  'typescript',
  'python',
  'ruby',
  'go',
  'rust',
  'java',
  'c',
  'cpp',
  'csharp',
  'php',
  'swift',
  'kotlin',
  'objectivec',
  'perl',
  'lua',
  'r',
  'sql',
  'shell',
  'bash',
  'makefile',
  'xml',
  'css',
  'scss',
  'less',
  'json',
  'yaml',
  'markdown',
  'diff',
  'graphql',
  'ini',
]
interface WeightOpt {
  v: string
  label: string
}
const WEIGHTS: WeightOpt[] = [
  { v: '300', label: 'Light' },
  { v: '400', label: 'Regular' },
  { v: '500', label: 'Medium' },
  { v: '600', label: 'Semibold' },
  { v: '700', label: 'Bold' },
]
interface AlignOpt {
  v: TextAlign
  icon: string
}
const ALIGNS: AlignOpt[] = [
  { v: 'left', icon: 'align-left' },
  { v: 'center', icon: 'align-center' },
  { v: 'right', icon: 'align-right' },
  { v: 'justify', icon: 'align-justify' },
]

interface ListOpt {
  v: ListType
  icon: string
  title: string
}
const LISTS: ListOpt[] = [
  { v: 'none', icon: 'minus', title: 'No list' },
  { v: 'bullet', icon: 'list-bullet', title: 'Bullet list' },
  { v: 'number', icon: 'list-number', title: 'Numbered list' },
]

const cw = ref(cms.state.canvasWidth)
const ch = ref(cms.state.canvasHeight)
watch(
  () => cms.state.canvasWidth,
  (v) => (cw.value = v),
)
watch(
  () => cms.state.canvasHeight,
  (v) => (ch.value = v),
)
function applyCanvas(): void {
  cms.setCanvas(Math.max(100, +cw.value), Math.max(100, +ch.value))
}

const targetValue = (e: Event): string => (e.target as HTMLInputElement).value
const targetNumber = (e: Event): number => +(e.target as HTMLInputElement).value

function upd(
  id: string,
  k:
    | 'x'
    | 'y'
    | 'width'
    | 'height'
    | 'content'
    | 'name'
    | 'language'
    | 'href'
    | 'target'
    | 'copyEnabled'
    | 'inputType'
    | 'inputLabel'
    | 'placeholder'
    | 'inputOptions'
    | 'required'
    | 'iconName'
    | 'iconSize'
    | 'iconPosition'
    | 'iconGap',
  v: number | string | boolean,
): void {
  cms.updateElement(id, { [k]: v } as Partial<CmsElement>)
}
function sty(id: string, k: string, v: number | string): void {
  cms.updateStyles(id, { [k]: v } as Partial<ElementStyles>)
}

function setPadX(id: string, v: number): void {
  cms.updateStyles(id, { paddingLeft: v, paddingRight: v })
}
function setPadY(id: string, v: number): void {
  cms.updateStyles(id, { paddingTop: v, paddingBottom: v })
}
const padSidesExpanded = ref(false)
const radiusCornersExpanded = ref(false)

type RadiusCornerKey =
  | 'borderTopLeftRadius'
  | 'borderTopRightRadius'
  | 'borderBottomRightRadius'
  | 'borderBottomLeftRadius'

function radiusScalar(v: ElementStyles['borderRadius']): number {
  if (typeof v === 'number') return v
  if (v && typeof v === 'object') return v.borderTopLeftRadius ?? 0
  return 0
}
function radiusCorner(v: ElementStyles['borderRadius'], k: RadiusCornerKey): number {
  if (typeof v === 'number') return v
  if (v && typeof v === 'object') return v[k] ?? 0
  return 0
}
function setRadiusScalar(id: string, n: number): void {
  cms.updateStyles(id, { borderRadius: n })
}
function setRadiusCorner(id: string, k: RadiusCornerKey, n: number): void {
  const el = cms.state.elements.find((e) => e.id === id)
  if (!el) return
  const cur = el.styles.borderRadius
  const base =
    typeof cur === 'number'
      ? {
          borderTopLeftRadius: cur,
          borderTopRightRadius: cur,
          borderBottomRightRadius: cur,
          borderBottomLeftRadius: cur,
        }
      : { ...(cur ?? {}) }
  base[k] = n
  cms.updateStyles(id, { borderRadius: base })
}

function parseImgPos(v?: string): { x: string; y: string } {
  if (!v || v === 'center') return { x: '50%', y: '50%' }
  const parts = v.trim().split(/\s+/)
  const map: Record<string, string> = {
    left: '0%',
    top: '0%',
    right: '100%',
    bottom: '100%',
    center: '50%',
  }
  const x = map[parts[0]] ?? parts[0] ?? '50%'
  const y = map[parts[1]] ?? parts[1] ?? '50%'
  return { x, y }
}
function setImgPosX(id: string, x: string): void {
  const el = cms.state.elements.find((e) => e.id === id)
  if (!el) return
  const cur = parseImgPos(el.styles.objectPosition)
  cms.updateStyles(id, { objectPosition: `${x} ${cur.y}` })
}
function setImgPosY(id: string, y: string): void {
  const el = cms.state.elements.find((e) => e.id === id)
  if (!el) return
  const cur = parseImgPos(el.styles.objectPosition)
  cms.updateStyles(id, { objectPosition: `${cur.x} ${y}` })
}

function setHeightManual(id: string, v: number): void {
  cms.updateElement(id, { height: Math.max(8, v), manualHeight: true })
}

const headerLabel = computed(() => {
  const el = sel.value
  if (!el) return ''
  return TYPE_LABELS[el.type] + (el.type === 'shape' ? ` · ${el.shapeType}` : '')
})
</script>

<template>
  <div v-if="cms.state.selectedIds.length" class="properties">
    <div class="properties-header">
      <span>{{ cms.state.selectedIds.length }} selected</span>
      <div :style="{ display: 'flex', gap: '2px', marginLeft: 'auto' }">
        <button class="icon-btn" title="Group into frame" @click="cms.groupSelection()">
          <Icon name="frame" :size="15" />
        </button>
        <button class="icon-btn" title="Delete selected" @click="cms.deleteSelected()">
          <Icon name="trash" :size="15" />
        </button>
      </div>
    </div>
    <div class="prop-hint">Group wraps selection in a frame · Delete removes all</div>
  </div>

  <div v-else-if="!sel" class="properties">
    <div class="properties-header"><span>Canvas</span></div>
    <div class="prop-section">
      <div class="prop-section-title">Size</div>
      <div class="prop-row">
        <span class="prop-label">W</span>
        <input
          class="prop-input"
          type="number"
          :value="cw"
          :min="100"
          @input="cw = targetNumber($event)"
          @blur="applyCanvas"
          @keydown.enter="applyCanvas"
        />
      </div>
      <div class="prop-row">
        <span class="prop-label">H</span>
        <input
          class="prop-input"
          type="number"
          :value="ch"
          :min="100"
          :disabled="cms.state.flexibleHeight"
          @input="ch = targetNumber($event)"
          @blur="applyCanvas"
          @keydown.enter="applyCanvas"
        />
      </div>
      <div class="prop-row">
        <span class="prop-label">Flex H</span>
        <label class="prop-toggle">
          <input
            type="checkbox"
            :checked="cms.state.flexibleHeight"
            @change="cms.toggleFlexibleHeight()"
          />
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

    <div v-if="dialogPlugins.length" class="prop-section">
      <div class="prop-section-title">Actions</div>
      <div :style="{ display: 'flex', flexWrap: 'wrap', gap: '6px' }">
        <button v-for="(p, i) in dialogPlugins" :key="i" class="btn-sm" @click="runDialogPlugin(i)">
          <Icon v-if="p.icon" :name="p.icon" :size="13" />
          {{ p.label }}
        </button>
      </div>
    </div>

    <div class="prop-section">
      <div class="prop-section-title">Name</div>
      <div class="prop-row">
        <input
          class="prop-input"
          type="text"
          :placeholder="TYPE_LABELS[sel.type]"
          :value="sel.name || ''"
          @input="upd(sel.id, 'name', targetValue($event))"
        />
      </div>
    </div>

    <div class="prop-section">
      <div class="prop-section-title">Position & Size</div>
      <div class="prop-row-pair">
        <div class="prop-row">
          <span class="prop-label">X</span>
          <input
            class="prop-input"
            type="number"
            :value="Math.round(sel.x)"
            @input="upd(sel.id, 'x', targetNumber($event))"
          />
        </div>
        <div class="prop-row">
          <span class="prop-label">Y</span>
          <input
            class="prop-input"
            type="number"
            :value="Math.round(sel.y)"
            @input="upd(sel.id, 'y', targetNumber($event))"
          />
        </div>
      </div>
      <div class="prop-row-pair">
        <div class="prop-row">
          <span class="prop-label">W</span>
          <input
            class="prop-input"
            type="number"
            :value="Math.round(sel.width)"
            :min="20"
            @input="upd(sel.id, 'width', Math.max(20, targetNumber($event)))"
          />
        </div>
        <div class="prop-row">
          <span class="prop-label">H</span>
          <input
            class="prop-input"
            type="number"
            :value="Math.round(sel.height)"
            :min="8"
            @input="setHeightManual(sel.id, targetNumber($event))"
          />
        </div>
      </div>
      <div
        v-if="sel.manualHeight && (sel.type === 'text' || sel.type === 'shape')"
        class="prop-row"
      >
        <span class="prop-label"></span>
        <button
          class="btn-sm"
          @click="cms.setManualHeight(sel.id, false)"
          :style="{ fontSize: '11px', padding: '3px 8px', marginLeft: 'auto' }"
        >
          Reset to auto height
        </button>
      </div>
    </div>

    <div
      v-if="sel.type === 'text' || sel.type === 'shape' || sel.type === 'button'"
      class="prop-section"
    >
      <div class="prop-section-title">Typography</div>
      <div class="prop-row">
        <span class="prop-label">Font</span>
        <select
          class="prop-select"
          :value="sel.styles.fontFamily || 'inherit'"
          @change="sty(sel.id, 'fontFamily', targetValue($event))"
        >
          <option v-for="f in FONT_FAMILIES" :key="f.value" :value="f.value">{{ f.label }}</option>
        </select>
      </div>
      <div class="prop-row">
        <span class="prop-label">Size</span>
        <input
          class="prop-input"
          type="number"
          :value="sel.styles.fontSize"
          :min="8"
          :max="200"
          :style="{ width: '64px', flex: 'none' }"
          @input="sty(sel.id, 'fontSize', targetNumber($event))"
        />
        <select
          class="prop-select"
          :value="sel.styles.fontWeight"
          @change="sty(sel.id, 'fontWeight', targetValue($event))"
        >
          <option v-for="w in WEIGHTS" :key="w.v" :value="w.v">{{ w.label }}</option>
        </select>
      </div>
      <div class="prop-row">
        <span class="prop-label">Color</span>
        <ColorInput
          :model-value="sel.styles.color"
          @update:model-value="(v: string) => sty(sel!.id, 'color', v)"
        />
      </div>
      <div class="prop-row">
        <span class="prop-label">Stroke</span>
        <input
          class="prop-input"
          type="number"
          :min="0"
          :step="0.5"
          :value="sel.styles.textStrokeWidth ?? 0"
          :style="{ width: '64px', flex: 'none' }"
          @input="sty(sel.id, 'textStrokeWidth', targetNumber($event))"
        />
        <ColorInput
          :model-value="sel.styles.textStrokeColor || '#000000'"
          @update:model-value="(v: string) => sty(sel!.id, 'textStrokeColor', v)"
        />
      </div>
      <div class="prop-row">
        <span class="prop-label">Align</span>
        <div class="toggle-group">
          <button
            v-for="a in ALIGNS"
            :key="a.v"
            :class="['toggle-btn', { active: sel.styles.textAlign === a.v }]"
            @click="sty(sel.id, 'textAlign', a.v)"
          >
            <Icon :name="a.icon" :size="14" />
          </button>
        </div>
      </div>
      <div class="prop-row">
        <span class="prop-label">Style</span>
        <div class="toggle-group">
          <button
            :class="['toggle-btn', { active: Number(sel.styles.fontWeight) >= 700 }]"
            @click="sty(sel.id, 'fontWeight', Number(sel.styles.fontWeight) >= 700 ? '400' : '700')"
          >
            <Icon name="bold" :size="14" />
          </button>
          <button
            :class="['toggle-btn', { active: sel.styles.fontStyle === 'italic' }]"
            @click="
              sty(sel.id, 'fontStyle', sel.styles.fontStyle === 'italic' ? 'normal' : 'italic')
            "
          >
            <Icon name="italic" :size="14" />
          </button>
          <button
            :class="['toggle-btn', { active: sel.styles.textDecoration === 'underline' }]"
            @click="
              sty(
                sel.id,
                'textDecoration',
                sel.styles.textDecoration === 'underline' ? 'none' : 'underline',
              )
            "
          >
            <Icon name="underline" :size="14" />
          </button>
        </div>
      </div>
      <div class="prop-row">
        <span class="prop-label">List</span>
        <div class="toggle-group">
          <button
            v-for="l in LISTS"
            :key="l.v"
            :class="['toggle-btn', { active: (sel.styles.listType || 'none') === l.v }]"
            :title="l.title"
            @click="sty(sel.id, 'listType', l.v)"
          >
            <Icon :name="l.icon" :size="14" />
          </button>
        </div>
      </div>
      <div class="prop-row">
        <span class="prop-label">Line</span>
        <input
          class="prop-input"
          type="number"
          step="0.1"
          :min="0.8"
          :max="4"
          :value="sel.styles.lineHeight"
          @input="sty(sel.id, 'lineHeight', targetNumber($event))"
        />
      </div>
    </div>

    <div
      v-if="sel.type === 'text' || sel.type === 'button' || sel.type === 'shape' || sel.type === 'input' || sel.type === 'code'"
      class="prop-section"
    >
      <div class="prop-section-title">Padding</div>
      <div class="prop-row">
        <span class="prop-label"></span>
        <button
          class="btn-sm"
          :title="padSidesExpanded ? 'Use paired H/V inputs' : 'Set each side individually'"
          :style="{ marginLeft: 'auto', padding: '3px 6px' }"
          @click="padSidesExpanded = !padSidesExpanded"
        >
          {{ padSidesExpanded ? '⧉ Sides' : '⇔ H/V' }}
        </button>
      </div>
      <template v-if="!padSidesExpanded">
        <div class="prop-row-pair">
          <div class="prop-row">
            <span class="prop-label" title="Horizontal (left + right)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <path d="M4 4v16M20 4v16" />
                <path d="M4 12h4M16 12h4" />
              </svg>
            </span>
            <input
              class="prop-input"
              type="number"
              :min="0"
              placeholder="0"
              :value="sel.styles.paddingLeft ?? sel.styles.padding ?? ''"
              @input="setPadX(sel.id, targetNumber($event))"
            />
          </div>
          <div class="prop-row">
            <span class="prop-label" title="Vertical (top + bottom)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <path d="M4 4h16M4 20h16" />
                <path d="M12 4v4M12 16v4" />
              </svg>
            </span>
            <input
              class="prop-input"
              type="number"
              :min="0"
              placeholder="0"
              :value="sel.styles.paddingTop ?? sel.styles.padding ?? ''"
              @input="setPadY(sel.id, targetNumber($event))"
            />
          </div>
        </div>
      </template>
      <template v-else>
        <div class="prop-row-pair">
          <div class="prop-row">
            <span class="prop-label" title="Top">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <path d="M4 5h16" />
                <path d="M12 10v9" />
                <polyline points="9,13 12,10 15,13" />
              </svg>
            </span>
            <input
              class="prop-input"
              type="number"
              :min="0"
              placeholder="0"
              :value="sel.styles.paddingTop ?? sel.styles.padding ?? ''"
              @input="sty(sel.id, 'paddingTop', targetNumber($event))"
            />
          </div>
          <div class="prop-row">
            <span class="prop-label" title="Right">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <path d="M19 4v16" />
                <path d="M14 12H5" />
                <polyline points="11,9 14,12 11,15" />
              </svg>
            </span>
            <input
              class="prop-input"
              type="number"
              :min="0"
              placeholder="0"
              :value="sel.styles.paddingRight ?? sel.styles.padding ?? ''"
              @input="sty(sel.id, 'paddingRight', targetNumber($event))"
            />
          </div>
        </div>
        <div class="prop-row-pair">
          <div class="prop-row">
            <span class="prop-label" title="Bottom">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <path d="M4 19h16" />
                <path d="M12 5v9" />
                <polyline points="9,11 12,14 15,11" />
              </svg>
            </span>
            <input
              class="prop-input"
              type="number"
              :min="0"
              placeholder="0"
              :value="sel.styles.paddingBottom ?? sel.styles.padding ?? ''"
              @input="sty(sel.id, 'paddingBottom', targetNumber($event))"
            />
          </div>
          <div class="prop-row">
            <span class="prop-label" title="Left">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <path d="M5 4v16" />
                <path d="M10 12h9" />
                <polyline points="13,9 10,12 13,15" />
              </svg>
            </span>
            <input
              class="prop-input"
              type="number"
              :min="0"
              placeholder="0"
              :value="sel.styles.paddingLeft ?? sel.styles.padding ?? ''"
              @input="sty(sel.id, 'paddingLeft', targetNumber($event))"
            />
          </div>
        </div>
      </template>
    </div>

    <div v-if="sel.type === 'icon'" class="prop-section">
      <div class="prop-section-title">Icon</div>
      <div class="prop-row">
        <span class="prop-label">Name</span>
        <input
          class="prop-input"
          type="text"
          placeholder="mdi:home"
          :value="sel.iconName || ''"
          @input="upd(sel.id, 'iconName', targetValue($event))"
        />
      </div>
      <div class="prop-hint" :style="{ marginLeft: '52px' }">
        Browse names at icon-sets.iconify.design
      </div>
      <div class="prop-row">
        <span class="prop-label">Size</span>
        <input
          class="prop-input"
          type="number"
          :min="8"
          :max="512"
          :value="sel.iconSize ?? 32"
          @input="upd(sel.id, 'iconSize', targetNumber($event))"
        />
      </div>
      <div class="prop-row">
        <span class="prop-label">Color</span>
        <ColorInput
          :model-value="sel.styles.color || '#222222'"
          @update:model-value="(v: string) => sty(sel!.id, 'color', v)"
        />
      </div>
    </div>

    <div v-if="sel.type === 'button'" class="prop-section">
      <div class="prop-section-title">Button icon</div>
      <div class="prop-row">
        <span class="prop-label">Name</span>
        <input
          class="prop-input"
          type="text"
          placeholder="mdi:arrow-right"
          :value="sel.iconName || ''"
          @input="upd(sel.id, 'iconName', targetValue($event))"
        />
      </div>
      <div class="prop-hint" :style="{ marginLeft: '52px' }">
        Any Iconify name — blank = no icon
      </div>
      <template v-if="sel.iconName">
        <div class="prop-row">
          <span class="prop-label">Position</span>
          <div class="toggle-group">
            <button
              title="Icon on left"
              :class="['toggle-btn', { active: (sel.iconPosition ?? 'leading') === 'leading' }]"
              @click="upd(sel.id, 'iconPosition', 'leading')"
            >
              <Icon name="align-left-edge" :size="14" />
            </button>
            <button
              title="Icon on right"
              :class="['toggle-btn', { active: sel.iconPosition === 'trailing' }]"
              @click="upd(sel.id, 'iconPosition', 'trailing')"
            >
              <Icon name="align-right-edge" :size="14" />
            </button>
          </div>
        </div>
        <div class="prop-row">
          <span class="prop-label">Size</span>
          <input
            class="prop-input"
            type="number"
            :min="8"
            :max="128"
            placeholder="auto"
            :value="sel.iconSize ?? ''"
            @input="upd(sel.id, 'iconSize', targetNumber($event))"
          />
        </div>
        <div class="prop-row">
          <span class="prop-label">Gap</span>
          <input
            class="prop-input"
            type="number"
            :min="0"
            :max="64"
            :value="sel.iconGap ?? 6"
            @input="upd(sel.id, 'iconGap', targetNumber($event))"
          />
        </div>
      </template>
    </div>

    <div class="prop-section">
      <div class="prop-section-title">Appearance</div>
      <div v-if="sel.type === 'divider'" class="prop-row">
        <span class="prop-label">Color</span>
        <ColorInput
          :model-value="sel.styles.backgroundColor || '#DDDDDD'"
          @update:model-value="(v: string) => sty(sel!.id, 'backgroundColor', v)"
        />
      </div>
      <div v-else class="prop-row">
        <span class="prop-label">Fill</span>
        <ColorInput
          :model-value="sel.styles.backgroundColor"
          clearable
          @update:model-value="(v: string) => sty(sel!.id, 'backgroundColor', v)"
        />
      </div>

      <template v-if="sel.styles.borderRadius !== undefined && sel.type !== 'divider'">
        <div class="prop-row">
          <span class="prop-label">Radius</span>
          <input
            v-if="!radiusCornersExpanded"
            class="prop-input"
            type="number"
            :min="0"
            :value="radiusScalar(sel.styles.borderRadius)"
            @input="setRadiusScalar(sel.id, targetNumber($event))"
          />
          <button
            class="btn-sm"
            :title="radiusCornersExpanded ? 'Uniform radius' : 'Set each corner'"
            :style="{ marginLeft: 'auto', padding: '3px 6px' }"
            @click="radiusCornersExpanded = !radiusCornersExpanded"
          >
            {{ radiusCornersExpanded ? '⧉ Corners' : '⇔ All' }}
          </button>
        </div>
        <template v-if="radiusCornersExpanded">
          <div class="prop-row-pair">
            <div class="prop-row">
              <span class="prop-label" title="Top-left">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 20V10a6 6 0 0 1 6-6h10" />
                </svg>
              </span>
              <input
                class="prop-input"
                type="number"
                :min="0"
                :value="radiusCorner(sel.styles.borderRadius, 'borderTopLeftRadius')"
                @input="setRadiusCorner(sel.id, 'borderTopLeftRadius', targetNumber($event))"
              />
            </div>
            <div class="prop-row">
              <span class="prop-label" title="Top-right">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 4h10a6 6 0 0 1 6 6v10" />
                </svg>
              </span>
              <input
                class="prop-input"
                type="number"
                :min="0"
                :value="radiusCorner(sel.styles.borderRadius, 'borderTopRightRadius')"
                @input="setRadiusCorner(sel.id, 'borderTopRightRadius', targetNumber($event))"
              />
            </div>
          </div>
          <div class="prop-row-pair">
            <div class="prop-row">
              <span class="prop-label" title="Bottom-left">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 4v10a6 6 0 0 0 6 6h10" />
                </svg>
              </span>
              <input
                class="prop-input"
                type="number"
                :min="0"
                :value="radiusCorner(sel.styles.borderRadius, 'borderBottomLeftRadius')"
                @input="setRadiusCorner(sel.id, 'borderBottomLeftRadius', targetNumber($event))"
              />
            </div>
            <div class="prop-row">
              <span class="prop-label" title="Bottom-right">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 4v10a6 6 0 0 1-6 6H4" />
                </svg>
              </span>
              <input
                class="prop-input"
                type="number"
                :min="0"
                :value="radiusCorner(sel.styles.borderRadius, 'borderBottomRightRadius')"
                @input="setRadiusCorner(sel.id, 'borderBottomRightRadius', targetNumber($event))"
              />
            </div>
          </div>
        </template>
      </template>

      <div v-if="sel.styles.borderWidth !== undefined && sel.type !== 'divider'" class="prop-row">
        <span class="prop-label">Border</span>
        <input
          class="prop-input"
          type="number"
          :min="0"
          :value="sel.styles.borderWidth"
          :style="{ width: '64px', flex: 'none' }"
          @input="sty(sel.id, 'borderWidth', targetNumber($event))"
        />
        <ColorInput
          :model-value="sel.styles.borderColor || '#DDDDDD'"
          @update:model-value="(v: string) => sty(sel!.id, 'borderColor', v)"
        />
      </div>

      <div class="prop-row">
        <span class="prop-label">Opacity</span>
        <input
          class="prop-slider"
          type="range"
          :min="0"
          :max="1"
          :step="0.01"
          :value="sel.styles.opacity != null ? sel.styles.opacity : 1"
          @input="sty(sel.id, 'opacity', targetNumber($event))"
        />
        <span class="opacity-val"
          >{{ Math.round((sel.styles.opacity != null ? sel.styles.opacity : 1) * 100) }}%</span
        >
      </div>
    </div>

    <div v-if="sel.type === 'image'" class="prop-section">
      <div class="prop-section-title">Image</div>
      <div class="prop-row">
        <span class="prop-label">URL</span>
        <input
          class="prop-input"
          type="text"
          placeholder="https://..."
          :value="sel.content?.startsWith('data:') ? '' : sel.content || ''"
          @input="upd(sel.id, 'content', targetValue($event))"
        />
      </div>
      <div class="prop-row">
        <span class="prop-label">Fit</span>
        <select
          class="prop-select"
          :value="sel.styles.objectFit || 'cover'"
          @change="sty(sel.id, 'objectFit', targetValue($event))"
        >
          <option value="cover">Cover</option>
          <option value="contain">Contain</option>
          <option value="fill">Fill</option>
        </select>
      </div>
      <div class="prop-row-pair">
        <div class="prop-row">
          <span
            class="prop-label"
            title="Horizontal offset. Accepts px or % (e.g. 100px, 50%, -20px)"
            >X</span
          >
          <input
            class="prop-input"
            type="text"
            placeholder="50%"
            title="Accepts px or % (e.g. 100px, 50%, -20px)"
            :value="parseImgPos(sel.styles.objectPosition).x"
            @input="setImgPosX(sel.id, targetValue($event))"
          />
        </div>
        <div class="prop-row">
          <span class="prop-label" title="Vertical offset. Accepts px or % (e.g. 100px, 50%, -20px)"
            >Y</span
          >
          <input
            class="prop-input"
            type="text"
            placeholder="50%"
            title="Accepts px or % (e.g. 100px, 50%, -20px)"
            :value="parseImgPos(sel.styles.objectPosition).y"
            @input="setImgPosY(sel.id, targetValue($event))"
          />
        </div>
      </div>
      <div class="prop-hint" :style="{ marginLeft: '52px' }">
        Accepts px or % — negative values allowed
      </div>
      <div class="prop-row-pair">
        <div class="prop-row">
          <span class="prop-label">H</span>
          <div class="toggle-group" :style="{ flex: 1 }">
            <button class="toggle-btn" title="Left" @click="setImgPosX(sel.id, '0%')">←</button>
            <button class="toggle-btn" title="Center X" @click="setImgPosX(sel.id, '50%')">
              ◎
            </button>
            <button class="toggle-btn" title="Right" @click="setImgPosX(sel.id, '100%')">→</button>
          </div>
        </div>
        <div class="prop-row">
          <span class="prop-label">V</span>
          <div class="toggle-group" :style="{ flex: 1 }">
            <button class="toggle-btn" title="Top" @click="setImgPosY(sel.id, '0%')">↑</button>
            <button class="toggle-btn" title="Center Y" @click="setImgPosY(sel.id, '50%')">
              ◎
            </button>
            <button class="toggle-btn" title="Bottom" @click="setImgPosY(sel.id, '100%')">↓</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="sel.type === 'video'" class="prop-section">
      <div class="prop-section-title">Video</div>
      <div class="prop-row">
        <span class="prop-label">URL</span>
        <input
          class="prop-input"
          type="text"
          placeholder="YouTube or Vimeo URL"
          :value="sel.content || ''"
          @input="upd(sel.id, 'content', targetValue($event))"
        />
      </div>
    </div>

    <div v-if="sel.type === 'button'" class="prop-section">
      <div class="prop-section-title">Link</div>
      <div class="prop-row">
        <span class="prop-label">URL</span>
        <input
          class="prop-input"
          type="text"
          placeholder="https://..."
          :value="sel.href || ''"
          @input="upd(sel.id, 'href', targetValue($event))"
        />
      </div>
      <div class="prop-row">
        <span class="prop-label">Open</span>
        <select
          class="prop-select"
          :value="sel.target || '_self'"
          @change="upd(sel.id, 'target', targetValue($event))"
        >
          <option value="_self">Same tab</option>
          <option value="_blank">New tab</option>
        </select>
      </div>
    </div>

    <div v-if="sel.type === 'code'" class="prop-section">
      <div class="prop-section-title">Code</div>
      <div class="prop-row">
        <span class="prop-label">Lang</span>
        <SearchableSelect
          :model-value="sel.language || 'plaintext'"
          :options="LANGUAGES"
          placeholder="Search language..."
          @update:model-value="(v: string) => upd(sel!.id, 'language', v)"
        />
      </div>
      <div class="prop-row" :style="{ alignItems: 'flex-start' }">
        <span class="prop-label" :style="{ marginTop: '6px' }">Code</span>
        <textarea
          class="prop-input"
          :style="{ height: '120px', padding: '6px', fontFamily: 'monospace', resize: 'vertical' }"
          :value="sel.content || ''"
          @input="upd(sel.id, 'content', targetValue($event))"
        ></textarea>
      </div>
      <div class="prop-row">
        <span class="prop-label">Copy</span>
        <label class="prop-toggle">
          <input
            type="checkbox"
            :checked="sel.copyEnabled !== false"
            @change="upd(sel.id, 'copyEnabled', ($event.target as HTMLInputElement).checked)"
          />
          <span>Show copy button</span>
        </label>
      </div>
    </div>

    <div v-if="sel.type === 'input'" class="prop-section">
      <div class="prop-section-title">Input</div>
      <div class="prop-row">
        <span class="prop-label">Type</span>
        <select
          class="prop-select"
          :value="sel.inputType || 'text'"
          @change="upd(sel.id, 'inputType', targetValue($event))"
        >
          <option v-for="t in INPUT_TYPES" :key="t.v" :value="t.v">{{ t.label }}</option>
        </select>
      </div>
      <div class="prop-row">
        <span class="prop-label">Label</span>
        <input
          class="prop-input"
          type="text"
          placeholder="Optional label"
          :value="sel.inputLabel || ''"
          @input="upd(sel.id, 'inputLabel', targetValue($event))"
        />
      </div>
      <div v-if="sel.inputType !== 'checkbox'" class="prop-row">
        <span class="prop-label">Placeholder</span>
        <input
          class="prop-input"
          type="text"
          placeholder="Placeholder text"
          :value="sel.placeholder || ''"
          @input="upd(sel.id, 'placeholder', targetValue($event))"
        />
      </div>
      <div
        v-if="sel.inputType === 'select' || sel.inputType === 'radio'"
        class="prop-row"
        :style="{ alignItems: 'flex-start' }"
      >
        <span class="prop-label" :style="{ marginTop: '6px' }">Options</span>
        <textarea
          class="prop-input"
          :style="{ height: '80px', padding: '6px', resize: 'vertical' }"
          placeholder="One option per line"
          :value="sel.inputOptions || ''"
          @input="upd(sel.id, 'inputOptions', targetValue($event))"
        ></textarea>
      </div>
      <div v-if="sel.inputType === 'checkbox'" class="prop-row">
        <span class="prop-label">Text</span>
        <input
          class="prop-input"
          type="text"
          placeholder="Checkbox label"
          :value="sel.inputLabel || ''"
          @input="upd(sel.id, 'inputLabel', targetValue($event))"
        />
      </div>
      <div class="prop-row">
        <span class="prop-label">Required</span>
        <label class="prop-toggle">
          <input
            type="checkbox"
            :checked="!!sel.required"
            @change="upd(sel.id, 'required', ($event.target as HTMLInputElement).checked)"
          />
          <span>Mark as required</span>
        </label>
      </div>
    </div>

    <div v-if="sel.type === 'frame'" class="prop-section">
      <div class="prop-section-title">Frame</div>
      <div class="prop-row">
        <span class="prop-label">Clip</span>
        <label class="prop-toggle">
          <input
            type="checkbox"
            :checked="!!sel.clipContent"
            @change="
              cms.updateElement(sel.id, {
                clipContent: ($event.target as HTMLInputElement).checked,
              })
            "
          />
          <span>Hide overflow</span>
        </label>
      </div>
      <div :style="{ display: 'flex', gap: '6px', marginTop: '4px' }">
        <button class="btn-sm" @click="cms.ungroupFrame(sel.id)">Ungroup</button>
      </div>
    </div>

    <div v-if="sel.type === 'frame'" class="prop-section">
      <div class="prop-section-title">Auto layout</div>
      <div class="prop-row">
        <span class="prop-label">Direction</span>
        <div class="toggle-group">
          <button
            :class="['toggle-btn', { active: (sel.layoutDirection ?? 'none') === 'none' }]"
            title="No auto layout"
            @click="cms.updateElement(sel.id, { layoutDirection: 'none' })"
          >
            Off
          </button>
          <button
            :class="['toggle-btn', { active: sel.layoutDirection === 'vertical' }]"
            title="Vertical stack"
            @click="cms.updateElement(sel.id, { layoutDirection: 'vertical' })"
          >
            ↓
          </button>
          <button
            :class="['toggle-btn', { active: sel.layoutDirection === 'horizontal' }]"
            title="Horizontal row"
            @click="cms.updateElement(sel.id, { layoutDirection: 'horizontal' })"
          >
            →
          </button>
        </div>
      </div>
      <template v-if="(sel.layoutDirection ?? 'none') !== 'none'">
        <div class="prop-row">
          <span class="prop-label">Gap</span>
          <input
            class="prop-input"
            type="number"
            :min="0"
            :value="sel.layoutGap ?? 8"
            @input="cms.updateElement(sel.id, { layoutGap: Math.max(0, targetNumber($event)) })"
          />
        </div>
        <div class="prop-row">
          <span class="prop-label">Align</span>
          <select
            class="prop-select"
            :value="sel.layoutAlign ?? 'start'"
            @change="cms.updateElement(sel.id, { layoutAlign: targetValue($event) as any })"
          >
            <option value="start">Start</option>
            <option value="center">Center</option>
            <option value="end">End</option>
            <option value="stretch">Stretch</option>
          </select>
        </div>
        <div class="prop-row">
          <span class="prop-label">Padding</span>
          <button
            class="btn-sm"
            :title="padSidesExpanded ? 'Use paired H/V inputs' : 'Set each side individually'"
            :style="{ marginLeft: 'auto', padding: '3px 6px' }"
            @click="padSidesExpanded = !padSidesExpanded"
          >
            {{ padSidesExpanded ? '⧉ Sides' : '⇔ H/V' }}
          </button>
        </div>
        <template v-if="!padSidesExpanded">
          <div class="prop-row-pair">
            <div class="prop-row">
              <span class="prop-label" title="Horizontal (left + right)">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                >
                  <path d="M4 4v16M20 4v16" />
                  <path d="M4 12h4M16 12h4" />
                </svg>
              </span>
              <input
                class="prop-input"
                type="number"
                :min="0"
                placeholder="0"
                :value="sel.styles.paddingLeft ?? sel.styles.padding ?? ''"
                @input="setPadX(sel.id, targetNumber($event))"
              />
            </div>
            <div class="prop-row">
              <span class="prop-label" title="Vertical (top + bottom)">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                >
                  <path d="M4 4h16M4 20h16" />
                  <path d="M12 4v4M12 16v4" />
                </svg>
              </span>
              <input
                class="prop-input"
                type="number"
                :min="0"
                placeholder="0"
                :value="sel.styles.paddingTop ?? sel.styles.padding ?? ''"
                @input="setPadY(sel.id, targetNumber($event))"
              />
            </div>
          </div>
        </template>
        <template v-else>
          <div class="prop-row-pair">
            <div class="prop-row">
              <span class="prop-label" title="Top">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                >
                  <path d="M4 5h16" />
                  <path d="M12 10v9" />
                  <polyline points="9,13 12,10 15,13" />
                </svg>
              </span>
              <input
                class="prop-input"
                type="number"
                :min="0"
                placeholder="0"
                :value="sel.styles.paddingTop ?? sel.styles.padding ?? ''"
                @input="sty(sel.id, 'paddingTop', targetNumber($event))"
              />
            </div>
            <div class="prop-row">
              <span class="prop-label" title="Right">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                >
                  <path d="M19 4v16" />
                  <path d="M14 12H5" />
                  <polyline points="11,9 14,12 11,15" />
                </svg>
              </span>
              <input
                class="prop-input"
                type="number"
                :min="0"
                placeholder="0"
                :value="sel.styles.paddingRight ?? sel.styles.padding ?? ''"
                @input="sty(sel.id, 'paddingRight', targetNumber($event))"
              />
            </div>
          </div>
          <div class="prop-row-pair">
            <div class="prop-row">
              <span class="prop-label" title="Bottom">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                >
                  <path d="M4 19h16" />
                  <path d="M12 5v9" />
                  <polyline points="9,11 12,14 15,11" />
                </svg>
              </span>
              <input
                class="prop-input"
                type="number"
                :min="0"
                placeholder="0"
                :value="sel.styles.paddingBottom ?? sel.styles.padding ?? ''"
                @input="sty(sel.id, 'paddingBottom', targetNumber($event))"
              />
            </div>
            <div class="prop-row">
              <span class="prop-label" title="Left">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                >
                  <path d="M5 4v16" />
                  <path d="M10 12h9" />
                  <polyline points="13,9 10,12 13,15" />
                </svg>
              </span>
              <input
                class="prop-input"
                type="number"
                :min="0"
                placeholder="0"
                :value="sel.styles.paddingLeft ?? sel.styles.padding ?? ''"
                @input="sty(sel.id, 'paddingLeft', targetNumber($event))"
              />
            </div>
          </div>
        </template>
        <div class="prop-row">
          <span class="prop-label">Grow</span>
          <label class="prop-toggle">
            <input
              type="checkbox"
              :checked="!!sel.layoutGrow"
              @change="
                cms.updateElement(sel.id, {
                  layoutGrow: ($event.target as HTMLInputElement).checked,
                })
              "
            />
            <span>Fit content</span>
          </label>
        </div>
      </template>
    </div>

    <div class="prop-section">
      <div class="prop-section-title">Align to canvas</div>
      <div class="prop-row">
        <span class="prop-label">H</span>
        <div class="toggle-group">
          <button class="toggle-btn" title="Align left" @click="cms.alignH(sel.id, 'left')">
            <Icon name="align-left-edge" :size="14" />
          </button>
          <button
            class="toggle-btn"
            title="Center horizontally"
            @click="cms.alignH(sel.id, 'center')"
          >
            <Icon name="align-center-h" :size="14" />
          </button>
          <button class="toggle-btn" title="Align right" @click="cms.alignH(sel.id, 'right')">
            <Icon name="align-right-edge" :size="14" />
          </button>
        </div>
      </div>
      <div class="prop-row">
        <span class="prop-label">V</span>
        <div class="toggle-group">
          <button class="toggle-btn" title="Align top" @click="cms.alignV(sel.id, 'top')">
            <Icon name="align-top-edge" :size="14" />
          </button>
          <button
            class="toggle-btn"
            title="Center vertically"
            @click="cms.alignV(sel.id, 'middle')"
          >
            <Icon name="align-center-v" :size="14" />
          </button>
          <button class="toggle-btn" title="Align bottom" @click="cms.alignV(sel.id, 'bottom')">
            <Icon name="align-bottom-edge" :size="14" />
          </button>
        </div>
      </div>
      <div class="prop-row">
        <span class="prop-label">Fill W</span>
        <label class="prop-toggle">
          <input
            type="checkbox"
            :checked="!!sel.responsive"
            @change="cms.toggleResponsive(sel.id)"
          />
          <span>Full canvas width</span>
        </label>
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
