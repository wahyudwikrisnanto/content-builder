<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import Icon from '../icons/Icon.vue'

type Format = 'json' | 'ckeditor'
const props = defineProps<{ format: Format }>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'submit', payload: { text: string }): void
}>()

const text = ref('')
const fileInputRef = ref<HTMLInputElement | null>(null)

const title = computed(() => props.format === 'json' ? 'Import JSON design' : 'Import CKEditor HTML')
const placeholder = computed(() => props.format === 'json' ? 'Paste JSON here...' : 'Paste HTML markup here...')
const accept = computed(() => props.format === 'json' ? '.json,application/json' : '.html,.htm,text/html')

function pickFile(): void { fileInputRef.value?.click() }
function onFile(e: Event): void {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (!f) return
  const r = new FileReader()
  r.onload = (ev) => { text.value = (ev.target?.result as string) ?? '' }
  r.readAsText(f)
}

function submit(): void {
  if (!text.value.trim()) return
  emit('submit', { text: text.value })
}

function onKey(e: KeyboardEvent): void {
  if (e.key === 'Escape') emit('close')
}

onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="modal-backdrop" @mousedown.self="emit('close')">
    <div class="modal-panel">
      <div class="modal-header">
        <span>{{ title }}</span>
        <button class="icon-btn" @click="emit('close')" title="Close">✕</button>
      </div>
      <div class="modal-body">
        <button class="btn-pick" @click="pickFile">
          <Icon name="upload" :size="14" />
          <span>Choose file...</span>
        </button>
        <input ref="fileInputRef" type="file" :accept="accept" hidden @change="onFile" />
        <div class="modal-divider"><span>or paste below</span></div>
        <textarea v-model="text" :placeholder="placeholder" class="modal-textarea" spellcheck="false"></textarea>
      </div>
      <div class="modal-footer">
        <button class="btn-sm" @click="emit('close')">Cancel</button>
        <button class="btn-sm btn-primary" :disabled="!text.trim()" @click="submit">Import</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed; inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex; align-items: center; justify-content: center;
  z-index: 10000;
}
.modal-panel {
  width: 560px; max-width: 90vw; max-height: 80vh;
  background: var(--bg-panel);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-lg);
  display: flex; flex-direction: column;
}
.modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px; border-bottom: 1px solid var(--border);
  font-size: 14px; font-weight: 600;
}
.modal-header .icon-btn { width: 24px; height: 24px; font-size: 14px; }
.modal-body { padding: 16px; display: flex; flex-direction: column; gap: 12px; flex: 1; min-height: 0; }
.btn-pick {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  padding: 10px; border: 1px dashed var(--border); border-radius: var(--r-sm);
  background: var(--bg-hover); color: var(--text-2); font-size: 13px;
  cursor: pointer; font-family: inherit;
}
.btn-pick:hover { border-color: var(--text-3); color: var(--text-1); }
.modal-divider {
  display: flex; align-items: center; gap: 8px;
  font-size: 11px; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.5px;
}
.modal-divider::before, .modal-divider::after {
  content: ''; flex: 1; height: 1px; background: var(--border);
}
.modal-textarea {
  flex: 1; min-height: 220px;
  padding: 10px; border: 1px solid var(--border); border-radius: var(--r-sm);
  font-family: 'SF Mono', monospace; font-size: 12px; line-height: 1.5;
  color: var(--text-1); background: var(--bg-panel); outline: none; resize: vertical;
}
.modal-textarea:focus { border-color: var(--selection); }
.modal-footer {
  display: flex; justify-content: flex-end; gap: 8px;
  padding: 12px 16px; border-top: 1px solid var(--border);
}
.btn-primary {
  background: var(--accent); color: white; border-color: var(--accent);
}
.btn-primary:hover { background: #000; }
.btn-primary:disabled { opacity: 0.4; cursor: default; }
</style>
