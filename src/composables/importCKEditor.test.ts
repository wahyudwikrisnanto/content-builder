import { describe, it, expect } from 'vitest'
import { parseCKEditorHtml } from './importCKEditor'

describe('parseCKEditorHtml — frame children use frame-local coordinates', () => {
  it('places a paragraph inside a frame relative to the frame itself, not the page', () => {
    const html = `
      <section class="frame" aria-label="Frame">
        <p>Hello</p>
      </section>
    `
    const result = parseCKEditorHtml(html, 800)
    const frame = result.elements.find((e) => e.type === 'frame')!
    const text = result.elements.find((e) => e.type === 'text')!

    expect(text.parentId).toBe(frame.id)
    expect(text.x).toBe(12)
    expect(text.y).toBe(12)
  })
})
