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

describe('exportJson', () => {
  it('bumps the schema version to 2', () => {
    const payload = JSON.parse(cms.exportJson())
    expect(payload.version).toBe(2)
  })
})
