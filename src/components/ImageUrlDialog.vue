<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps<{ currentUrl?: string }>()
const emit = defineEmits<{
  confirm: [url: string]
  close: []
}>()

const url = ref(props.currentUrl && !props.currentUrl.startsWith('data:') ? props.currentUrl : '')
const inputRef = ref<HTMLInputElement | null>(null)

function submit(): void {
  const val = url.value.trim()
  if (!val) return
  emit('confirm', val)
}

function onKey(e: KeyboardEvent): void {
  if (e.key === 'Escape') emit('close')
  if (e.key === 'Enter') submit()
}

onMounted(() => {
  window.addEventListener('keydown', onKey)
  inputRef.value?.focus()
  inputRef.value?.select()
})
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="iud-backdrop" @mousedown.self="emit('close')">
    <div class="iud-panel">
      <div class="iud-header">
        <span>Set image URL</span>
        <button class="iud-close" @click="emit('close')">✕</button>
      </div>

      <div class="iud-body">
        <label class="iud-label">Image URL</label>
        <input
          ref="inputRef"
          v-model="url"
          class="iud-input"
          type="url"
          placeholder="https://example.com/image.jpg"
          spellcheck="false"
        />
        <p class="iud-hint">Paste any direct image URL (JPG, PNG, GIF, WebP, SVG…)</p>
      </div>

      <div class="iud-footer">
        <button class="iud-btn" @click="emit('close')">Cancel</button>
        <button class="iud-btn iud-btn--primary" :disabled="!url.trim()" @click="submit">
          Apply
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.iud-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99999;
}
.iud-panel {
  width: 420px;
  max-width: 92vw;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.18);
  display: flex;
  flex-direction: column;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
.iud-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid #ebebeb;
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
}
.iud-close {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  color: #888;
  padding: 4px;
  line-height: 1;
  border-radius: 4px;
}
.iud-close:hover {
  background: #f5f5f5;
  color: #1a1a1a;
}
.iud-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.iud-label {
  font-size: 12px;
  font-weight: 600;
  color: #555;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}
.iud-input {
  width: 100%;
  padding: 10px 12px;
  border: 1.5px solid #d1d5db;
  border-radius: 7px;
  font-size: 13px;
  color: #1a1a1a;
  outline: none;
  font-family: inherit;
  transition: border-color 0.12s;
}
.iud-input:focus {
  border-color: #2563eb;
}
.iud-hint {
  font-size: 11px;
  color: #9ca3af;
}
.iud-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid #ebebeb;
}
.iud-btn {
  padding: 7px 14px;
  border-radius: 7px;
  border: 1px solid #d1d5db;
  background: #fff;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  color: #374151;
  transition: background 0.1s;
}
.iud-btn:hover {
  background: #f5f5f5;
}
.iud-btn--primary {
  background: #2563eb;
  color: #fff;
  border-color: #2563eb;
}
.iud-btn--primary:hover {
  background: #1d4ed8;
}
.iud-btn--primary:disabled {
  opacity: 0.4;
  cursor: default;
}
</style>
