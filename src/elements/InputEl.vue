<script setup lang="ts">
import { computed } from 'vue'
import type { CSSProperties } from 'vue'
import { useCms } from '../composables/useCms'
import type { CmsElement } from '../types'

const props = defineProps<{ element: CmsElement; isEditing: boolean }>()
const cms = useCms()

const s = computed(() => props.element.styles)
const inputType = computed(() => props.element.inputType ?? 'text')
const isTextarea = computed(() => inputType.value === 'textarea')
const isSelect = computed(() => inputType.value === 'select')
const isCheckbox = computed(() => inputType.value === 'checkbox')
const isRadio = computed(() => inputType.value === 'radio')

const options = computed<string[]>(() =>
  (props.element.inputOptions || '')
    .split('\n')
    .map((o) => o.trim())
    .filter(Boolean),
)

const baseStyle = computed<CSSProperties>(() => ({
  width: '100%',
  height: '100%',
  fontFamily: 'inherit',
  fontSize: (s.value.fontSize ?? 14) + 'px',
  fontWeight: s.value.fontWeight as CSSProperties['fontWeight'],
  color: s.value.color || '#222',
  backgroundColor: s.value.backgroundColor || '#fff',
  border: s.value.borderWidth
    ? `${s.value.borderWidth}px solid ${s.value.borderColor}`
    : '1px solid #D1D5DB',
  borderRadius: (s.value.borderRadius ?? 6) + 'px',
  padding: (s.value.padding ?? 10) + 'px',
  opacity: s.value.opacity ?? 1,
  boxSizing: 'border-box' as const,
  outline: 'none',
  resize: 'none' as const,
}))

const labelStyle = computed<CSSProperties>(() => ({
  display: 'block',
  fontSize: (s.value.fontSize ?? 14) + 'px',
  fontWeight: (s.value.fontWeight as CSSProperties['fontWeight']) ?? '500',
  color: s.value.color || '#374151',
  fontFamily: 'inherit',
  marginBottom: '4px',
}))

// In preview: real interactive element. In builder: visual mock (pointer-events none).
const isPreview = computed(() => cms.state.preview)
</script>

<template>
  <!-- Checkbox -->
  <div
    v-if="isCheckbox"
    :style="{
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      opacity: s.opacity ?? 1,
      fontFamily: 'inherit',
      fontSize: (s.fontSize ?? 14) + 'px',
      color: s.color || '#222',
      pointerEvents: isPreview ? 'auto' : 'none',
    }"
  >
    <input
      type="checkbox"
      :style="{
        width: '16px',
        height: '16px',
        cursor: 'pointer',
        accentColor:
          s.backgroundColor &&
          s.backgroundColor !== '#fff' &&
          s.backgroundColor !== '#ffffff' &&
          s.backgroundColor !== 'transparent'
            ? s.backgroundColor
            : '#2563eb',
      }"
    />
    <span>{{ element.inputLabel || 'Checkbox' }}</span>
    <span v-if="element.required" :style="{ color: '#ef4444' }">*</span>
  </div>

  <!-- Radio group -->
  <div
    v-else-if="isRadio"
    :style="{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      opacity: s.opacity ?? 1,
      fontFamily: 'inherit',
      fontSize: (s.fontSize ?? 14) + 'px',
      color: s.color || '#222',
      pointerEvents: isPreview ? 'auto' : 'none',
      overflowY: 'auto',
    }"
  >
    <label
      v-for="opt in options"
      :key="opt"
      :style="{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }"
    >
      <input
        type="radio"
        :name="element.id"
        :style="{ width: '15px', height: '15px', accentColor: '#2563eb' }"
      />
      <span>{{ opt }}</span>
    </label>
    <span v-if="element.required" :style="{ color: '#ef4444', fontSize: '12px' }">* Required</span>
  </div>

  <!-- Select -->
  <div
    v-else-if="isSelect"
    :style="{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      pointerEvents: isPreview ? 'auto' : 'none',
    }"
  >
    <label v-if="element.inputLabel" :style="labelStyle">
      {{ element.inputLabel }}<span v-if="element.required" :style="{ color: '#ef4444' }"> *</span>
    </label>
    <select :style="{ ...baseStyle, cursor: 'pointer', appearance: 'auto' }">
      <option v-if="element.placeholder" value="" disabled selected>
        {{ element.placeholder }}
      </option>
      <option v-for="opt in options" :key="opt" :value="opt">{{ opt }}</option>
    </select>
  </div>

  <!-- Textarea -->
  <div
    v-else-if="isTextarea"
    :style="{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      pointerEvents: isPreview ? 'auto' : 'none',
    }"
  >
    <label v-if="element.inputLabel" :style="labelStyle">
      {{ element.inputLabel }}<span v-if="element.required" :style="{ color: '#ef4444' }"> *</span>
    </label>
    <textarea
      :style="{ ...baseStyle, flex: '1', minHeight: '0' }"
      :placeholder="element.placeholder || ''"
      :required="element.required"
      :value="element.content"
    ></textarea>
  </div>

  <!-- Standard text inputs -->
  <div
    v-else
    :style="{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      pointerEvents: isPreview ? 'auto' : 'none',
    }"
  >
    <label v-if="element.inputLabel" :style="labelStyle">
      {{ element.inputLabel }}<span v-if="element.required" :style="{ color: '#ef4444' }"> *</span>
    </label>
    <input
      :type="inputType"
      :style="baseStyle"
      :placeholder="element.placeholder || ''"
      :required="element.required"
      :value="element.content"
    />
  </div>
</template>
