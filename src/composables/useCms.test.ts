import { describe, it, expect, beforeEach } from 'vitest'
import { useCms } from './useCms'
import { CmsFactories } from './factories'

const cms = useCms()

beforeEach(() => {
  cms.state.elements.forEach((el) => (el.locked = false))
  cms.deleteAll()
})

describe('move — parent-relative coordinates', () => {
  it('does not shift a frame child when the frame itself moves', () => {
    const frame = CmsFactories.frame(100, 100)
    cms.addElement(frame)
    const child = CmsFactories.text(20, 20)
    child.parentId = frame.id
    cms.addElement(child)

    cms.move(frame.id, 300, 300)

    const movedFrame = cms.state.elements.find((e) => e.id === frame.id)!
    const movedChild = cms.state.elements.find((e) => e.id === child.id)!
    expect(movedFrame.x).toBe(300)
    expect(movedFrame.y).toBe(300)
    expect(movedChild.x).toBe(20)
    expect(movedChild.y).toBe(20)
  })
})

describe('parentInnerBox — frame-local padding box', () => {
  it('returns a box relative to the frame itself, not canvas-absolute', () => {
    const frame = CmsFactories.frame(100, 100)
    frame.styles.padding = 16
    cms.addElement(frame)
    const child = CmsFactories.text(20, 20)
    child.parentId = frame.id
    cms.addElement(child)

    const childEl = cms.state.elements.find((e) => e.id === child.id)!
    expect(cms.parentInnerBox(childEl)).toEqual({ x: 16, y: 16, width: 368, height: 268 })
  })
})

describe('absolutePosition', () => {
  it('resolves a nested child to true canvas coordinates', () => {
    const frame = CmsFactories.frame(100, 100)
    cms.addElement(frame)
    const child = CmsFactories.text(20, 20)
    child.parentId = frame.id
    cms.addElement(child)

    const childEl = cms.state.elements.find((e) => e.id === child.id)!
    expect(cms.absolutePosition(childEl)).toEqual({ x: 120, y: 120 })
  })

  it('returns the element itself for a root element', () => {
    const el = CmsFactories.text(50, 60)
    cms.addElement(el)
    expect(cms.absolutePosition(el)).toEqual({ x: 50, y: 60 })
  })
})

describe('moveMany — does not double-shift a dragged frame\'s descendants', () => {
  it('leaves a frame child untouched when the frame is moved via moveMany', () => {
    const frame = CmsFactories.frame(100, 100)
    cms.addElement(frame)
    const child = CmsFactories.text(20, 20)
    child.parentId = frame.id
    cms.addElement(child)

    // Real drag flow (CanvasElement.vue's beginDragFor) captures originals for every
    // element, not just the dragged one — seed it the same way, or the buggy code's
    // `if (!orig) continue`/`return el` guards mask the bug this test exists to catch.
    const originals = new Map(cms.state.elements.map((el) => [el.id, { x: el.x, y: el.y }]))
    cms.moveMany([frame.id], originals, 50, 50)

    const movedFrame = cms.state.elements.find((e) => e.id === frame.id)!
    const movedChild = cms.state.elements.find((e) => e.id === child.id)!
    expect(movedFrame.x).toBe(150)
    expect(movedFrame.y).toBe(150)
    expect(movedChild.x).toBe(20)
    expect(movedChild.y).toBe(20)
  })
})

describe('reflowFrame — local coordinates', () => {
  it('places children relative to the frame itself, honoring padding', () => {
    const frame = CmsFactories.frame(500, 500)
    frame.layoutDirection = 'vertical'
    frame.layoutGap = 8
    frame.styles.padding = 10
    cms.addElement(frame)
    const child = CmsFactories.text(0, 0)
    child.parentId = frame.id
    child.height = 40
    cms.addElement(child)

    cms.reflowFrame(frame.id)

    const placed = cms.state.elements.find((e) => e.id === child.id)!
    expect(placed.x).toBe(10)
    expect(placed.y).toBe(10)
  })
})

describe('moveLayer', () => {
  it('preserves absolute position when moving a root into a frame', () => {
    const frame = CmsFactories.frame(100, 80)
    const el = CmsFactories.text(240, 180)
    cms.addElement(frame)
    cms.addElement(el)

    cms.moveLayer(el.id, frame.id, 'inside')

    const moved = cms.state.elements.find((item) => item.id === el.id)!
    expect(moved.parentId).toBe(frame.id)
    expect(moved.x).toBe(140)
    expect(moved.y).toBe(100)
    expect(cms.absolutePosition(moved)).toEqual({ x: 240, y: 180 })
  })

  it('preserves absolute position when moving a frame child to root', () => {
    const frame = CmsFactories.frame(100, 80)
    const child = CmsFactories.text(30, 40)
    child.parentId = frame.id
    const sibling = CmsFactories.text(400, 300)
    cms.addElement(frame)
    cms.addElement(child)
    cms.addElement(sibling)

    cms.moveLayer(child.id, sibling.id, 'before')

    const moved = cms.state.elements.find((item) => item.id === child.id)!
    expect(moved.parentId).toBeNull()
    expect(moved.x).toBe(130)
    expect(moved.y).toBe(120)
  })

  it('preserves descendant-local coordinates when moving a nested frame', () => {
    const source = CmsFactories.frame(100, 100)
    const nested = CmsFactories.frame(20, 30)
    nested.parentId = source.id
    const child = CmsFactories.text(5, 6)
    child.parentId = nested.id
    const destination = CmsFactories.frame(500, 200)
    cms.addElement(source)
    cms.addElement(nested)
    cms.addElement(child)
    cms.addElement(destination)

    cms.moveLayer(nested.id, destination.id, 'inside')

    const moved = cms.state.elements.find((item) => item.id === nested.id)!
    const movedChild = cms.state.elements.find((item) => item.id === child.id)!
    expect(cms.absolutePosition(moved)).toEqual({ x: 120, y: 130 })
    expect(movedChild.parentId).toBe(nested.id)
    expect({ x: movedChild.x, y: movedChild.y }).toEqual({ x: 5, y: 6 })
  })

  it('rejects moves into a descendant', () => {
    const frame = CmsFactories.frame(100, 100)
    const child = CmsFactories.frame(20, 20)
    child.parentId = frame.id
    cms.addElement(frame)
    cms.addElement(child)
    const before = cms.state.elements.map((el) => ({ ...el }))

    cms.moveLayer(frame.id, child.id, 'inside')

    expect(cms.state.elements).toEqual(before)
  })
})

describe('autoReparent — rebases coordinates when entering a frame', () => {
  it('converts a root element\'s absolute position to frame-local on reparent', () => {
    const frame = CmsFactories.frame(100, 100) // absolute box: x 100..500, y 100..400
    cms.addElement(frame)
    const el = CmsFactories.text(150, 150) // root, so x/y are already canvas-absolute
    cms.addElement(el)

    cms.autoReparent(el.id)

    const updated = cms.state.elements.find((e) => e.id === el.id)!
    expect(updated.parentId).toBe(frame.id)
    expect(updated.x).toBe(50) // 150 - 100
    expect(updated.y).toBe(50)
  })
})

describe('moveMany — excludes a selected descendant of another selected element', () => {
  it('does not double-shift a child that is directly co-selected with its parent frame', () => {
    const frame = CmsFactories.frame(100, 100)
    cms.addElement(frame)
    const child = CmsFactories.text(20, 20)
    child.parentId = frame.id
    cms.addElement(child)

    const originals = new Map(cms.state.elements.map((el) => [el.id, { x: el.x, y: el.y }]))
    cms.moveMany([frame.id, child.id], originals, 50, 50)

    const movedFrame = cms.state.elements.find((e) => e.id === frame.id)!
    const movedChild = cms.state.elements.find((e) => e.id === child.id)!
    expect(movedFrame.x).toBe(150)
    expect(movedFrame.y).toBe(150)
    expect(movedChild.x).toBe(20) // carried along by the frame, not shifted again
    expect(movedChild.y).toBe(20)
  })

  it('excludes a grandchild when grandparent is selected, even with unselected parent in between', () => {
    // Create a 3-level nesting: outerFrame → innerFrame (unselected) → grandchild
    const outerFrame = CmsFactories.frame(100, 100)
    cms.addElement(outerFrame)

    const innerFrame = CmsFactories.frame(20, 20)
    innerFrame.parentId = outerFrame.id
    cms.addElement(innerFrame)

    const grandchild = CmsFactories.text(5, 5)
    grandchild.parentId = innerFrame.id
    cms.addElement(grandchild)

    // Seed originals from all elements (real drag flow does this)
    const originals = new Map(cms.state.elements.map((el) => [el.id, { x: el.x, y: el.y }]))

    // Move with outerFrame and grandchild selected (innerFrame is NOT selected)
    cms.moveMany([outerFrame.id, grandchild.id], originals, 50, 50)

    const movedOuter = cms.state.elements.find((e) => e.id === outerFrame.id)!
    const movedGrandchild = cms.state.elements.find((e) => e.id === grandchild.id)!

    expect(movedOuter.x).toBe(150) // 100 + 50
    expect(movedOuter.y).toBe(150) // 100 + 50
    expect(movedGrandchild.x).toBe(5) // stayed at original position: carried by outerFrame through innerFrame
    expect(movedGrandchild.y).toBe(5)
  })
})

describe('selection and context actions', () => {
  it('clears stale multi-selection when selecting all', () => {
    const first = CmsFactories.text(0, 0)
    const second = CmsFactories.text(100, 0)
    cms.addElement(first)
    cms.addElement(second)
    cms.setSelectedIds([first.id, second.id])

    cms.selectAll()

    expect(cms.state.allSelected).toBe(true)
    expect(cms.state.selectedIds).toEqual([])
  })

  it('keeps locked elements safe from destructive actions', () => {
    const locked = CmsFactories.text(0, 0)
    locked.locked = true
    cms.addElement(locked)
    cms.select(locked.id)

    cms.duplicate(locked.id)
    cms.deleteElement(locked.id)

    expect(cms.state.elements.map((el) => el.id)).toEqual([locked.id])
    expect(cms.state.selectedId).toBe(locked.id)
  })

  it('groups without changing absolute positions', () => {
    const first = CmsFactories.text(100, 120)
    const second = CmsFactories.text(300, 220)
    cms.addElement(first)
    cms.addElement(second)
    cms.setSelectedIds([first.id, second.id])

    cms.groupSelection()

    const frame = cms.state.elements.find((el) => el.id === cms.state.selectedId)!
    const groupedFirst = cms.state.elements.find((el) => el.id === first.id)!
    const groupedSecond = cms.state.elements.find((el) => el.id === second.id)!
    expect(frame.type).toBe('frame')
    expect(cms.absolutePosition(groupedFirst)).toEqual({ x: 100, y: 120 })
    expect(cms.absolutePosition(groupedSecond)).toEqual({ x: 300, y: 220 })
  })

  it('ungroups into the original parent without changing absolute positions', () => {
    const parent = CmsFactories.frame(50, 60)
    const group = CmsFactories.frame(100, 120)
    group.parentId = parent.id
    const child = CmsFactories.text(20, 30)
    child.parentId = group.id
    cms.addElement(parent)
    cms.addElement(group)
    cms.addElement(child)
    const before = cms.absolutePosition(child)

    cms.ungroupFrame(group.id)

    const ungrouped = cms.state.elements.find((el) => el.id === child.id)!
    expect(ungrouped.parentId).toBe(parent.id)
    expect(cms.absolutePosition(ungrouped)).toEqual(before)
  })

  it('reorders a frame and descendants as one block', () => {
    const first = CmsFactories.frame(0, 0)
    const child = CmsFactories.text(10, 10)
    child.parentId = first.id
    const second = CmsFactories.text(500, 0)
    cms.addElement(first)
    cms.addElement(child)
    cms.addElement(second)

    cms.bringForward(first.id)

    expect(cms.state.elements.map((el) => el.id)).toEqual([second.id, first.id, child.id])
    cms.sendBackward(first.id)
    expect(cms.state.elements.map((el) => el.id)).toEqual([first.id, child.id, second.id])
  })
})

describe('exportJson', () => {
  it('bumps the schema version to 2', () => {
    const payload = JSON.parse(cms.exportJson())
    expect(payload.version).toBe(2)
  })
})

describe('data attributes — JSON round-trip', () => {
  it('exports and re-imports valid attributes', () => {
    const el = CmsFactories.text(0, 0)
    cms.addElement(el)
    cms.updateElement(el.id, { dataAttributes: { 'data-testid': 'hero' } })

    cms.importJson(cms.exportJson())

    const imported = cms.state.elements.find((e) => e.type === 'text')!
    expect(imported.dataAttributes).toEqual({ 'data-testid': 'hero' })
  })

  it('filters invalid, reserved, and non-string entries on import', () => {
    const el = CmsFactories.text(0, 0)
    cms.addElement(el)
    cms.updateElement(el.id, { dataAttributes: { 'data-testid': 'ok' } })

    const payload = JSON.parse(cms.exportJson())
    payload.elements[0].dataAttributes = {
      'data-testid': 'ok',
      'data-Bad Key': 'no',
      'data-cms-id': 'spoof',
      'data-code-copy': 'spoof',
      'data-count': 42,
    }
    cms.importJson(JSON.stringify(payload))

    const imported = cms.state.elements.find((e) => e.type === 'text')!
    expect(imported.dataAttributes).toEqual({ 'data-testid': 'ok' })
  })

  it('drops the field entirely when no entry survives import', () => {
    const el = CmsFactories.text(0, 0)
    el.dataAttributes = { 'data-Bad Key': 'no' }
    cms.addElement(el)

    cms.importJson(cms.exportJson())

    const imported = cms.state.elements.find((e) => e.type === 'text')!
    expect(imported.dataAttributes).toBeUndefined()
  })
})
