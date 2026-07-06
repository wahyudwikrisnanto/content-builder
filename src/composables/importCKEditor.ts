import { cmsUid } from './factories'
import type { CmsElement, ElementStyles, ListType } from '../types'

/**
 * Parse CKEditor 5 HTML into design elements.
 * Flow → absolute layout: each top-level block stacks vertically by Y.
 * Children of <section class="frame"> + container <div> nest via parentId.
 */
export interface ImportResult {
  elements: CmsElement[]
  width: number
  height: number
}

const DEFAULT_WIDTH = 800
const SIDE_PAD = 40
const GAP = 12

function parseStyle(attr: string | null): Record<string, string> {
  const out: Record<string, string> = {}
  if (!attr) return out
  for (const part of attr.split(';')) {
    const [k, ...rest] = part.split(':')
    if (!k || !rest.length) continue
    out[k.trim().toLowerCase()] = rest.join(':').trim()
  }
  return out
}

function parsePx(v: string | undefined): number | undefined {
  if (!v) return undefined
  const m = /^(-?\d+(?:\.\d+)?)/.exec(v.trim())
  return m ? parseFloat(m[1]) : undefined
}

function textOf(node: Element): string {
  return (node.textContent || '').replace(/\u00A0/g, ' ')
}

function linesFromBlock(el: Element): string {
  // Convert <br> to \n, ignore other tags' structure
  const clone = el.cloneNode(true) as Element
  clone.querySelectorAll('br').forEach((br) => br.replaceWith(document.createTextNode('\n')))
  return (clone.textContent || '').replace(/\u00A0/g, ' ')
}

function pickStyles(s: Record<string, string>): ElementStyles {
  const out: ElementStyles = {}
  if (s['color']) out.color = s['color']
  if (s['background-color']) out.backgroundColor = s['background-color']
  if (s['text-align']) out.textAlign = s['text-align'] as ElementStyles['textAlign']
  if (s['line-height']) {
    const n = parseFloat(s['line-height'])
    if (!isNaN(n)) out.lineHeight = n
  }
  if (s['letter-spacing']) out.letterSpacing = parsePx(s['letter-spacing'])
  if (s['font-style'] === 'italic') out.fontStyle = 'italic'
  if (s['text-decoration']?.includes('underline')) out.textDecoration = 'underline'
  if (s['font-size']) out.fontSize = parsePx(s['font-size'])
  if (s['font-weight']) out.fontWeight = s['font-weight']
  if (s['border-radius']) out.borderRadius = parsePx(s['border-radius'])
  if (s['border']) {
    const m = /(\d+)px\s+solid\s+([#\w(),.\s%]+)/.exec(s['border'])
    if (m) {
      out.borderWidth = parseInt(m[1], 10)
      out.borderColor = m[2].trim()
    }
  }
  if (s['padding']) out.padding = parsePx(s['padding'])
  if (s['-webkit-text-stroke']) {
    const m = /(\d+(?:\.\d+)?)px\s+([#\w(),.\s%]+)/.exec(s['-webkit-text-stroke'])
    if (m) {
      out.textStrokeWidth = parseFloat(m[1])
      out.textStrokeColor = m[2].trim()
    }
  }
  return out
}

const HEADING_DEFAULTS: Record<string, { fontSize: number; fontWeight: string }> = {
  h1: { fontSize: 36, fontWeight: '700' },
  h2: { fontSize: 28, fontWeight: '700' },
  h3: { fontSize: 22, fontWeight: '600' },
  h4: { fontSize: 18, fontWeight: '600' },
}

function nodeToElements(
  node: Element,
  parentId: string | null,
  ctx: { x: number; y: number; maxWidth: number; bottom: number },
): CmsElement[] {
  const out: CmsElement[] = []
  const tag = node.tagName.toLowerCase()
  const styleAttr = (node as HTMLElement).getAttribute('style')
  const inline = parseStyle(styleAttr)
  const styles = pickStyles(inline)

  const baseFlags = () => ({ visible: true, locked: false })

  const placeBlock = (h: number): { x: number; y: number; width: number } => {
    const y = ctx.bottom
    const x = ctx.x
    const width = ctx.maxWidth
    ctx.bottom = y + h + GAP
    return { x, y, width }
  }

  // Heading or paragraph → text element
  if (tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4' || tag === 'p') {
    const text = linesFromBlock(node)
    const def = HEADING_DEFAULTS[tag] ?? { fontSize: 16, fontWeight: '400' }
    const fs = styles.fontSize ?? def.fontSize
    const lh = styles.lineHeight ?? 1.5
    const lines = Math.max(1, text.split('\n').length)
    const h = Math.ceil(fs * lh * lines + (styles.padding ?? 10) * 2)
    const pos = placeBlock(h)

    // Check for button inside paragraph
    const link = node.querySelector(':scope > a[style]')
    if (
      link &&
      tag === 'p' &&
      (link as HTMLAnchorElement).style.display?.includes('inline-block')
    ) {
      const lStyles = pickStyles(parseStyle(link.getAttribute('style')))
      const labelText = textOf(link)
      out.push({
        id: cmsUid(),
        type: 'button',
        x: pos.x,
        y: pos.y,
        width: 160,
        height: 44,
        content: labelText,
        href: (link as HTMLAnchorElement).getAttribute('href') || '',
        target:
          (link as HTMLAnchorElement).getAttribute('target') === '_blank' ? '_blank' : '_self',
        styles: {
          fontSize: lStyles.fontSize ?? 14,
          fontWeight: lStyles.fontWeight ?? '600',
          color: lStyles.color ?? '#FFFFFF',
          backgroundColor: lStyles.backgroundColor ?? '#2563EB',
          borderRadius: lStyles.borderRadius ?? 8,
          borderWidth: lStyles.borderWidth ?? 0,
          borderColor: lStyles.borderColor ?? '#1E40AF',
          padding: lStyles.padding ?? 10,
          textAlign: 'center',
          lineHeight: 1.2,
          opacity: 1,
          fontStyle: 'normal',
          textDecoration: 'none',
        },
        parentId,
        ...baseFlags(),
      })
      return out
    }

    out.push({
      id: cmsUid(),
      type: 'text',
      x: pos.x,
      y: pos.y,
      width: pos.width,
      height: h,
      content: text,
      styles: {
        fontSize: fs,
        fontWeight: styles.fontWeight ?? def.fontWeight,
        fontStyle: styles.fontStyle ?? 'normal',
        textDecoration: styles.textDecoration ?? 'none',
        color: styles.color ?? '#222222',
        backgroundColor: styles.backgroundColor ?? 'transparent',
        textAlign: styles.textAlign ?? 'left',
        lineHeight: lh,
        letterSpacing: styles.letterSpacing ?? 0,
        borderRadius: styles.borderRadius ?? 0,
        padding: styles.padding ?? 10,
        borderWidth: styles.borderWidth ?? 0,
        borderColor: styles.borderColor ?? '#DDDDDD',
        opacity: 1,
        textStrokeWidth: styles.textStrokeWidth,
        textStrokeColor: styles.textStrokeColor,
      },
      parentId,
      ...baseFlags(),
    })
    return out
  }

  if (tag === 'ul' || tag === 'ol') {
    const items = Array.from(node.querySelectorAll(':scope > li')).map((li) => linesFromBlock(li))
    const text = items.join('\n')
    const fs = styles.fontSize ?? 16
    const lh = styles.lineHeight ?? 1.5
    const h = Math.ceil(fs * lh * Math.max(1, items.length) + (styles.padding ?? 10) * 2)
    const pos = placeBlock(h)
    out.push({
      id: cmsUid(),
      type: 'text',
      x: pos.x,
      y: pos.y,
      width: pos.width,
      height: h,
      content: text,
      styles: {
        fontSize: fs,
        fontWeight: styles.fontWeight ?? '400',
        fontStyle: styles.fontStyle ?? 'normal',
        textDecoration: styles.textDecoration ?? 'none',
        color: styles.color ?? '#222222',
        backgroundColor: styles.backgroundColor ?? 'transparent',
        textAlign: styles.textAlign ?? 'left',
        lineHeight: lh,
        letterSpacing: 0,
        borderRadius: 0,
        padding: styles.padding ?? 10,
        borderWidth: 0,
        borderColor: '#DDDDDD',
        opacity: 1,
        listType: (tag === 'ul' ? 'bullet' : 'number') as ListType,
      },
      parentId,
      ...baseFlags(),
    })
    return out
  }

  if (tag === 'hr') {
    const pos = placeBlock(2)
    out.push({
      id: cmsUid(),
      type: 'divider',
      x: pos.x,
      y: pos.y,
      width: pos.width,
      height: 2,
      content: '',
      styles: {
        backgroundColor: '#DDDDDD',
        opacity: 1,
        borderRadius: 0,
        borderWidth: 0,
        borderColor: '#DDDDDD',
      },
      parentId,
      ...baseFlags(),
    })
    return out
  }

  if (tag === 'pre') {
    const code = node.querySelector(':scope > code')
    const text = code?.textContent ?? node.textContent ?? ''
    const langMatch = /language-([\w+-]+)/.exec(code?.getAttribute('class') || '')
    const lang = langMatch ? langMatch[1] : 'plaintext'
    const lines = text.split('\n').length
    const h = Math.max(120, Math.ceil(lines * 13 * 1.55 + 50))
    const pos = placeBlock(h)
    out.push({
      id: cmsUid(),
      type: 'code',
      x: pos.x,
      y: pos.y,
      width: pos.width,
      height: h,
      content: text,
      language: lang,
      copyEnabled: true,
      styles: {
        backgroundColor: '#1E1E2E',
        color: '#E4E4E7',
        borderRadius: 8,
        borderWidth: 0,
        borderColor: '#3A3A4A',
        opacity: 1,
        padding: 14,
        fontSize: 13,
        lineHeight: 1.55,
      },
      parentId,
      ...baseFlags(),
    })
    return out
  }

  if (tag === 'figure') {
    const cls = node.getAttribute('class') || ''
    if (cls.includes('image')) {
      const img = node.querySelector('img')
      const src = img?.getAttribute('src') || ''
      const h = 240
      const pos = placeBlock(h)
      out.push({
        id: cmsUid(),
        type: 'image',
        x: pos.x,
        y: pos.y,
        width: pos.width,
        height: h,
        content: src,
        styles: {
          borderRadius: 8,
          borderWidth: 0,
          borderColor: '#DDDDDD',
          opacity: 1,
          objectFit: 'cover',
        },
        parentId,
        ...baseFlags(),
      })
      return out
    }
    if (cls.includes('media')) {
      const oembed = node.querySelector('oembed')
      const url = oembed?.getAttribute('url') || ''
      const h = 240
      const pos = placeBlock(h)
      out.push({
        id: cmsUid(),
        type: 'video',
        x: pos.x,
        y: pos.y,
        width: pos.width,
        height: h,
        content: url,
        styles: { borderRadius: 8, borderWidth: 0, borderColor: '#DDDDDD', opacity: 1 },
        parentId,
        ...baseFlags(),
      })
      return out
    }
  }

  if (tag === 'section' && (node.getAttribute('class') || '').includes('frame')) {
    const name = node.getAttribute('aria-label') || 'Frame'
    const frameId = cmsUid()
    const startY = ctx.bottom
    // Render children first into a sub-context to compute frame size
    const innerCtx = {
      x: ctx.x + 12,
      y: startY + 12,
      maxWidth: ctx.maxWidth - 24,
      bottom: startY + 12,
    }
    const childEls: CmsElement[] = []
    for (const child of Array.from(node.children)) {
      childEls.push(...nodeToElements(child, frameId, innerCtx))
    }
    const frameHeight = Math.max(60, innerCtx.bottom - startY + 12)
    out.push({
      id: frameId,
      type: 'frame',
      x: ctx.x,
      y: startY,
      width: ctx.maxWidth,
      height: frameHeight,
      content: '',
      name,
      styles: {
        backgroundColor: '#FFFFFF',
        borderRadius: 0,
        borderWidth: 1,
        borderColor: '#D4D4D4',
        opacity: 1,
      },
      parentId,
      ...baseFlags(),
    })
    out.push(...childEls)
    ctx.bottom = startY + frameHeight + GAP
    return out
  }

  // Fallback: descend into unknown wrappers
  for (const child of Array.from(node.children)) {
    out.push(...nodeToElements(child, parentId, ctx))
  }
  return out
}

export function parseCKEditorHtml(html: string, width = DEFAULT_WIDTH): ImportResult {
  const doc = new DOMParser().parseFromString(`<div id="__r">${html}</div>`, 'text/html')
  const root = doc.getElementById('__r')!
  const ctx = {
    x: SIDE_PAD,
    y: SIDE_PAD,
    maxWidth: width - SIDE_PAD * 2,
    bottom: SIDE_PAD,
  }
  const elements: CmsElement[] = []
  for (const child of Array.from(root.children)) {
    elements.push(...nodeToElements(child, null, ctx))
  }
  return {
    elements,
    width,
    height: Math.max(600, ctx.bottom + SIDE_PAD),
  }
}
