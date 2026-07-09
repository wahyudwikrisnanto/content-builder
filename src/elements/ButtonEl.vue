<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue'
import type { CSSProperties } from 'vue'
import { useCms } from '../composables/useCms'
import { textStrokeStyle } from '../composables/textStroke'
import { paddingValue } from '../composables/styleHelpers'
import { borderRadiusCss } from '../composables/useBorderRadius'
import type { CmsElement } from '../types'

const props = defineProps<{ element: CmsElement; isEditing: boolean }>()
const cms = useCms()
const editorRef = ref<HTMLElement | null>(null)

const btnStyle = computed<CSSProperties>(() => {
  const s = props.element.styles
  return {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent:
      s.textAlign === 'left' ? 'flex-start' : s.textAlign === 'right' ? 'flex-end' : 'center',
    padding: paddingValue(s) ?? (s.padding ?? 10) + 'px',
    backgroundColor: s.backgroundColor || '#2563EB',
    color: s.color || '#FFFFFF',
    border: s.borderWidth ? `${s.borderWidth}px solid ${s.borderColor}` : 'none',
    borderRadius: borderRadiusCss(s.borderRadius, 8),
    opacity: s.opacity ?? 1,
    fontSize: (s.fontSize ?? 14) + 'px',
    fontWeight: s.fontWeight as CSSProperties['fontWeight'],
    fontStyle: s.fontStyle,
    textDecoration: s.textDecoration,
    textAlign: s.textAlign || 'center',
    lineHeight: s.lineHeight ?? 1.2,
    letterSpacing: (s.letterSpacing ?? 0) + 'px',
    fontFamily: 'inherit',
    outline: 'none',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    cursor: props.isEditing ? 'text' : 'inherit',
    userSelect: props.isEditing ? 'text' : 'none',
    boxSizing: 'border-box',
    ...textStrokeStyle(s),
  }
})

watch(
  () => props.isEditing,
  async (v) => {
    if (!v) return
    await nextTick()
    const el = editorRef.value
    if (!el) return
    el.innerText = props.element.content || ''
    el.focus()
    try {
      const sel = window.getSelection()
      const range = document.createRange()
      range.selectNodeContents(el)
      sel?.removeAllRanges()
      sel?.addRange(range)
    } catch {}
  },
)

function onInput(e: Event): void {
  const t = e.target as HTMLElement
  cms.updateElement(props.element.id, { content: t.innerText }, { noHistory: true })
}
function onBlur(): void {
  cms.setEditing(null)
}
function onKeyDown(e: KeyboardEvent): void {
  if (e.key === 'Escape') (e.target as HTMLElement).blur()
  if (e.key === 'Enter') e.preventDefault()
}
function onPaste(e: ClipboardEvent): void {
  e.preventDefault()
  const text = e.clipboardData?.getData('text/plain') ?? ''
  document.execCommand('insertText', false, text.replace(/\n/g, ' '))
}
</script>

<template>
  <div
    v-if="isEditing"
    ref="editorRef"
    contenteditable="true"
    :style="btnStyle"
    @input="onInput"
    @blur="onBlur"
    @paste="onPaste"
    @mousedown.stop
    @keydown="onKeyDown"
  ></div>
  <a
    v-else-if="cms.state.preview && element.href"
    :href="element.href"
    :target="element.target || '_self'"
    rel="noopener noreferrer"
    :style="{ ...btnStyle, textDecoration: 'none', cursor: 'pointer' }"
    >{{ element.content }}</a
  >
  <div v-else :style="btnStyle">{{ element.content }}</div>
</template>
