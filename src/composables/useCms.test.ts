import { describe, it, expect, beforeEach } from 'vitest'
import { useCms } from './useCms'
import { CmsFactories } from './factories'

const cms = useCms()

beforeEach(() => {
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

describe('exportJson', () => {
  it('bumps the schema version to 2', () => {
    const payload = JSON.parse(cms.exportJson())
    expect(payload.version).toBe(2)
  })
})
