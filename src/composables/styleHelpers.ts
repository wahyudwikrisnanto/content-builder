import type { ElementStyles } from '../types'

/**
 * Resolve per-side padding into a CSS shorthand string.
 * `padding` acts as the fallback for any side that isn't explicitly set.
 */
export function paddingValue(s: ElementStyles): string | undefined {
  const base = s.padding
  const t = s.paddingTop ?? base
  const r = s.paddingRight ?? base
  const b = s.paddingBottom ?? base
  const l = s.paddingLeft ?? base
  if (t == null && r == null && b == null && l == null) return undefined
  return `${t ?? 0}px ${r ?? 0}px ${b ?? 0}px ${l ?? 0}px`
}

/**
 * Resolve borderRadius (scalar OR per-corner object) into a CSS value string.
 * Per-corner values fall back to 0 when missing. Returns `${n}px` for scalar.
 */
export function radiusValue(r: ElementStyles['borderRadius'], fallback = 0): string {
  if (r == null) return `${fallback}px`
  if (typeof r === 'number') return `${r}px`
  const tl = r.borderTopLeftRadius ?? 0
  const tr = r.borderTopRightRadius ?? 0
  const br = r.borderBottomRightRadius ?? 0
  const bl = r.borderBottomLeftRadius ?? 0
  return `${tl}px ${tr}px ${br}px ${bl}px`
}
