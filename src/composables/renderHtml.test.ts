import { describe, it, expect } from 'vitest'
import { renderHtml, renderFlowHtml } from './renderHtml'
import { renderCKEditorHtml } from './renderCKEditor'
import type { CmsRenderElement } from './renderHtml'

function frame(overrides: Partial<CmsRenderElement> = {}): CmsRenderElement {
  return {
    id: 'frame-1',
    type: 'frame',
    x: 100,
    y: 100,
    width: 400,
    height: 300,
    content: '',
    styles: { borderWidth: 1, borderColor: '#D4D4D4' },
    visible: true,
    locked: false,
    parentId: null,
    ...overrides,
  }
}

function child(overrides: Partial<CmsRenderElement> = {}): CmsRenderElement {
  return {
    id: 'child-1',
    type: 'image',
    x: 16,
    y: 16,
    width: 100,
    height: 80,
    content: 'https://example.com/a.png',
    styles: {},
    visible: true,
    locked: false,
    parentId: 'frame-1',
    ...overrides,
  }
}

describe('renderHtml — nested position calc', () => {
  it('positions a frame child using its stored local x/y directly', () => {
    const html = renderHtml({
      canvas: { width: 800, height: 600 },
      elements: [frame(), child()],
    })
    expect(html).toContain('left:16px')
    expect(html).toContain('top:16px')
    // The frame's own absolute canvas position (100,100) must not leak into the child's style
    expect(html).not.toContain('left:116px')
    expect(html).not.toContain('top:116px')
  })
})

describe('renderFlowHtml — nested position calc', () => {
  it("uses a frame child's local x/y directly for its flow offset", () => {
    const html = renderFlowHtml({
      canvas: { width: 800, height: 600 },
      elements: [frame(), child()],
    })
    expect(html).toContain('margin-left:16px')
  })
})

describe('data attributes', () => {
  it('renders valid attributes on the outer absolute wrapper and escapes values', () => {
    const html = renderHtml({
      canvas: { width: 800, height: 600 },
      elements: [child({ parentId: null, dataAttributes: { 'data-testid': 'a"b&c', 'data-user-id': '42' } })],
    })
    expect(html).toContain('data-testid="a&quot;b&amp;c"')
    expect(html).toContain('data-user-id="42"')
    expect(html).toMatch(/<div data-cms-type="image"[^>]*data-testid=/)
  })

  it('renders attributes in flow output and omits invalid or reserved keys', () => {
    const html = renderFlowHtml({
      canvas: { width: 800, height: 600 },
      elements: [child({ parentId: null, dataAttributes: {
        'data-testid': 'flow',
        'data-Bad': 'no',
        'data-cms-id': 'spoof',
        'data-code-copy': 'spoof',
      } })],
    })
    expect(html).toContain('data-testid="flow"')
    expect(html).not.toContain('data-Bad=')
    expect(html).not.toContain('data-cms-id="spoof"')
    expect(html).not.toContain('data-code-copy="spoof"')
  })

  it('carries attributes onto CKEditor semantic roots', () => {
    const html = renderCKEditorHtml({
      canvas: { width: 800, height: 600 },
      elements: [child({ type: 'text', content: 'Hello', parentId: null, dataAttributes: { 'data-testid': 'cta' } })],
    })
    expect(html).toContain('data-testid="cta"')
  })
})
