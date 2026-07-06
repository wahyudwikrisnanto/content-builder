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
const viewRef = ref<HTMLElement | null>(null)
const measureRef = ref<HTMLElement | null>(null)

useAutoSize(toRef(props, 'element'), () => measureRef.value, () => [
  props.element.content,
  props.element.styles.fontSize,
  props.element.styles.lineHeight,
  props.element.styles.padding,
  props.element.styles.fontWeight,
  props.element.styles.letterSpacing,
  props.element.styles.listType,
  props.element.styles.textStrokeWidth,
  props.element.width,
  props.isEditing,
])

const listType = computed(() => props.element.styles.listType || 'none')
const lines = computed(() => (props.element.content || '').split('\n'))

const baseStyle = computed<CSSProperties>(() => {
  const s = props.element.styles
  return {
    width: '100%', height: '100%',
    padding: paddingValue(s) ?? ((s.padding ?? 10) + 'px'),
    fontSize: s.fontSize + 'px',
    fontWeight: s.fontWeight as CSSProperties['fontWeight'],
    fontStyle: s.fontStyle,
    textDecoration: s.textDecoration,
    color: s.color,
    backgroundColor: s.backgroundColor === 'transparent' ? 'transparent' : s.backgroundColor,
    textAlign: s.textAlign,
    lineHeight: s.lineHeight,
    letterSpacing: s.letterSpacing + 'px',
    borderRadius: s.borderRadius + 'px',
    overflow: props.isEditing ? 'visible' : 'hidden', wordWrap: 'break-word', outline: 'none',
    fontFamily: 'inherit',
    ...textStrokeStyle(s),
  }
})

const listInlineStyle: CSSProperties = {
  margin: 0,
  paddingLeft: '1.5em',
  listStylePosition: 'outside',
}

function getCaretOffset(root: HTMLElement): number {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return 0
  const range = sel.getRangeAt(0)
  const pre = range.cloneRange()
  pre.selectNodeContents(root)
  pre.setEnd(range.endContainer, range.endOffset)
  // Count text chars + 1 per <li> boundary except first (= newline)
  return measureOffset(root, range.endContainer, range.endOffset)
}

function measureOffset(root: HTMLElement, endNode: Node, endOffset: number): number {
  let count = 0
  let found = false
  const walk = (n: Node): void => {
    if (found) return
    if (n === endNode) {
      if (n.nodeType === Node.TEXT_NODE) count += endOffset
      found = true
      return
    }
    if (n.nodeType === Node.TEXT_NODE) {
      count += (n.nodeValue ?? '').length
    } else if (n.nodeType === Node.ELEMENT_NODE) {
      const el = n as HTMLElement
      // Newline before each LI except the first within its list
      if (el.tagName === 'LI' && el.previousElementSibling) count += 1
      // BR adds newline
      if (el.tagName === 'BR') count += 1
      for (const child of Array.from(n.childNodes)) {
        walk(child); if (found) return
      }
    }
  }
  walk(root)
  return count
}

function setCaretOffset(root: HTMLElement, offset: number): void {
  const sel = window.getSelection(); if (!sel) return
  let remaining = offset
  let placed = false

  const place = (n: Node, pos: number): void => {
    const range = document.createRange()
    range.setStart(n, pos); range.collapse(true)
    sel.removeAllRanges(); sel.addRange(range)
    placed = true
  }

  const walk = (n: Node): void => {
    if (placed) return
    if (n.nodeType === Node.TEXT_NODE) {
      const len = (n.nodeValue ?? '').length
      if (remaining <= len) { place(n, remaining); return }
      remaining -= len
    } else if (n.nodeType === Node.ELEMENT_NODE) {
      const el = n as HTMLElement
      if (el.tagName === 'LI' && el.previousElementSibling) {
        if (remaining === 0) {
          // Place at start of this LI
          const first = el.firstChild
          if (first && first.nodeType === Node.TEXT_NODE) place(first, 0)
          else place(el, 0)
          return
        }
        remaining -= 1
      }
      if (el.tagName === 'BR') {
        if (remaining === 0) { place(el.parentNode!, Array.from(el.parentNode!.childNodes).indexOf(el)); return }
        remaining -= 1
      }
      for (const child of Array.from(n.childNodes)) {
        walk(child); if (placed) return
      }
    }
  }
  walk(root)
  if (!placed) {
    const range = document.createRange()
    range.selectNodeContents(root); range.collapse(false)
    sel.removeAllRanges(); sel.addRange(range)
  }
}

function paintFromContent(content: string): void {
  const el = editorRef.value; if (!el) return
  const lt = listType.value
  if (lt === 'bullet' || lt === 'number') {
    const ls = content.split('\n')
    el.innerHTML = ls.map(l => `<li>${escapeHtml(l) || '<br>'}</li>`).join('')
  } else {
    // Plain text: use innerText so newlines render naturally under white-space: pre-wrap
    el.innerText = content
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function readContent(): string {
  const el = editorRef.value
  if (!el) return ''
  const lt = listType.value
  if (lt === 'bullet' || lt === 'number') {
    return Array.from(el.querySelectorAll('li')).map(li => li.innerText.replace(/\n$/, '')).join('\n')
  }
  // For non-list editor (div with <br>): innerText preserves newlines
  return el.innerText
}

watch(() => props.isEditing, async (v) => {
  if (!v) return
  await nextTick()
  paintFromContent(props.element.content || '')
  editorRef.value?.focus()
  const el = editorRef.value
  if (!el) return
  const sel = window.getSelection()
  if (sel) {
    const range = document.createRange()
    range.selectNodeContents(el); range.collapse(false)
    sel.removeAllRanges(); sel.addRange(range)
  }
})

// Repaint when list type toggled mid-edit
watch(() => listType.value, () => {
  if (!props.isEditing) return
  const el = editorRef.value; if (!el) return
  const off = getCaretOffset(el)
  paintFromContent(props.element.content || '')
  setCaretOffset(el, off)
})

function onInput(): void {
  const text = readContent()
  cms.updateElement(props.element.id, { content: text }, { noHistory: true })
}

function onBlur(): void { cms.setEditing(null) }
function onKeyDown(e: KeyboardEvent): void {
  if (e.key === 'Escape') { (e.target as HTMLElement).blur(); return }
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
  <div :style="{ width: '100%', height: '100%', position: 'relative' }">
    <template v-if="isEditing">
      <ul v-if="listType === 'bullet'"
        ref="editorRef" contenteditable="true"
        :style="{ ...baseStyle, ...listInlineStyle, cursor: 'text' }"
        @input="onInput" @blur="onBlur" @mousedown.stop @keydown="onKeyDown"></ul>
      <ol v-else-if="listType === 'number'"
        ref="editorRef" contenteditable="true"
        :style="{ ...baseStyle, ...listInlineStyle, cursor: 'text' }"
        @input="onInput" @blur="onBlur" @mousedown.stop @keydown="onKeyDown"></ol>
      <div v-else
        ref="editorRef" contenteditable="true"
        :style="{ ...baseStyle, whiteSpace: 'pre-wrap', cursor: 'text' }"
        @input="onInput" @blur="onBlur" @paste="onPaste" @mousedown.stop @keydown="onKeyDown"></div>
    </template>
    <ul v-else-if="listType === 'bullet'" ref="viewRef"
      :style="{ ...baseStyle, ...listInlineStyle, cursor: 'move', userSelect: 'none' }">
      <li v-for="(ln, i) in lines" :key="i">{{ ln }}</li>
    </ul>
    <ol v-else-if="listType === 'number'" ref="viewRef"
      :style="{ ...baseStyle, ...listInlineStyle, cursor: 'move', userSelect: 'none' }">
      <li v-for="(ln, i) in lines" :key="i">{{ ln }}</li>
    </ol>
    <div v-else ref="viewRef"
      :style="{ ...baseStyle, whiteSpace: 'pre-wrap', cursor: 'move', userSelect: 'none' }">{{ element.content }}</div>

    <!-- Off-screen content clone for natural-height measurement -->
    <ul v-if="listType === 'bullet'" ref="measureRef" aria-hidden="true"
      :style="{
        ...baseStyle, ...listInlineStyle, height: 'auto', overflow: 'visible',
        position: 'absolute', top: '0', left: '0', right: '0',
        visibility: 'hidden', pointerEvents: 'none', zIndex: -1,
      }">
      <li v-for="(ln, i) in lines" :key="i">{{ ln || ' ' }}</li>
    </ul>
    <ol v-else-if="listType === 'number'" ref="measureRef" aria-hidden="true"
      :style="{
        ...baseStyle, ...listInlineStyle, height: 'auto', overflow: 'visible',
        position: 'absolute', top: '0', left: '0', right: '0',
        visibility: 'hidden', pointerEvents: 'none', zIndex: -1,
      }">
      <li v-for="(ln, i) in lines" :key="i">{{ ln || ' ' }}</li>
    </ol>
    <div v-else ref="measureRef" aria-hidden="true"
      :style="{
        ...baseStyle, whiteSpace: 'pre-wrap', height: 'auto', overflow: 'visible',
        position: 'absolute', top: '0', left: '0', right: '0',
        visibility: 'hidden', pointerEvents: 'none', zIndex: -1,
      }">{{ element.content }}</div>
  </div>
</template>
