<script setup lang="ts">
import { ref, toRef, watch, nextTick, computed } from 'vue'
import type { CSSProperties } from 'vue'
import { useCms } from '../composables/useCms'
import { useAutoSize } from '../composables/useAutoSize'
import { textStrokeStyle } from '../composables/textStroke'
import { paddingValue } from '../composables/styleHelpers'
import type { CmsElement } from '../types'

const props = defineProps<{ element: CmsElement; isEditing: boolean }>()
const cms = useCms()
const editorRef = ref<HTMLElement | null>(null)
const measureRef = ref<HTMLElement | null>(null)

useAutoSize(
  toRef(props, 'element'),
  () => measureRef.value,
  () => [
    props.element.content,
    props.element.styles.fontSize,
    props.element.styles.lineHeight,
    props.element.styles.padding,
    props.element.styles.listType,
    props.element.width,
    props.isEditing,
  ],
)

const listType = computed(() => props.element.styles.listType || 'none')
const lines = computed(() => (props.element.content || '').split('\n'))

const boxStyle = computed<CSSProperties>(() => {
  const s = props.element.styles
  return {
    width: '100%',
    height: '100%',
    backgroundColor: s.backgroundColor,
    borderRadius: (s.borderRadius ?? 0) + 'px',
    border: s.borderWidth ? `${s.borderWidth}px solid ${s.borderColor}` : 'none',
    opacity: s.opacity,
    display: 'flex',
    alignItems: 'center',
    justifyContent:
      s.textAlign === 'right' ? 'flex-end' : s.textAlign === 'center' ? 'center' : 'flex-start',
    overflow: 'hidden',
    position: 'relative',
  }
})

const textStyle = computed<CSSProperties>(() => {
  const s = props.element.styles
  return {
    width: '100%',
    padding: paddingValue(s) ?? (s.padding ?? 8) + 'px',
    fontSize: (s.fontSize ?? 14) + 'px',
    fontWeight: s.fontWeight as CSSProperties['fontWeight'],
    fontStyle: s.fontStyle,
    textDecoration: s.textDecoration,
    color: s.color || '#222',
    textAlign: s.textAlign || 'center',
    lineHeight: s.lineHeight ?? 1.4,
    letterSpacing: (s.letterSpacing ?? 0) + 'px',
    outline: 'none',
    wordWrap: 'break-word',
    fontFamily: 'inherit',
    cursor: props.isEditing ? 'text' : 'inherit',
    userSelect: props.isEditing ? 'text' : 'none',
    ...textStrokeStyle(s),
  }
})

const listInlineStyle: CSSProperties = {
  margin: 0,
  paddingLeft: '1.5em',
  listStylePosition: 'outside',
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function paintFromContent(content: string): void {
  const el = editorRef.value
  if (!el) return
  const lt = listType.value
  if (lt === 'bullet' || lt === 'number') {
    const ls = content.split('\n')
    el.innerHTML = ls.map((l) => `<li>${escapeHtml(l) || '<br>'}</li>`).join('')
  } else {
    el.innerText = content
  }
}

function readContent(): string {
  const el = editorRef.value
  if (!el) return ''
  const lt = listType.value
  if (lt === 'bullet' || lt === 'number') {
    return Array.from(el.querySelectorAll('li'))
      .map((li) => li.innerText.replace(/\n$/, ''))
      .join('\n')
  }
  return el.innerText
}

watch(
  () => props.isEditing,
  async (v) => {
    if (!v) return
    await nextTick()
    paintFromContent(props.element.content || '')
    editorRef.value?.focus()
    const el = editorRef.value
    if (!el) return
    const sel = window.getSelection()
    if (sel) {
      const range = document.createRange()
      range.selectNodeContents(el)
      range.collapse(false)
      sel.removeAllRanges()
      sel.addRange(range)
    }
  },
)

watch(
  () => listType.value,
  () => {
    if (!props.isEditing) return
    paintFromContent(props.element.content || '')
  },
)

function onInput(): void {
  cms.updateElement(props.element.id, { content: readContent() }, { noHistory: true })
}
function onBlur(): void {
  cms.setEditing(null)
}
function onKeyDown(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    ;(e.target as HTMLElement).blur()
    return
  }
  if (e.key === 'Enter' && listType.value === 'none') {
    e.preventDefault()
    document.execCommand('insertLineBreak')
  }
}
function onPaste(e: ClipboardEvent): void {
  if (listType.value !== 'none') return
  e.preventDefault()
  const text = e.clipboardData?.getData('text/plain') ?? ''
  document.execCommand('insertText', false, text)
}
</script>

<template>
  <div :style="boxStyle">
    <template v-if="isEditing">
      <ul
        v-if="listType === 'bullet'"
        ref="editorRef"
        contenteditable="true"
        :style="{ ...textStyle, ...listInlineStyle }"
        @input="onInput"
        @blur="onBlur"
        @mousedown.stop
        @keydown="onKeyDown"
      ></ul>
      <ol
        v-else-if="listType === 'number'"
        ref="editorRef"
        contenteditable="true"
        :style="{ ...textStyle, ...listInlineStyle }"
        @input="onInput"
        @blur="onBlur"
        @mousedown.stop
        @keydown="onKeyDown"
      ></ol>
      <div
        v-else
        ref="editorRef"
        contenteditable="true"
        :style="{ ...textStyle, whiteSpace: 'pre-wrap' }"
        @input="onInput"
        @blur="onBlur"
        @paste="onPaste"
        @mousedown.stop
        @keydown="onKeyDown"
      ></div>
    </template>
    <ul v-else-if="listType === 'bullet'" :style="{ ...textStyle, ...listInlineStyle }">
      <li v-for="(ln, i) in lines" :key="i">{{ ln }}</li>
    </ul>
    <ol v-else-if="listType === 'number'" :style="{ ...textStyle, ...listInlineStyle }">
      <li v-for="(ln, i) in lines" :key="i">{{ ln }}</li>
    </ol>
    <div v-else :style="{ ...textStyle, whiteSpace: 'pre-wrap' }">{{ element.content }}</div>

    <!-- measurer -->
    <ul
      v-if="listType === 'bullet'"
      ref="measureRef"
      aria-hidden="true"
      :style="{
        ...textStyle,
        ...listInlineStyle,
        height: 'auto',
        overflow: 'visible',
        position: 'absolute',
        top: '0',
        left: '0',
        right: '0',
        visibility: 'hidden',
        pointerEvents: 'none',
        zIndex: -1,
      }"
    >
      <li v-for="(ln, i) in lines" :key="i">{{ ln || ' ' }}</li>
    </ul>
    <ol
      v-else-if="listType === 'number'"
      ref="measureRef"
      aria-hidden="true"
      :style="{
        ...textStyle,
        ...listInlineStyle,
        height: 'auto',
        overflow: 'visible',
        position: 'absolute',
        top: '0',
        left: '0',
        right: '0',
        visibility: 'hidden',
        pointerEvents: 'none',
        zIndex: -1,
      }"
    >
      <li v-for="(ln, i) in lines" :key="i">{{ ln || ' ' }}</li>
    </ol>
    <div
      v-else
      ref="measureRef"
      aria-hidden="true"
      :style="{
        ...textStyle,
        whiteSpace: 'pre-wrap',
        height: 'auto',
        overflow: 'visible',
        position: 'absolute',
        top: '0',
        left: '0',
        right: '0',
        visibility: 'hidden',
        pointerEvents: 'none',
        zIndex: -1,
      }"
    >
      {{ element.content || ' ' }}
    </div>
  </div>
</template>
