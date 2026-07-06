import type { CSSProperties } from 'vue'
import type { ElementStyles } from '../types'

export function textStrokeStyle(s: ElementStyles): CSSProperties {
  const w = s.textStrokeWidth ?? 0
  if (!w) return {}
  const color = s.textStrokeColor || '#000000'
  return {
    WebkitTextStrokeWidth: `${w}px`,
    WebkitTextStrokeColor: color,
    paintOrder: 'stroke fill',
  } as CSSProperties
}
