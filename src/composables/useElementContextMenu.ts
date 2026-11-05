import type { CmsElement } from '../types'
import type { ContextMenuItem } from '../components/CanvasContextMenu.vue'
import { useCms } from './useCms'

type Cms = ReturnType<typeof useCms>

/** Context menu items for a single selected element (or multi-selection) — shared by Canvas and Sidebar layers. */
export function buildElementContextItems(cms: Cms, targetId: string): ContextMenuItem[] {
  const target = cms.state.elements.find((el) => el.id === targetId)
  if (!target) return []
  const multi = cms.state.selectedIds.length > 1
  const selected = multi
    ? cms.state.elements.filter((el: CmsElement) => cms.state.selectedIds.includes(el.id))
    : [target]
  const selectedIds = new Set(selected.map((el) => el.id))
  const hasNestedSelection = selected.some((el) => {
    let parentId = el.parentId
    while (parentId) {
      if (selectedIds.has(parentId)) return true
      parentId = cms.state.elements.find((item) => item.id === parentId)?.parentId
    }
    return false
  })
  const hasLocked = selected.some((el) => el.locked)
  const canGroup =
    multi &&
    !hasLocked &&
    !hasNestedSelection &&
    new Set(selected.map((el) => el.parentId ?? null)).size === 1
  const siblings = cms.state.elements.filter(
    (el) => (el.parentId ?? null) === (target.parentId ?? null),
  )
  const siblingIndex = siblings.findIndex((el) => el.id === target.id)
  return [
    { id: 'duplicate', label: 'Duplicate', shortcut: 'Ctrl D', disabled: multi || target.locked },
    ...(target.type === 'frame' && !multi
      ? [{ id: 'ungroup', label: 'Ungroup', disabled: target.locked }]
      : multi
        ? [{ id: 'group', label: 'Group selection', shortcut: 'Ctrl G', disabled: !canGroup }]
        : []),
    {
      id: 'bring-forward',
      label: 'Bring forward',
      separator: true,
      disabled: multi || target.locked || siblingIndex === siblings.length - 1,
    },
    {
      id: 'send-backward',
      label: 'Send backward',
      disabled: multi || target.locked || siblingIndex <= 0,
    },
    {
      id: 'responsive',
      label: target.responsive ? 'Exit full width' : 'Stretch to full width',
      disabled: multi || target.locked,
    },
    { id: 'visible', label: target.visible ? 'Hide' : 'Show', separator: true, disabled: multi },
    { id: 'lock', label: target.locked ? 'Unlock' : 'Lock', disabled: multi },
    {
      id: 'delete',
      label: 'Delete',
      shortcut: 'Delete',
      danger: true,
      separator: true,
      disabled: hasLocked,
    },
  ]
}

/** Runs a context menu action produced by `buildElementContextItems`. Returns true if handled. */
export function runElementContextAction(cms: Cms, action: string, targetId: string): boolean {
  const multi = cms.state.selectedIds.length > 1
  switch (action) {
    case 'duplicate':
      cms.duplicate(targetId)
      return true
    case 'group':
      cms.groupSelection()
      return true
    case 'ungroup':
      cms.ungroupFrame(targetId)
      return true
    case 'bring-forward':
      cms.bringForward(targetId)
      return true
    case 'send-backward':
      cms.sendBackward(targetId)
      return true
    case 'responsive':
      cms.toggleResponsive(targetId)
      return true
    case 'visible':
      cms.toggleVisible(targetId)
      return true
    case 'lock':
      cms.toggleLock(targetId)
      return true
    case 'delete':
      if (multi) cms.deleteSelected()
      else cms.deleteElement(targetId)
      return true
    default:
      return false
  }
}
