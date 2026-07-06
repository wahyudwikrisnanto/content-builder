import { onMounted, onUnmounted, ref } from 'vue'

// Module-singleton so multiple components share same state without rebinding listeners.
const altDown = ref(false)
const shiftDown = ref(false)
let bound = false
let refs = 0

function onKey(e: KeyboardEvent): void {
  altDown.value = e.altKey
  shiftDown.value = e.shiftKey
}
function onBlur(): void {
  altDown.value = false
  shiftDown.value = false
}

function bind(): void {
  if (bound) return
  window.addEventListener('keydown', onKey)
  window.addEventListener('keyup', onKey)
  window.addEventListener('blur', onBlur)
  bound = true
}
function unbind(): void {
  if (!bound) return
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('keyup', onKey)
  window.removeEventListener('blur', onBlur)
  bound = false
}

export function useModifierKeys() {
  onMounted(() => {
    refs++
    bind()
  })
  onUnmounted(() => {
    refs--
    if (refs <= 0) {
      refs = 0
      unbind()
    }
  })
  return { altDown, shiftDown }
}

// Direct read access (no component lifecycle) — for use inside event handlers.
export const modKeys = { altDown, shiftDown }
