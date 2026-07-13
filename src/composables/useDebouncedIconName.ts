import { ref, watch, onUnmounted } from 'vue'
import type { Ref } from 'vue'

export function useDebouncedIconName(iconName: Ref<string>, debounceMs = 300) {
  const debounced = ref(iconName.value)
  let timer: ReturnType<typeof setTimeout> | null = null

  watch(iconName, (name) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => { debounced.value = name }, debounceMs)
  })

  onUnmounted(() => { if (timer) clearTimeout(timer) })

  return debounced
}
