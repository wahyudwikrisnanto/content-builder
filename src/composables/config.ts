import type { CanvasPreset, SidebarSection, SidebarConfig } from '../types'

const ALL_SECTIONS: SidebarSection[] = ['elements', 'layers', 'textStyles']

export function resolveDefaultPreset(presets?: CanvasPreset[]): CanvasPreset | null {
  if (!presets?.length) return null
  return presets.find((p) => p.default) ?? presets[0]
}

export function resolveVisibleSections(sidebar?: SidebarConfig): SidebarSection[] {
  if (!sidebar) return ALL_SECTIONS
  const order = sidebar.sections ?? ALL_SECTIONS
  return order.filter((id) => sidebar.sectionOptions?.[id]?.hidden !== true)
}

export function resolveSectionLabel(id: SidebarSection, sidebar?: SidebarConfig): string {
  const DEFAULT_LABELS: Record<SidebarSection, string> = {
    elements: 'Elements',
    layers: 'Layers',
    textStyles: 'Styles',
  }
  return sidebar?.sectionOptions?.[id]?.label ?? DEFAULT_LABELS[id]
}
