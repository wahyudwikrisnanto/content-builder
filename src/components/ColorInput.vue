<script setup lang="ts">
import { ref, watch, computed } from 'vue'

const HEX_RE = /^#[0-9a-fA-F]{6}$/
const props = defineProps<{ modelValue?: string; clearable?: boolean }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>()

const isTransparent = computed(() => props.modelValue === 'transparent' || props.modelValue === '' || props.modelValue == null)

const hex = ref<string>(isTransparent.value ? '#FFFFFF' : (props.modelValue || '#000000'))
watch(() => props.modelValue, v => {
  hex.value = (v === 'transparent' || !v) ? '#FFFFFF' : v
})

const safeColor = computed(() => HEX_RE.test(hex.value) ? hex.value : '#000000')

function onColor(e: Event): void {
  const v = (e.target as HTMLInputElement).value
  hex.value = v
  emit('update:modelValue', v)
}
function onText(e: Event): void {
  const v = (e.target as HTMLInputElement).value
  hex.value = v
  if (HEX_RE.test(v)) emit('update:modelValue', v)
}
function onBlur(): void {
  hex.value = isTransparent.value ? '#FFFFFF' : (props.modelValue || '#000000')
}
function clear(): void { emit('update:modelValue', 'transparent') }
</script>

<template>
  <div class="color-input-wrap">
    <div class="color-swatch"
      :class="{ 'is-transparent': isTransparent }"
      :style="{ backgroundColor: isTransparent ? 'transparent' : safeColor }">
      <input type="color" :value="safeColor" @input="onColor" />
    </div>
    <input class="color-hex-input"
      :value="isTransparent ? 'none' : hex"
      @input="onText" @blur="onBlur" />
    <button v-if="clearable && !isTransparent" type="button" class="ci-clear" title="Remove fill" @click="clear">×</button>
  </div>
</template>

<style scoped>
.color-swatch.is-transparent {
  background-image:
    linear-gradient(45deg, #ccc 25%, transparent 25%),
    linear-gradient(-45deg, #ccc 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #ccc 75%),
    linear-gradient(-45deg, transparent 75%, #ccc 75%);
  background-size: 8px 8px;
  background-position: 0 0, 0 4px, 4px -4px, -4px 0;
}
.ci-clear {
  width: 18px; height: 18px;
  border: none; background: transparent;
  color: var(--text-3); cursor: pointer;
  font-size: 16px; line-height: 1;
  border-radius: 3px;
  display: flex; align-items: center; justify-content: center;
  padding: 0; flex-shrink: 0;
}
.ci-clear:hover { background: var(--bg-hover); color: var(--text-1); }
</style>
