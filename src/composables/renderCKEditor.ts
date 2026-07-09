import hljs from 'highlight.js/lib/common'
import type { CmsElement } from '../types'
import type { RenderPayload } from './renderHtml'
import { borderRadiusCss } from './useBorderRadius'

/**
 * Convert design payload to CKEditor-compatible semantic HTML.
 * Strips absolute positioning. Outputs flow-layout block elements ordered by Y.
 * Frames render as <section> wrappers with their children inside.
 */
const escape = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

function inlineTextStyle(el: CmsElement): string {
  const s = el.styles
  const parts: string[] = []
  if (s.color && s.color !== '#222222' && s.color !== '#000000') parts.push(`color:${s.color}`)
  if (s.backgroundColor && s.backgroundColor !== 'transparent')
    parts.push(`background-color:${s.backgroundColor}`)
  if (s.textAlign && s.textAlign !== 'left') parts.push(`text-align:${s.textAlign}`)
  if (s.lineHeight != null && s.lineHeight !== 1.5) parts.push(`line-height:${s.lineHeight}`)
  if (s.letterSpacing) parts.push(`letter-spacing:${s.letterSpacing}px`)
  if (s.fontStyle === 'italic') parts.push('font-style:italic')
  if (s.textDecoration === 'underline') parts.push('text-decoration:underline')
  if (s.textStrokeWidth) {
    parts.push(`-webkit-text-stroke:${s.textStrokeWidth}px ${s.textStrokeColor || '#000'}`)
    parts.push('paint-order:stroke fill')
  }
  return parts.length ? ` style="${parts.join(';')}"` : ''
}

function headingTagFor(fontSize: number | undefined, weight: string | undefined): string {
  const fs = fontSize ?? 16
  const w = parseInt(String(weight ?? '400'), 10)
  if (fs >= 32 || (fs >= 28 && w >= 700)) return 'h1'
  if (fs >= 24) return 'h2'
  if (fs >= 20) return 'h3'
  if (fs >= 17 && w >= 600) return 'h4'
  return 'p'
}

function renderTextLines(content: string): string {
  return content
    .split('\n')
    .map((l) => escape(l) || '<br>')
    .join('<br>')
}

function renderListBody(content: string, type: 'bullet' | 'number'): string {
  const items = content
    .split('\n')
    .map((l) => `<li>${escape(l)}</li>`)
    .join('')
  return type === 'bullet' ? `<ul>${items}</ul>` : `<ol>${items}</ol>`
}

function renderText(el: CmsElement): string {
  const lt = el.styles.listType || 'none'
  const styleAttr = inlineTextStyle(el)
  if (lt !== 'none') {
    const tag = lt === 'bullet' ? 'ul' : 'ol'
    const inner = el.content
      .split('\n')
      .map((l) => `<li>${escape(l)}</li>`)
      .join('')
    return `<${tag}${styleAttr}>${inner}</${tag}>`
  }
  const tag = headingTagFor(el.styles.fontSize, el.styles.fontWeight)
  const fs = el.styles.fontSize
  const fw = el.styles.fontWeight
  const extraStyle: string[] = []
  if (fs) extraStyle.push(`font-size:${fs}px`)
  if (fw && fw !== '400' && tag === 'p') extraStyle.push(`font-weight:${fw}`)
  const combined =
    extraStyle.length || styleAttr
      ? ` style="${[...extraStyle, ...(styleAttr.match(/style="([^"]+)"/)?.[1].split(';') ?? [])].filter(Boolean).join(';')}"`
      : ''
  return `<${tag}${combined}>${renderTextLines(el.content)}</${tag}>`
}

function renderImage(el: CmsElement): string {
  if (!el.content) return ''
  const radius = el.styles.borderRadius ? ` style="border-radius:${borderRadiusCss(el.styles.borderRadius)}"` : ''
  return `<figure class="image"><img src="${escape(el.content)}" alt=""${radius}></figure>`
}

function renderShape(el: CmsElement): string {
  // Shape ≈ styled box around optional text. CKEditor has no native shape — emit a styled div block.
  const s = el.styles
  const inner = el.content
    ? s.listType && s.listType !== 'none'
      ? renderListBody(el.content, s.listType as 'bullet' | 'number')
      : `<p>${renderTextLines(el.content)}</p>`
    : ''
  const styleParts = [
    s.backgroundColor && s.backgroundColor !== 'transparent'
      ? `background-color:${s.backgroundColor}`
      : '',
    s.borderRadius != null ? `border-radius:${borderRadiusCss(s.borderRadius)}` : '',
    s.borderWidth ? `border:${s.borderWidth}px solid ${s.borderColor || '#DDD'}` : '',
    `padding:${s.padding ?? 12}px`,
    s.color ? `color:${s.color}` : '',
    s.textAlign ? `text-align:${s.textAlign}` : '',
  ]
    .filter(Boolean)
    .join(';')
  return `<div style="${styleParts}">${inner}</div>`
}

function renderVideo(el: CmsElement): string {
  if (!el.content) return ''
  let src = el.content
  if (src.includes('youtube.com/watch')) src = src.replace('watch?v=', 'embed/')
  if (src.includes('youtu.be/')) src = src.replace('youtu.be/', 'www.youtube.com/embed/')
  // CKEditor media embed plugin renders as <figure class="media"><oembed url="..."></oembed></figure>
  return `<figure class="media"><oembed url="${escape(src)}"></oembed></figure>`
}

function renderDivider(): string {
  return `<hr>`
}

function renderContainer(el: CmsElement, inner: string): string {
  const s = el.styles
  const styleParts = [
    s.backgroundColor && s.backgroundColor !== 'transparent'
      ? `background-color:${s.backgroundColor}`
      : '',
    s.borderRadius != null ? `border-radius:${borderRadiusCss(s.borderRadius)}` : '',
    s.borderWidth ? `border:${s.borderWidth}px solid ${s.borderColor || '#EBEBEB'}` : '',
    `padding:${s.padding ?? 16}px`,
  ]
    .filter(Boolean)
    .join(';')
  return `<div${styleParts ? ` style="${styleParts}"` : ''}>${inner}</div>`
}

function renderFrame(el: CmsElement, inner: string): string {
  return `<section class="frame" aria-label="${escape(el.name || 'Frame')}">${inner}</section>`
}

function renderButton(el: CmsElement): string {
  const s = el.styles
  const styleParts = [
    'display:inline-block',
    `padding:${s.padding ?? 10}px 16px`,
    `background-color:${s.backgroundColor || '#2563EB'}`,
    `color:${s.color || '#FFF'}`,
    s.borderWidth ? `border:${s.borderWidth}px solid ${s.borderColor}` : 'border:none',
    `border-radius:${borderRadiusCss(s.borderRadius, 8)}`,
    `font-weight:${s.fontWeight || 600}`,
    `font-size:${s.fontSize ?? 14}px`,
    'text-decoration:none',
    'cursor:pointer',
  ]
    .filter(Boolean)
    .join(';')
  const label = escape(el.content || 'Button')
  if (el.href) {
    const target = el.target === '_blank' ? ' target="_blank" rel="noopener noreferrer"' : ''
    return `<p><a href="${escape(el.href)}"${target} style="${styleParts}">${label}</a></p>`
  }
  return `<p><a href="#" style="${styleParts}">${label}</a></p>`
}

function renderCode(el: CmsElement): string {
  const langRaw = (el.language || 'plaintext').toLowerCase()
  const lang = hljs.getLanguage(langRaw) ? langRaw : 'plaintext'
  return `<pre><code class="language-${escape(lang)}">${escape(el.content || '')}</code></pre>`
}

const RENDERERS: Record<string, (el: CmsElement, children?: string) => string> = {
  text: renderText,
  image: renderImage,
  shape: renderShape,
  video: renderVideo,
  divider: renderDivider,
  container: (el, children) => renderContainer(el, children || ''),
  frame: (el, children) => renderFrame(el, children || ''),
  button: renderButton,
  code: renderCode,
}

export function renderCKEditorHtml(payload: RenderPayload): string {
  const els = payload.elements
  const byId = new Map(els.map((e) => [e.id, e]))

  const isVisible = (el: CmsElement): boolean => {
    let cur: CmsElement | undefined = el
    while (cur) {
      if (!cur.visible) return false
      if (!cur.parentId) return true
      cur = byId.get(cur.parentId)
    }
    return true
  }

  const childrenOf = (pid: string | null): CmsElement[] =>
    els
      .filter((e) => (e.parentId ?? null) === pid && isVisible(e))
      .sort((a, b) => a.y - b.y || a.x - b.x)

  const renderNode = (el: CmsElement): string => {
    const fn = RENDERERS[el.type]
    if (!fn) return ''
    if (el.type === 'frame' || el.type === 'container') {
      const inner = childrenOf(el.id).map(renderNode).join('\n')
      return fn(el, inner)
    }
    return fn(el)
  }

  return childrenOf(null).map(renderNode).join('\n')
}
