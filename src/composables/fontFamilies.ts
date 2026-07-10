export interface FontOption {
  label: string
  value: string
  stack: string
}

const SANS = ", -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

export const FONT_FAMILIES: FontOption[] = [
  { label: 'Default', value: 'inherit', stack: 'inherit' },
  { label: 'Plus Jakarta Sans', value: 'Plus Jakarta Sans', stack: `'Plus Jakarta Sans'${SANS}` },
  { label: 'Roboto', value: 'Roboto', stack: `'Roboto'${SANS}` },
  { label: 'Poppins', value: 'Poppins', stack: `'Poppins'${SANS}` },
  { label: 'Inter', value: 'Inter', stack: `'Inter'${SANS}` },
  { label: 'Montserrat', value: 'Montserrat', stack: `'Montserrat'${SANS}` },
  { label: 'Lato', value: 'Lato', stack: `'Lato'${SANS}` },
  { label: 'Open Sans', value: 'Open Sans', stack: `'Open Sans'${SANS}` },
  { label: 'Nunito', value: 'Nunito', stack: `'Nunito'${SANS}` },
]

export function fontStack(value?: string): string {
  if (!value || value === 'inherit') return 'inherit'
  const hit = FONT_FAMILIES.find((f) => f.value === value)
  return hit ? hit.stack : `'${value}'${SANS}`
}
