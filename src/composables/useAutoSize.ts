import { onMounted, onUnmounted, watch, type Ref } from 'vue'
import type { CmsElement } from '../types'

/**
 * Auto-size element height to fit measured content's scrollHeight.
 * `getNode()` returns the DOM node whose scrollHeight reflects natural content.
 * Grows AND shrinks so the container always hugs the content.
 */
export function useAutoSize(
  element: Ref<CmsElement>,
  getNode: () => HTMLElement | null,
  deps: () => unknown,
) {
  let ro: ResizeObserver | null = null
  let mo: MutationObserver | null = null
  let observed: HTMLElement | null = null

  function schedule() {
    // nextTick(() => {
    //   requestAnimationFrame(measure)
    // })
  }

  function rebind(): void {
    const node = getNode()
    if (node === observed) return
    ro?.disconnect()
    mo?.disconnect()
    observed = node
    if (!node) return
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(schedule)
      ro.observe(node)
    }
    if (typeof MutationObserver !== 'undefined') {
      mo = new MutationObserver(schedule)
      mo.observe(node, { childList: true, characterData: true, subtree: true })
    }
  }

  onMounted(() => {
    rebind()
    schedule()
  })
  onUnmounted(() => {
    ro?.disconnect()
    mo?.disconnect()
    ro = mo = null
    observed = null
  })

  watch(deps, () => {
    rebind()
    schedule()
  })
}
