<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'

const props = defineProps<{ modelValue: string; options: string[]; placeholder?: string }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>()

const open = ref(false)
const query = ref('')
const rootRef = ref<HTMLDivElement | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)
const activeIdx = ref(0)

const sorted = computed(() => [...props.options].sort((a, b) => a.localeCompare(b)))
const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return sorted.value
  return sorted.value.filter(o => o.toLowerCase().includes(q))
})

watch(filtered, () => { activeIdx.value = 0 })

function pick(v: string): void {
  emit('update:modelValue', v)
  open.value = false
  query.value = ''
}

async function toggleOpen(): Promise<void> {
  open.value = !open.value
  if (open.value) {
    await nextTick()
    inputRef.value?.focus()
  }
}

function onDocClick(e: MouseEvent): void {
  if (!open.value) return
  if (rootRef.value && !rootRef.value.contains(e.target as Node)) {
    open.value = false; query.value = ''
  }
}

function onKey(e: KeyboardEvent): void {
  if (e.key === 'ArrowDown') { e.preventDefault(); activeIdx.value = Math.min(filtered.value.length - 1, activeIdx.value + 1) }
  else if (e.key === 'ArrowUp') { e.preventDefault(); activeIdx.value = Math.max(0, activeIdx.value - 1) }
  else if (e.key === 'Enter') { e.preventDefault(); const v = filtered.value[activeIdx.value]; if (v) pick(v) }
  else if (e.key === 'Escape') { open.value = false; query.value = '' }
}

onMounted(() => document.addEventListener('mousedown', onDocClick))
onUnmounted(() => document.removeEventListener('mousedown', onDocClick))
</script>

<template>
  <div class="ss" ref="rootRef">
    <button type="button" class="ss-trigger" @click="toggleOpen">
      <span class="ss-value">{{ modelValue || placeholder || 'Select...' }}</span>
      <span class="ss-chev">▾</span>
    </button>
    <div v-if="open" class="ss-pop">
      <input ref="inputRef" class="ss-input" type="text" :placeholder="placeholder || 'Search...'"
        v-model="query" @keydown="onKey" />
      <div class="ss-list">
        <div v-for="(opt, i) in filtered" :key="opt"
          :class="['ss-opt', { active: i === activeIdx, selected: opt === modelValue }]"
          @mouseenter="activeIdx = i"
          @mousedown.prevent="pick(opt)">
          {{ opt }}
        </div>
        <div v-if="!filtered.length" class="ss-empty">No matches</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ss { position: relative; flex: 1; min-width: 0; }
.ss-trigger {
  display: flex; align-items: center; justify-content: space-between;
  width: 100%; height: 30px; padding: 0 6px;
  border: 1px solid var(--border); border-radius: var(--r-sm);
  background: var(--bg-panel); font-size: 12px; font-family: inherit;
  color: var(--text-1); cursor: pointer; outline: none;
}
.ss-trigger:hover { border-color: var(--text-3); }
.ss-value { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: left; flex: 1; }
.ss-chev { color: var(--text-3); font-size: 10px; margin-left: 6px; }
.ss-pop {
  position: absolute; top: calc(100% + 4px); left: 0; right: 0;
  background: var(--bg-panel); border: 1px solid var(--border);
  border-radius: var(--r-sm); box-shadow: var(--shadow-lg);
  z-index: 1000; padding: 4px;
}
.ss-input {
  width: 100%; height: 28px; padding: 0 6px;
  border: 1px solid var(--border); border-radius: 4px;
  font-size: 12px; font-family: inherit; outline: none;
  margin-bottom: 4px;
}
.ss-input:focus { border-color: var(--selection); }
.ss-list { max-height: 200px; overflow-y: auto; }
.ss-opt {
  padding: 6px 8px; border-radius: 4px; font-size: 12px;
  color: var(--text-1); cursor: pointer;
}
.ss-opt.active { background: var(--bg-hover); }
.ss-opt.selected { color: var(--selection); font-weight: 500; }
.ss-empty { padding: 8px; font-size: 11.5px; color: var(--text-3); text-align: center; }
</style>
