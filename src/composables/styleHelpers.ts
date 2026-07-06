import type { ElementStyles } from '../types'

/**
 * Resolve per-side padding into a CSS shorthand string.
 * `padding` acts as the fallback for any side that isn't explicitly set.
 */
export function paddingValue(s: ElementStyles): string | undefined {
  const base = s.padding
  const t = s.paddingTop    ?? base
  const r = s.paddingRight  ?? base
  const b = s.paddingBottom ?? base
  const l = s.paddingLeft   ?? base
  if (t == null && r == null && b == null && l == null) return undefined
  return `${t ?? 0}px ${r ?? 0}px ${b ?? 0}px ${l ?? 0}px`
}
