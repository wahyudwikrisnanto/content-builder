export type DataAttributes = Record<string, string>

const DATA_ATTRIBUTE_KEY = /^data-[a-z0-9]+(?:-[a-z0-9]+)*$/
const DATA_ATTRIBUTE_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function normalizeDataAttributeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/^data-/, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function isDataAttributeKey(key: string): boolean {
  return DATA_ATTRIBUTE_KEY.test(key) && !key.startsWith('data-cms-') && key !== 'data-code-copy'
}

export function isDataAttributeName(name: string): boolean {
  return DATA_ATTRIBUTE_NAME.test(name) && isDataAttributeKey(`data-${name}`)
}

export function sanitizeDataAttributes(value: unknown): DataAttributes | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined

  const attributes: DataAttributes = {}
  for (const [key, attributeValue] of Object.entries(value)) {
    if (isDataAttributeKey(key) && typeof attributeValue === 'string') {
      attributes[key] = attributeValue
    }
  }
  return Object.keys(attributes).length ? attributes : undefined
}

export function renderDataAttributes(
  value: unknown,
  escape: (value: string) => string,
): string {
  const attributes = sanitizeDataAttributes(value)
  if (!attributes) return ''
  return Object.keys(attributes)
    .sort()
    .map((key) => ` ${key}="${escape(attributes[key])}"`)
    .join('')
}
