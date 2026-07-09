import type { BorderRadiusOptions } from '../types'

export type BorderRadiusValue = BorderRadiusOptions | number | undefined

/**
 * Converts borderRadius (number or per-corner object) to a CSS string.
 * Falls back to `fallback` when value is undefined.
 */
export function borderRadiusCss(value: BorderRadiusValue, fallback = 0): string {
  if (value == null) return `${fallback}px`
  if (typeof value === 'number') return `${value}px`
  const { borderTopLeftRadius = 0, borderTopRightRadius = 0, borderBottomRightRadius = 0, borderBottomLeftRadius = 0 } = value
  return `${borderTopLeftRadius}px ${borderTopRightRadius}px ${borderBottomRightRadius}px ${borderBottomLeftRadius}px`
}

/** For CSSProperties object bindings — returns either a plain string or a corner-expanded object. */
export function borderRadiusStyle(value: BorderRadiusValue, fallback = 0): string {
  return borderRadiusCss(value, fallback)
}
