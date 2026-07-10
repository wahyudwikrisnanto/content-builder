<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue'
import type { CSSProperties } from 'vue'
import hljs from 'highlight.js/lib/common'
import 'highlight.js/styles/atom-one-dark.css'
import { useCms } from '../composables/useCms'
import { paddingValue, radiusValue } from '../composables/styleHelpers'
import Icon from '../icons/Icon.vue'
import type { CmsElement } from '../types'

const props = defineProps<{ element: CmsElement; isEditing: boolean }>()
const cms = useCms()
const editorRef = ref<HTMLElement | null>(null)
const copied = ref(false)
let copyTimer: ReturnType<typeof setTimeout> | null = null

async function copyCode(e: MouseEvent): Promise<void> {
  e.stopPropagation()
  const text = props.element.content || ''
  try {
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text)
    else {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
    copied.value = true
    if (copyTimer) clearTimeout(copyTimer)
    copyTimer = setTimeout(() => {
      copied.value = false
    }, 1500)
  } catch {}
}

const boxStyle = computed<CSSProperties>(() => {
  const s = props.element.styles
  return {
    width: '100%',
    height: '100%',
    backgroundColor: s.backgroundColor || '#282C34',
    borderRadius: radiusValue(s.borderRadius),
    border: s.borderWidth ? `${s.borderWidth}px solid ${s.borderColor}` : 'none',
    opacity: s.opacity ?? 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  }
})

const codeStyle = computed<CSSProperties>(() => {
  const s = props.element.styles
  return {
    flex: 1,
    margin: 0,
    padding: paddingValue(s) ?? (s.padding ?? 14) + 'px',
    fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', Menlo, Consolas, monospace",
    fontSize: (s.fontSize ?? 13) + 'px',
    lineHeight: s.lineHeight ?? 1.55,
    background: 'transparent',
    whiteSpace: 'pre',
    overflow: 'auto',
    outline: 'none',
    tabSize: 2,
    cursor: props.isEditing ? 'text' : 'inherit',
    userSelect: props.isEditing ? 'text' : 'none',
  }
})

const knownLang = computed(() => {
  const l = (props.element.language || 'plaintext').toLowerCase()
  return hljs.getLanguage(l) ? l : 'plaintext'
})

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function highlight(code: string): string {
  const lang = knownLang.value
  if (lang === 'plaintext') return escapeHtml(code)
  try {
    return hljs.highlight(code, { language: lang, ignoreIllegals: true }).value
  } catch {
    return escapeHtml(code)
  }
}

const highlighted = computed(() => highlight(props.element.content || ''))

// ── Caret offset helpers (char index over textContent) ──
function getCaretOffset(root: HTMLElement): number {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return 0
  const range = sel.getRangeAt(0)
  const pre = range.cloneRange()
  pre.selectNodeContents(root)
  pre.setEnd(range.endContainer, range.endOffset)
  return pre.toString().length
}

function setCaretOffset(root: HTMLElement, offset: number): void {
  const sel = window.getSelection()
  if (!sel) return
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let n: Node | null
  let acc = 0
  while ((n = walker.nextNode())) {
    const len = n.nodeValue?.length ?? 0
    if (acc + len >= offset) {
      const range = document.createRange()
      range.setStart(n, Math.max(0, offset - acc))
      range.collapse(true)
      sel.removeAllRanges()
      sel.addRange(range)
      return
    }
    acc += len
  }
  // Caret past end → place at end
  const range = document.createRange()
  range.selectNodeContents(root)
  range.collapse(false)
  sel.removeAllRanges()
  sel.addRange(range)
}

function paintAndRestore(offset: number): void {
  const el = editorRef.value
  if (!el) return
  el.innerHTML = highlight(el.innerText)
  setCaretOffset(el, offset)
}

watch(
  () => props.isEditing,
  async (v) => {
    if (!v) return
    await nextTick()
    const el = editorRef.value
    if (!el) return
    el.innerHTML = highlight(props.element.content || '')
    el.focus()
    // Place caret at end
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

// Re-paint when language changes mid-edit
watch(
  () => props.element.language,
  () => {
    if (!props.isEditing) return
    const el = editorRef.value
    if (!el) return
    const off = getCaretOffset(el)
    paintAndRestore(off)
  },
)

function onInput(): void {
  const el = editorRef.value
  if (!el) return
  const text = el.innerText
  const off = getCaretOffset(el)
  cms.updateElement(props.element.id, { content: text }, { noHistory: true })
  paintAndRestore(off)
}

function onBlur(): void {
  cms.setEditing(null)
}

function onKeyDown(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    ;(e.target as HTMLElement).blur()
    return
  }
  if (e.key === 'Tab') {
    e.preventDefault()
    const el = editorRef.value
    if (!el) return
    document.execCommand('insertText', false, '  ')
  }
  // Newline: contenteditable inserts <br> or <div>, but innerText reads correctly.
}

function onPaste(e: ClipboardEvent): void {
  e.preventDefault()
  const text = e.clipboardData?.getData('text/plain') ?? ''
  document.execCommand('insertText', false, text)
}
</script>

<template>
  <div :style="boxStyle">
    <div class="code-header">
      <span class="code-dot" style="background: #ff5f57"></span>
      <span class="code-dot" style="background: #febc2e"></span>
      <span class="code-dot" style="background: #28c840"></span>
      <span class="code-lang">{{ knownLang }}</span>
      <button
        v-if="element.copyEnabled !== false"
        class="code-copy"
        :class="{ copied }"
        @mousedown.stop
        @click="copyCode"
        :title="copied ? 'Copied' : 'Copy'"
      >
        <Icon :name="copied ? 'check' : 'copy'" :size="13" />
        <span>{{ copied ? 'Copied' : 'Copy' }}</span>
      </button>
    </div>
    <pre
      v-if="isEditing"
      ref="editorRef"
      class="hljs"
      contenteditable="true"
      spellcheck="false"
      :style="codeStyle"
      @input="onInput"
      @blur="onBlur"
      @paste="onPaste"
      @mousedown.stop
      @keydown="onKeyDown"
    ></pre>
    <pre
      v-else
      :style="codeStyle"
    ><code class="hljs" :class="`language-${knownLang}`" v-html="highlighted"></code></pre>
  </div>
</template>

<style scoped>
.code-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.25);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
  user-select: none;
}
.code-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
.code-lang {
  margin-left: 8px;
  font-size: 11px;
  font-family: 'SF Mono', monospace;
  color: rgba(255, 255, 255, 0.55);
  text-transform: lowercase;
  font-weight: 500;
}
.hljs {
  background: transparent !important;
  padding: 0 !important;
}
.code-copy {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 4px;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.55);
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
  transition:
    background 0.12s,
    color 0.12s;
}
.code-copy:hover {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.85);
}
.code-copy.copied {
  color: #28c840;
}
</style>
