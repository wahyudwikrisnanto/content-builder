import { onMounted, onUnmounted, watch, nextTick, type Ref } from 'vue'
import { useCms } from './useCms'
import type { CmsElement } from '../types'

/**
 * Auto-grow element height to fit measured content's scrollHeight.
 * `getNode()` returns the DOM node whose scrollHeight reflects natural content.
 * Only grows — never shrinks (user keeps manual downward sizing).
 */
export function useAutoSize(
  element: Ref<CmsElement>,
  getNode: () => HTMLElement | null,
  deps: () => unknown,
) {
  const cms = useCms()
  let ro: ResizeObserver | null = null
  let mo: MutationObserver | null = null
  let observed: HTMLElement | null = null
  const EPS = 1

  function measure(): void {
    const node = getNode()
    const el = element.value
    if (!node || !el) return
    const needH = node.scrollHeight
    if (needH > el.height + EPS) {
      cms.updateElement(el.id, { height: Math.ceil(needH) }, { noHistory: true })
    }
  }

  function schedule(): void { nextTick(measure) }

  function rebind(): void {
    const node = getNode()
    if (node === observed) return
    ro?.disconnect(); mo?.disconnect()
    observed = node
    if (!node) return
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(schedule); ro.observe(node)
    }
    if (typeof MutationObserver !== 'undefined') {
      mo = new MutationObserver(schedule)
      mo.observe(node, { childList: true, characterData: true, subtree: true })
    }
  }

  onMounted(() => { rebind(); schedule() })
  onUnmounted(() => { ro?.disconnect(); mo?.disconnect(); ro = mo = null; observed = null })

  watch(deps, () => { rebind(); schedule() })
}
