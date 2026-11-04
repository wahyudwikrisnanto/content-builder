<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref } from 'vue'

export interface ContextMenuItem {
  id: string
  label: string
  shortcut?: string
  disabled?: boolean
  danger?: boolean
  separator?: boolean
}

const props = defineProps<{
  x: number
  y: number
  items: ContextMenuItem[]
}>()

const emit = defineEmits<{
  close: []
  action: [id: string]
}>()

const menuRef = ref<HTMLElement | null>(null)
const left = ref(props.x)
const top = ref(props.y)

function enabledButtons(): HTMLButtonElement[] {
  return Array.from(menuRef.value?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])
}

function onKey(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    e.preventDefault()
    e.stopPropagation()
    emit('close')
    return
  }
  if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Home' && e.key !== 'End') return
  e.preventDefault()
  e.stopPropagation()
  const buttons = enabledButtons()
  if (!buttons.length) return
  const current = buttons.indexOf(document.activeElement as HTMLButtonElement)
  const next = e.key === 'Home'
    ? 0
    : e.key === 'End'
      ? buttons.length - 1
      : e.key === 'ArrowDown'
        ? (current + 1) % buttons.length
        : (current - 1 + buttons.length) % buttons.length
  buttons[next]?.focus()
}

function closeOutside(e: PointerEvent): void {
  if (!menuRef.value?.contains(e.target as Node)) emit('close')
}

function run(item: ContextMenuItem): void {
  if (!item.disabled) emit('action', item.id)
}

onMounted(async () => {
  window.addEventListener('keydown', onKey)
  document.addEventListener('pointerdown', closeOutside, true)
  window.addEventListener('resize', emitClose)
  window.addEventListener('scroll', emitClose, true)
  await nextTick()
  const menu = menuRef.value
  if (!menu) return
  const rect = menu.getBoundingClientRect()
  left.value = Math.max(8, Math.min(props.x, window.innerWidth - rect.width - 8))
  top.value = Math.max(8, Math.min(props.y, window.innerHeight - rect.height - 8))
  enabledButtons()[0]?.focus()
})

function emitClose(): void {
  emit('close')
}

onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  document.removeEventListener('pointerdown', closeOutside, true)
  window.removeEventListener('resize', emitClose)
  window.removeEventListener('scroll', emitClose, true)
})
</script>

<template>
  <div
    ref="menuRef"
    class="canvas-context-menu"
    role="menu"
    aria-label="Canvas actions"
    :style="{ left: left + 'px', top: top + 'px' }"
    @keydown="onKey"
    @contextmenu.prevent
  >
    <template v-for="item in items" :key="item.id">
      <div v-if="item.separator" class="context-menu-separator"></div>
      <button
        :class="['context-menu-item', { danger: item.danger }]"
        role="menuitem"
        type="button"
        :disabled="item.disabled"
        @click="run(item)"
      >
        <span>{{ item.label }}</span>
        <kbd v-if="item.shortcut">{{ item.shortcut }}</kbd>
      </button>
    </template>
  </div>
</template>
