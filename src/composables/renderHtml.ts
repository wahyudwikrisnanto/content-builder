import hljs from 'highlight.js/lib/common'
import type { CmsElement, ElementStyles } from '../types'

export interface RenderPayload {
  canvas: { width: number; height: number; flexibleHeight?: boolean }
  elements: CmsElement[]
}

const escape = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
   .replace(/"/g, '&quot;').replace(/'/g, '&#39;')

function px(v: number | undefined, fallback = 0): string {
  return (v ?? fallback) + 'px'
}

// Set by renderHtml before iterating so per-element renderers can look up parents
let _elementsById: Map<string, CmsElement> = new Map()

// Text elements report height:0 until useAutoSize's ResizeObserver measures the mounted
// DOM node (see useAutoSize.ts) — legit for elements never mounted (e.g. hand-authored or
// freshly-created JSON). Treating that 0 literally makes an absolutely-positioned box with
// zero height, and a clip-path:inset() anchored to a zero-size reference box clips away ALL
// overflowing content — not just the excess past a clipContent frame's edge, but everything,
// since clip-path (unlike plain overflow) doesn't defer to the box's visual/painted bounds.
// Estimate the real height the same way importCKEditor.ts does so both the box itself and
// any ancestor clip-path use a size that matches what's actually painted.
function estimatedHeight(el: CmsElement): number {
  if (el.height > 0 || el.type !== 'text') return el.height
  const s = el.styles
  const lines = Math.max(1, (el.content || '').split('\n').length)
  return Math.ceil((s.fontSize ?? 16) * (s.lineHeight ?? 1.5) * lines + (s.padding ?? 0) * 2)
}

function computeClipInset(el: CmsElement): string {
  // Intersect the bounds of every ancestor frame with clipContent enabled
  let minX = -Infinity, minY = -Infinity, maxX = Infinity, maxY = Infinity
  let has = false
  let cur: CmsElement | undefined = _elementsById.get(el.parentId ?? '')
  while (cur) {
    if (cur.type === 'frame' && cur.clipContent) {
      has = true
      if (cur.x > minX) minX = cur.x
      if (cur.y > minY) minY = cur.y
      if (cur.x + cur.width  < maxX) maxX = cur.x + cur.width
      if (cur.y + estimatedHeight(cur) < maxY) maxY = cur.y + estimatedHeight(cur)
    }
    cur = _elementsById.get(cur.parentId ?? '')
  }
  if (!has) return ''
  const h = estimatedHeight(el)
  const top    = Math.max(0, minY - el.y)
  const left   = Math.max(0, minX - el.x)
  const right  = Math.max(0, (el.x + el.width)  - maxX)
  const bottom = Math.max(0, (el.y + h)  - maxY)
  return `clip-path:inset(${top}px ${right}px ${bottom}px ${left}px)`
}

// Debug attrs shown on every rendered outer div — inspect in devtools
function dbg(el: CmsElement): string {
  return `data-cms-type="${el.type}" data-cms-id="${el.id}"${el.name ? ` data-cms-name="${escape(el.name)}"` : ''}`
}

function commonBoxStyle(el: CmsElement): string {
  const s = el.styles
  const opacity = s.opacity != null ? s.opacity : 1
  const clip = computeClipInset(el)
  return [
    `position:absolute`,
    `left:${el.x}px`, `top:${el.y}px`,
    `width:${el.width}px`, `height:${estimatedHeight(el)}px`,
    `opacity:${opacity}`,
    clip,
  ].filter(Boolean).join(';')
}

// Resolve padding: per-side overrides the shorthand
function paddingCss(s: ElementStyles): string {
  const base = s.padding
  const t = s.paddingTop ?? base
  const r = s.paddingRight ?? base
  const b = s.paddingBottom ?? base
  const l = s.paddingLeft ?? base
  if (t == null && r == null && b == null && l == null) return ''
  return `padding:${t ?? 0}px ${r ?? 0}px ${b ?? 0}px ${l ?? 0}px`
}

function textCss(s: ElementStyles, extra: Record<string, string> = {}): string {
  const parts: string[] = []
  if (s.fontSize != null) parts.push(`font-size:${s.fontSize}px`)
  if (s.fontWeight) parts.push(`font-weight:${s.fontWeight}`)
  if (s.fontStyle) parts.push(`font-style:${s.fontStyle}`)
  if (s.textDecoration) parts.push(`text-decoration:${s.textDecoration}`)
  if (s.color) parts.push(`color:${s.color}`)
  if (s.textAlign) parts.push(`text-align:${s.textAlign}`)
  if (s.lineHeight != null) parts.push(`line-height:${s.lineHeight}`)
  if (s.letterSpacing != null) parts.push(`letter-spacing:${s.letterSpacing}px`)
  const pad = paddingCss(s); if (pad) parts.push(pad)
  if (s.textStrokeWidth) {
    parts.push(`-webkit-text-stroke-width:${s.textStrokeWidth}px`)
    parts.push(`-webkit-text-stroke-color:${s.textStrokeColor || '#000'}`)
    parts.push(`paint-order:stroke fill`)
  }
  for (const [k, v] of Object.entries(extra)) parts.push(`${k}:${v}`)
  return parts.join(';')
}

function boxCss(s: ElementStyles): string {
  const parts: string[] = []
  if (s.backgroundColor) parts.push(`background-color:${s.backgroundColor}`)
  if (s.borderRadius != null) parts.push(`border-radius:${s.borderRadius}px`)
  if (s.borderWidth) parts.push(`border:${s.borderWidth}px solid ${s.borderColor || '#DDD'}`)
  return parts.join(';')
}

function renderListBody(content: string, listType: string): string {
  const lines = content.split('\n').map(l => `<li>${escape(l)}</li>`).join('')
  if (listType === 'bullet') return `<ul style="margin:0;padding-left:1.5em">${lines}</ul>`
  if (listType === 'number') return `<ol style="margin:0;padding-left:1.5em">${lines}</ol>`
  return ''
}

function renderText(el: CmsElement): string {
  const s = el.styles
  const listType = s.listType || 'none'
  const inner = listType === 'none'
    ? `<div style="white-space:pre-wrap">${escape(el.content || '')}</div>`
    : renderListBody(el.content || '', listType)
  const style = textCss(s, {
    width: '100%',
    'min-height': '100%',
    'box-sizing': 'border-box',
    'word-wrap': 'break-word',
    'background-color': s.backgroundColor === 'transparent' ? 'transparent' : (s.backgroundColor || 'transparent'),
    'border-radius': px(s.borderRadius),
    'font-family': 'inherit',
  })
  return `<div ${dbg(el)} style="${commonBoxStyle(el)}"><div style="${style}">${inner}</div></div>`
}

function renderImage(el: CmsElement): string {
  const s = el.styles
  const src = el.content?.startsWith('data:') ? '' : el.content
  if (!src) return `<div ${dbg(el)} style="${commonBoxStyle(el)};${boxCss(s)}"></div>`
  return `<div ${dbg(el)} style="${commonBoxStyle(el)}"><img src="${escape(src)}" alt="" style="width:100%;height:100%;display:block;object-fit:${s.objectFit || 'cover'};object-position:${s.objectPosition || 'center'};border-radius:${s.borderRadius || 0}px"/></div>`
}

function renderShape(el: CmsElement): string {
  const s = el.styles
  const listType = s.listType || 'none'
  const justify = s.textAlign === 'right' ? 'flex-end' : s.textAlign === 'center' ? 'center' : 'flex-start'
  const box = `display:flex;align-items:center;justify-content:${justify};overflow:hidden;width:100%;height:100%;${boxCss(s)}`
  const textInner = listType === 'none'
    ? `<div style="${textCss(s, { width: '100%', 'white-space': 'pre-wrap', 'font-family': 'inherit' })}">${escape(el.content || '')}</div>`
    : `<div style="${textCss(s, { width: '100%', 'font-family': 'inherit' })}">${renderListBody(el.content || '', listType)}</div>`
  return `<div ${dbg(el)} style="${commonBoxStyle(el)}"><div style="${box}">${textInner}</div></div>`
}

function renderVideo(el: CmsElement): string {
  const s = el.styles
  if (!el.content) {
    return `<div ${dbg(el)} style="${commonBoxStyle(el)}"><div style="width:100%;height:100%;background:#18181B;border-radius:${s.borderRadius || 0}px"></div></div>`
  }
  let src = el.content
  if (src.includes('youtube.com/watch')) src = src.replace('watch?v=', 'embed/')
  if (src.includes('youtu.be/')) src = src.replace('youtu.be/', 'www.youtube.com/embed/')
  return `<div ${dbg(el)} style="${commonBoxStyle(el)}"><iframe src="${escape(src)}" allowfullscreen style="width:100%;height:100%;border:none;border-radius:${s.borderRadius || 0}px"></iframe></div>`
}

function renderDivider(el: CmsElement): string {
  const s = el.styles
  return `<div ${dbg(el)} style="${commonBoxStyle(el)}"><div style="width:100%;height:100%;background-color:${s.backgroundColor || '#DDD'};border-radius:${s.borderRadius || 0}px;opacity:${s.opacity ?? 1}"></div></div>`
}

function renderContainer(el: CmsElement): string {
  const s = el.styles
  return `<div ${dbg(el)} style="${commonBoxStyle(el)}"><div style="width:100%;height:100%;${boxCss(s)}"></div></div>`
}

function renderFrame(el: CmsElement): string {
  const s = el.styles
  const clip = el.clipContent ? 'overflow:hidden;' : ''
  const bw = s.borderWidth ?? 0
  const border = bw > 0 ? `border:${bw}px solid ${s.borderColor || '#D4D4D4'};` : ''
  return `<div ${dbg(el)} style="${commonBoxStyle(el)}"><div style="${clip}width:100%;height:100%;background-color:${s.backgroundColor || 'transparent'};border-radius:${s.borderRadius || 0}px;${border}"></div></div>`
}

function renderButton(el: CmsElement): string {
  const s = el.styles
  const justify = s.textAlign === 'left' ? 'flex-start' : s.textAlign === 'right' ? 'flex-end' : 'center'
  const baseStyle = [
    'width:100%', 'height:100%',
    'display:flex', 'align-items:center', `justify-content:${justify}`,
    `padding:${s.padding ?? 10}px`,
    `background-color:${s.backgroundColor || '#2563EB'}`,
    `color:${s.color || '#FFF'}`,
    s.borderWidth ? `border:${s.borderWidth}px solid ${s.borderColor || '#1E40AF'}` : 'border:none',
    `border-radius:${s.borderRadius ?? 8}px`,
    `opacity:${s.opacity ?? 1}`,
    `font-size:${s.fontSize ?? 14}px`,
    s.fontWeight ? `font-weight:${s.fontWeight}` : '',
    s.fontStyle ? `font-style:${s.fontStyle}` : '',
    'text-decoration:none', 'white-space:nowrap', 'overflow:hidden',
    'box-sizing:border-box', 'cursor:pointer', 'font-family:inherit',
  ].filter(Boolean).join(';')
  const label = escape(el.content || '')
  if (el.href) {
    const target = el.target === '_blank' ? ' target="_blank" rel="noopener noreferrer"' : ''
    return `<a ${dbg(el)} href="${escape(el.href)}"${target} style="${commonBoxStyle(el)};text-decoration:none"><div style="${baseStyle}">${label}</div></a>`
  }
  return `<div ${dbg(el)} style="${commonBoxStyle(el)}"><div style="${baseStyle}">${label}</div></div>`
}

function renderCode(el: CmsElement): string {
  const s = el.styles
  const langRaw = (el.language || 'plaintext').toLowerCase()
  const lang = hljs.getLanguage(langRaw) ? langRaw : 'plaintext'
  const body = lang === 'plaintext'
    ? escape(el.content || '')
    : (() => {
        try { return hljs.highlight(el.content || '', { language: lang, ignoreIllegals: true }).value }
        catch { return escape(el.content || '') }
      })()
  const boxStyle = [
    'width:100%', 'height:100%',
    `background-color:${s.backgroundColor || '#282C34'}`,
    `border-radius:${s.borderRadius || 0}px`,
    s.borderWidth ? `border:${s.borderWidth}px solid ${s.borderColor || '#3A3A4A'}` : '',
    `opacity:${s.opacity ?? 1}`,
    'overflow:hidden', 'display:flex', 'flex-direction:column',
  ].filter(Boolean).join(';')
  const header = `
    <div style="display:flex;align-items:center;gap:6px;padding:8px 12px;background:rgba(0,0,0,0.25);border-bottom:1px solid rgba(255,255,255,0.06)">
      <span style="width:10px;height:10px;border-radius:50%;background:#FF5F57"></span>
      <span style="width:10px;height:10px;border-radius:50%;background:#FEBC2E"></span>
      <span style="width:10px;height:10px;border-radius:50%;background:#28C840"></span>
      <span style="margin-left:8px;font-size:11px;font-family:'SF Mono',monospace;color:rgba(255,255,255,0.55)">${escape(lang)}</span>
      ${el.copyEnabled !== false ? `<button data-code-copy style="margin-left:auto;display:flex;align-items:center;gap:4px;padding:4px 8px;border-radius:4px;background:transparent;border:none;color:rgba(255,255,255,0.55);font-size:11px;font-family:inherit;cursor:pointer">Copy</button>` : ''}
    </div>`
  const preStyle = [
    'flex:1', 'margin:0',
    `padding:${s.padding ?? 14}px`,
    "font-family:'SF Mono','Fira Code','Cascadia Code',Menlo,Consolas,monospace",
    `font-size:${s.fontSize ?? 13}px`,
    `line-height:${s.lineHeight ?? 1.55}`,
    'background:transparent', 'white-space:pre', 'overflow:auto', 'tab-size:2',
  ].join(';')
  return `<div ${dbg(el)} style="${commonBoxStyle(el)}"><div style="${boxStyle}">${header}<pre style="${preStyle}"><code class="hljs language-${escape(lang)}">${body}</code></pre></div></div>`
}

function renderInput(el: CmsElement): string {
  const s = el.styles
  const t = el.inputType || 'text'
  const labelHtml = el.inputLabel
    ? `<label style="display:block;font-size:${s.fontSize ?? 14}px;font-weight:500;color:${s.color || '#374151'};font-family:inherit;margin-bottom:4px">${escape(el.inputLabel)}${el.required ? '<span style="color:#ef4444"> *</span>' : ''}</label>`
    : ''
  const fieldStyle = [
    'width:100%', 'font-family:inherit',
    `font-size:${s.fontSize ?? 14}px`,
    `color:${s.color || '#222'}`,
    `background-color:${s.backgroundColor || '#fff'}`,
    `border:${s.borderWidth ?? 1}px solid ${s.borderColor || '#D1D5DB'}`,
    `border-radius:${s.borderRadius ?? 6}px`,
    `padding:${s.padding ?? 10}px`,
    `opacity:${s.opacity ?? 1}`,
    'box-sizing:border-box', 'outline:none',
  ].join(';')

  let inner = ''
  if (t === 'textarea') {
    inner = `${labelHtml}<textarea placeholder="${escape(el.placeholder || '')}" style="${fieldStyle};height:calc(100% - ${el.inputLabel ? 26 : 0}px);resize:none"${el.required ? ' required' : ''}></textarea>`
  } else if (t === 'select') {
    const opts = (el.inputOptions || '').split('\n').map(o => o.trim()).filter(Boolean)
      .map(o => `<option value="${escape(o)}">${escape(o)}</option>`).join('')
    const placeholderOpt = el.placeholder ? `<option value="" disabled selected>${escape(el.placeholder)}</option>` : ''
    inner = `${labelHtml}<select style="${fieldStyle};cursor:pointer"${el.required ? ' required' : ''}>${placeholderOpt}${opts}</select>`
  } else if (t === 'checkbox') {
    inner = `<label style="display:flex;align-items:center;gap:8px;font-size:${s.fontSize ?? 14}px;color:${s.color || '#222'};font-family:inherit;cursor:pointer;height:100%"><input type="checkbox"${el.required ? ' required' : ''} style="width:16px;height:16px;cursor:pointer;accent-color:#2563eb"/><span>${escape(el.inputLabel || 'Checkbox')}</span>${el.required ? '<span style="color:#ef4444">*</span>' : ''}</label>`
  } else if (t === 'radio') {
    const opts = (el.inputOptions || '').split('\n').map(o => o.trim()).filter(Boolean)
      .map(o => `<label style="display:flex;align-items:center;gap:8px;cursor:pointer"><input type="radio" name="${escape(el.id)}" value="${escape(o)}" style="width:15px;height:15px;accent-color:#2563eb"/><span>${escape(o)}</span></label>`).join('')
    inner = `<div style="display:flex;flex-direction:column;gap:6px;height:100%;overflow:auto;font-size:${s.fontSize ?? 14}px;color:${s.color || '#222'};font-family:inherit">${opts}</div>`
  } else {
    inner = `${labelHtml}<input type="${escape(t)}" placeholder="${escape(el.placeholder || '')}" style="${fieldStyle}"${el.required ? ' required' : ''}/>`
  }

  return `<div ${dbg(el)} style="${commonBoxStyle(el)};opacity:${s.opacity ?? 1}">${inner}</div>`
}

const RENDERERS: Record<string, (el: CmsElement) => string> = {
  text: renderText,
  image: renderImage,
  shape: renderShape,
  video: renderVideo,
  divider: renderDivider,
  container: renderContainer,
  frame: renderFrame,
  button: renderButton,
  code: renderCode,
  input: renderInput,
}

/**
 * Render JSON payload as final, non-editable HTML.
 * Returns inner canvas HTML (no <html>/<head>).
 */
export function renderHtml(payload: RenderPayload): string {
  const w = payload.canvas.width
  const h = payload.canvas.height
  const flexH = payload.canvas.flexibleHeight
  const minHeight = flexH ? Math.max(h, ...payload.elements.map(e => e.visible ? e.y + e.height : 0)) : h

  _elementsById = new Map(payload.elements.map(e => [e.id, e]))

  const visibility = (el: CmsElement): boolean => {
    let cur: CmsElement | undefined = el
    while (cur) {
      if (!cur.visible) return false
      if (!cur.parentId) return true
      cur = _elementsById.get(cur.parentId)
    }
    return true
  }

  const body = payload.elements
    .filter(visibility)
    .map(el => RENDERERS[el.type]?.(el) ?? '')
    .join('\n')

  return `<div class="content-render" style="position:relative;width:${w}px;height:${minHeight}px;background:white;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">${body}</div>`
}

// ---------------------------------------------------------------------------
// Flow renderer — like CKEditor output but with full visual styles preserved.
// Elements are sorted by Y, stacked as normal block elements (width:100%),
// Y gaps become margin-top. No absolute positioning.
// ---------------------------------------------------------------------------

// Box decoration (fill/border/radius) — kept separate from text styling so callers with a
// distinct box-vs-content split (flowRenderShape) can apply it to the sized outer element
// instead of the content div, which may be an unstretched flex child that hugs its content.
function flowBoxCss(s: ElementStyles): string {
  const parts: string[] = []
  if (s.backgroundColor && s.backgroundColor !== 'transparent') parts.push(`background-color:${s.backgroundColor}`)
  if (s.borderRadius != null) parts.push(`border-radius:${s.borderRadius}px`)
  if (s.borderWidth) parts.push(`border:${s.borderWidth}px solid ${s.borderColor || '#DDD'}`)
  return parts.join(';')
}

function flowTextOnlyCss(s: ElementStyles): string {
  const parts: string[] = []
  if (s.fontSize != null) parts.push(`font-size:${s.fontSize}px`)
  if (s.fontWeight) parts.push(`font-weight:${s.fontWeight}`)
  if (s.fontStyle) parts.push(`font-style:${s.fontStyle}`)
  if (s.textDecoration) parts.push(`text-decoration:${s.textDecoration}`)
  if (s.color) parts.push(`color:${s.color}`)
  if (s.textAlign) parts.push(`text-align:${s.textAlign}`)
  if (s.lineHeight != null) parts.push(`line-height:${s.lineHeight}`)
  if (s.letterSpacing != null) parts.push(`letter-spacing:${s.letterSpacing}px`)
  if (s.padding != null) parts.push(`padding:${s.padding}px`)
  if (s.textStrokeWidth) {
    parts.push(`-webkit-text-stroke-width:${s.textStrokeWidth}px`)
    parts.push(`-webkit-text-stroke-color:${s.textStrokeColor || '#000'}`)
    parts.push(`paint-order:stroke fill`)
  }
  return parts.join(';')
}

function flowTextCss(s: ElementStyles): string {
  return [flowTextOnlyCss(s), flowBoxCss(s)].filter(Boolean).join(';')
}

// Module-level flag: when true, flowWrap skips alignment math (used inside flex parents)
let _autoFlex = 0

// Gap math below (mt = nextEl.y - (prevEl.y + prevEl.height)) assumes el.height reflects
// the element's real rendered height, which would otherwise turn height:0 auto-size text
// (see estimatedHeight above) into an oversized margin-top covering the missing height too.
const flowHeightOf = estimatedHeight

function flowWrap(el: CmsElement, mt: number, canvasW: number): string {
  const base = [
    mt ? `margin-top:${mt}px` : '',
    `width:${el.width}px`,
    `max-width:100%`,
    `box-sizing:border-box`,
  ]

  if (_autoFlex > 0) {
    return base.filter(Boolean).join(';')
  }

  const leftGap = el.x
  const rightGap = canvasW - el.x - el.width
  const tol = Math.max(2, canvasW * 0.005)

  if (Math.abs(leftGap - rightGap) <= tol) {
    base.push(`margin-left:auto`, `margin-right:auto`)
  } else if (rightGap <= leftGap) {
    base.push(`margin-left:auto`, `margin-right:${rightGap}px`, `max-width:calc(100% - ${rightGap}px)`)
  } else {
    base.push(`margin-left:${leftGap}px`, `max-width:calc(100% - ${leftGap}px)`)
  }

  return base.filter(Boolean).join(';')
}

function flowRenderText(el: CmsElement, mt: number, cw: number): string {
  const s = el.styles
  const lt = s.listType || 'none'
  const inner_css = `width:100%;word-wrap:break-word;overflow-wrap:break-word;font-family:inherit;${flowTextCss(s)}`
  const wrap = flowWrap(el, mt, cw)
  if (lt === 'bullet') {
    const items = (el.content || '').split('\n').map(l => `<li>${escape(l)}</li>`).join('')
    return `<div ${dbg(el)} style="${wrap}"><ul style="${inner_css};margin:0;padding-left:1.5em">${items}</ul></div>`
  }
  if (lt === 'number') {
    const items = (el.content || '').split('\n').map(l => `<li>${escape(l)}</li>`).join('')
    return `<div ${dbg(el)} style="${wrap}"><ol style="${inner_css};margin:0;padding-left:1.5em">${items}</ol></div>`
  }
  return `<div ${dbg(el)} style="${wrap}"><div style="${inner_css};white-space:pre-wrap">${escape(el.content || '')}</div></div>`
}

function flowRenderImage(el: CmsElement, mt: number, cw: number): string {
  const s = el.styles
  if (!el.content) return ''
  const ar = el.width && el.height ? `aspect-ratio:${el.width}/${el.height}` : ''
  return `<div ${dbg(el)} style="${flowWrap(el, mt, cw)}"><img src="${escape(el.content)}" alt="" style="width:100%;height:100%;${ar};display:block;object-fit:${s.objectFit || 'cover'};object-position:${s.objectPosition || 'center'};border-radius:${s.borderRadius || 0}px"/></div>`
}

function flowRenderShape(el: CmsElement, mt: number, cw: number): string {
  const s = el.styles
  const lt = s.listType || 'none'
  const justify = s.textAlign === 'right' ? 'flex-end' : s.textAlign === 'center' ? 'center' : 'flex-start'
  const ar = el.width && el.height ? `aspect-ratio:${el.width}/${el.height}` : ''
  const inner_css = `width:100%;word-wrap:break-word;overflow-wrap:break-word;font-family:inherit;${flowTextOnlyCss(s)}`
  const inner = lt === 'bullet'
    ? `<ul style="${inner_css};margin:0;padding-left:1.5em">${(el.content || '').split('\n').map(l => `<li>${escape(l)}</li>`).join('')}</ul>`
    : lt === 'number'
    ? `<ol style="${inner_css};margin:0;padding-left:1.5em">${(el.content || '').split('\n').map(l => `<li>${escape(l)}</li>`).join('')}</ol>`
    : `<div style="${inner_css};white-space:pre-wrap">${escape(el.content || '')}</div>`
  return `<div ${dbg(el)} style="${flowWrap(el, mt, cw)};${ar};display:flex;align-items:center;justify-content:${justify};overflow:hidden;${flowBoxCss(s)}">${inner}</div>`
}

function flowRenderVideo(el: CmsElement, mt: number, cw: number): string {
  if (!el.content) return ''
  const s = el.styles
  let src = el.content
  if (src.includes('youtube.com/watch')) src = src.replace('watch?v=', 'embed/')
  if (src.includes('youtu.be/')) src = src.replace('youtu.be/', 'www.youtube.com/embed/')
  return `<div style="${flowWrap(el, mt, cw)};aspect-ratio:16/9"><iframe src="${escape(src)}" allowfullscreen style="width:100%;height:100%;border:none;border-radius:${s.borderRadius || 0}px"></iframe></div>`
}

function flowRenderDivider(el: CmsElement, mt: number, cw: number): string {
  const s = el.styles
  return `<div style="${flowWrap(el, mt, cw)};height:${el.height}px;background-color:${s.backgroundColor || '#DDD'};border-radius:${s.borderRadius || 0}px"></div>`
}

function flowRenderButton(el: CmsElement, mt: number, cw: number): string {
  const s = el.styles
  const btnStyle = [
    'display:block', 'width:100%',
    `padding:${s.padding ?? 10}px 16px`,
    `background-color:${s.backgroundColor || '#2563EB'}`,
    `color:${s.color || '#FFF'}`,
    s.borderWidth ? `border:${s.borderWidth}px solid ${s.borderColor || '#1E40AF'}` : 'border:none',
    `border-radius:${s.borderRadius ?? 8}px`,
    `font-size:${s.fontSize ?? 14}px`,
    s.fontWeight ? `font-weight:${s.fontWeight}` : '',
    `text-align:${s.textAlign || 'center'}`,
    'text-decoration:none', 'cursor:pointer', 'font-family:inherit', 'box-sizing:border-box',
  ].filter(Boolean).join(';')
  const label = escape(el.content || 'Button')
  const link = el.href
    ? `<a href="${escape(el.href)}"${el.target === '_blank' ? ' target="_blank" rel="noopener noreferrer"' : ''} style="${btnStyle}">${label}</a>`
    : `<span style="${btnStyle}">${label}</span>`
  return `<div ${dbg(el)} style="${flowWrap(el, mt, cw)}">${link}</div>`
}

function flowRenderCode(el: CmsElement, mt: number, cw: number): string {
  const s = el.styles
  const langRaw = (el.language || 'plaintext').toLowerCase()
  const lang = hljs.getLanguage(langRaw) ? langRaw : 'plaintext'
  const body = lang === 'plaintext'
    ? escape(el.content || '')
    : (() => { try { return hljs.highlight(el.content || '', { language: lang, ignoreIllegals: true }).value } catch { return escape(el.content || '') } })()
  const boxStyle = [
    `width:100%`,
    `background-color:${s.backgroundColor || '#282C34'}`,
    `border-radius:${s.borderRadius || 0}px`,
    s.borderWidth ? `border:${s.borderWidth}px solid ${s.borderColor || '#3A3A4A'}` : '',
    'overflow:hidden',
  ].filter(Boolean).join(';')
  const header = `<div style="display:flex;align-items:center;gap:6px;padding:8px 12px;background:rgba(0,0,0,0.25);border-bottom:1px solid rgba(255,255,255,0.06)">
    <span style="width:10px;height:10px;border-radius:50%;background:#FF5F57"></span>
    <span style="width:10px;height:10px;border-radius:50%;background:#FEBC2E"></span>
    <span style="width:10px;height:10px;border-radius:50%;background:#28C840"></span>
    <span style="margin-left:8px;font-size:11px;font-family:'SF Mono',monospace;color:rgba(255,255,255,0.55)">${escape(lang)}</span>
    ${el.copyEnabled !== false ? `<button data-code-copy style="margin-left:auto;display:flex;align-items:center;gap:4px;padding:4px 8px;border-radius:4px;background:transparent;border:none;color:rgba(255,255,255,0.55);font-size:11px;font-family:inherit;cursor:pointer">Copy</button>` : ''}
  </div>`
  const preStyle = `margin:0;padding:${s.padding ?? 14}px;font-family:'SF Mono','Fira Code','Cascadia Code',Menlo,Consolas,monospace;font-size:${s.fontSize ?? 13}px;line-height:${s.lineHeight ?? 1.55};background:transparent;white-space:pre;overflow:auto;tab-size:2`
  return `<div ${dbg(el)} style="${flowWrap(el, mt, cw)}"><div style="${boxStyle}">${header}<pre style="${preStyle}"><code class="hljs language-${escape(lang)}">${body}</code></pre></div></div>`
}

function flowRenderInput(el: CmsElement, mt: number, cw: number): string {
  const s = el.styles
  const t = el.inputType || 'text'
  const labelHtml = el.inputLabel
    ? `<label style="display:block;font-size:${s.fontSize ?? 14}px;font-weight:500;color:${s.color || '#374151'};font-family:inherit;margin-bottom:4px">${escape(el.inputLabel)}${el.required ? '<span style="color:#ef4444"> *</span>' : ''}</label>`
    : ''
  const fieldStyle = [
    'width:100%', 'font-family:inherit',
    `font-size:${s.fontSize ?? 14}px`,
    `color:${s.color || '#222'}`,
    `background-color:${s.backgroundColor || '#fff'}`,
    `border:${s.borderWidth ?? 1}px solid ${s.borderColor || '#D1D5DB'}`,
    `border-radius:${s.borderRadius ?? 6}px`,
    `padding:${s.padding ?? 10}px`,
    'box-sizing:border-box', 'outline:none',
  ].join(';')

  let inner = ''
  if (t === 'textarea') {
    const h = Math.max(60, el.height - (el.inputLabel ? 24 : 0))
    inner = `${labelHtml}<textarea placeholder="${escape(el.placeholder || '')}" style="${fieldStyle};height:${h}px;resize:vertical"${el.required ? ' required' : ''}></textarea>`
  } else if (t === 'select') {
    const opts = (el.inputOptions || '').split('\n').map(o => o.trim()).filter(Boolean)
      .map(o => `<option value="${escape(o)}">${escape(o)}</option>`).join('')
    const placeholderOpt = el.placeholder ? `<option value="" disabled selected>${escape(el.placeholder)}</option>` : ''
    inner = `${labelHtml}<select style="${fieldStyle};cursor:pointer"${el.required ? ' required' : ''}>${placeholderOpt}${opts}</select>`
  } else if (t === 'checkbox') {
    inner = `<label style="display:flex;align-items:center;gap:8px;font-size:${s.fontSize ?? 14}px;color:${s.color || '#222'};font-family:inherit;cursor:pointer"><input type="checkbox"${el.required ? ' required' : ''} style="width:16px;height:16px;cursor:pointer;accent-color:#2563eb"/><span>${escape(el.inputLabel || 'Checkbox')}</span>${el.required ? '<span style="color:#ef4444">*</span>' : ''}</label>`
  } else if (t === 'radio') {
    const opts = (el.inputOptions || '').split('\n').map(o => o.trim()).filter(Boolean)
      .map(o => `<label style="display:flex;align-items:center;gap:8px;cursor:pointer"><input type="radio" name="${escape(el.id)}" value="${escape(o)}" style="width:15px;height:15px;accent-color:#2563eb"/><span>${escape(o)}</span></label>`).join('')
    inner = `<div style="display:flex;flex-direction:column;gap:6px;font-size:${s.fontSize ?? 14}px;color:${s.color || '#222'};font-family:inherit">${opts}</div>`
  } else {
    inner = `${labelHtml}<input type="${escape(t)}" placeholder="${escape(el.placeholder || '')}" style="${fieldStyle}"${el.required ? ' required' : ''}/>`
  }

  return `<div style="${flowWrap(el, mt, cw)};opacity:${s.opacity ?? 1}">${inner}</div>`
}

export function renderFlowHtml(payload: RenderPayload): string {
  const canvasW = payload.canvas.width
  const els = payload.elements
  const byId = new Map(els.map(e => [e.id, e]))

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
    els.filter(e => (e.parentId ?? null) === pid && isVisible(e))
       .sort((a, b) => (a.y - b.y) || (a.x - b.x))

  const renderNode = (el: CmsElement, mt: number, cw: number): string => {
    if (el.type === 'text') return flowRenderText(el, mt, cw)
    if (el.type === 'image') return flowRenderImage(el, mt, cw)
    if (el.type === 'shape') return flowRenderShape(el, mt, cw)
    if (el.type === 'video') return flowRenderVideo(el, mt, cw)
    if (el.type === 'divider') return flowRenderDivider(el, mt, cw)
    if (el.type === 'button') return flowRenderButton(el, mt, cw)
    if (el.type === 'code') return flowRenderCode(el, mt, cw)
    if (el.type === 'input') return flowRenderInput(el, mt, cw)
    if (el.type === 'frame' || el.type === 'container') {
      const s = el.styles
      const clip = el.type === 'frame' && el.clipContent
      const dir = el.type === 'frame' ? (el.layoutDirection ?? 'none') : 'none'
      const autoLayout = dir !== 'none'

      // Padding: read per-side (shorthand fallback), then reduce inner width for children
      const base = s.padding
      const pt = s.paddingTop    ?? base ?? 0
      const pr = s.paddingRight  ?? base ?? 0
      const pb = s.paddingBottom ?? base ?? 0
      const pl = s.paddingLeft   ?? base ?? 0

      const boxParts = [
        flowWrap(el, mt, cw),
        s.backgroundColor && s.backgroundColor !== 'transparent' ? `background-color:${s.backgroundColor}` : '',
        s.borderRadius != null ? `border-radius:${s.borderRadius}px` : '',
        s.borderWidth ? `border:${s.borderWidth}px solid ${s.borderColor || '#D4D4D4'}` : '',
        (pt || pr || pb || pl) ? `padding:${pt}px ${pr}px ${pb}px ${pl}px` : '',
        clip ? `height:${el.height}px;overflow:hidden`
          : el.type === 'frame' && el.manualHeight ? `height:${el.height}px` : '',
      ]

      const children = childrenOf(el.id)
      const innerW = Math.max(0, el.width - pl - pr)

      // Auto-layout: use native flexbox with the frame's gap
      if (autoLayout) {
        const gap = el.layoutGap ?? 8
        const align = el.layoutAlign ?? 'start'
        const flexAlign = align === 'stretch' ? 'stretch'
          : align === 'center' ? 'center'
          : align === 'end' ? 'flex-end'
          : 'flex-start'
        boxParts.push(
          'display:flex',
          `flex-direction:${dir === 'vertical' ? 'column' : 'row'}`,
          `gap:${gap}px`,
          `align-items:${flexAlign}`,
          // Horizontal auto-layout: let columns reflow to fewer-per-row (down to one)
          // as the container narrows in responsive mode, instead of overflowing/squishing.
          dir === 'vertical' ? '' : 'flex-wrap:wrap',
        )
        const parts: string[] = []
        _autoFlex++
        try {
          for (const child of children) {
            const relEl = { ...child, x: 0, y: 0 }
            parts.push(renderNode(relEl as CmsElement, 0, innerW))
          }
        } finally {
          _autoFlex--
        }
        return `<div ${dbg(el)} style="${boxParts.filter(Boolean).join(';')}">${parts.join('\n')}</div>`
      }

      // Free-layout: use flexbox column with per-item gap derived from the child's Y position.
      // Preserves per-child horizontal alignment (via flowWrap) while making vertical spacing
      // predictable and frame-relative — never canvas-relative.
      boxParts.push('display:flex', 'flex-direction:column')
      const parts: string[] = []
      _autoFlex++   // suppress inner flowWrap alignment (parent decides via item's margin)
      try {
        // Sort by Y so document order matches visual stack order
        const sorted = [...children].sort((a, b) => a.y - b.y)
        let prevBottom = -1
        for (const child of sorted) {
          const relY = child.y - el.y - pt        // 0-based within padding zone
          const relX = child.x - el.x - pl
          const relEl = { ...child, x: relX, y: relY }
          const gap = prevBottom < 0 ? 0 : Math.max(0, relY - prevBottom)
          // We're inside flex column, so alignment via margin-left auto:
          const rightGap = innerW - relX - child.width
          const alignCss = (() => {
            const tol = Math.max(2, innerW * 0.005)
            if (Math.abs(relX - rightGap) <= tol) return 'align-self:center'
            if (rightGap < relX) return `align-self:flex-end;margin-right:${Math.max(0, rightGap)}px`
            return `align-self:flex-start;margin-left:${Math.max(0, relX)}px`
          })()
          const inner = renderNode(relEl as CmsElement, 0, innerW)
          parts.push(`<div style="${gap ? `margin-top:${gap}px;` : ''}${alignCss};max-width:100%">${inner}</div>`)
          prevBottom = relY + flowHeightOf(child)
        }
      } finally {
        _autoFlex--
      }
      return `<div ${dbg(el)} style="${boxParts.filter(Boolean).join(';')}">${parts.join('\n')}</div>`
    }
    return ''
  }

  const roots = childrenOf(null)
  const parts: string[] = []
  let prevBottom = -1
  for (const el of roots) {
    // First element: no top margin. Otherwise: gap between elements (canvas Y difference).
    const mt = prevBottom < 0 ? 0 : Math.max(0, el.y - prevBottom)
    parts.push(renderNode(el, mt, canvasW))
    prevBottom = el.y + flowHeightOf(el)
  }

  // `display:flow-root` establishes a BFC — prevents child margins from collapsing into this container
  return `<div class="content-render-flow" style="display:flow-root;position:relative;width:${canvasW}px;max-width:100%;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">${parts.join('\n')}</div>`
}

export function bindCopyButtons(root: HTMLElement): () => void {
  const onClick = (e: Event): void => {
    const btn = (e.target as HTMLElement).closest('[data-code-copy]') as HTMLElement | null
    if (!btn) return
    e.stopPropagation()
    const wrapper = btn.closest('div')?.parentElement
    const pre = wrapper?.querySelector('pre')
    const text = pre ? (pre as HTMLElement).innerText : ''
    const done = (): void => {
      btn.textContent = 'Copied'
      btn.style.color = '#28C840'
      setTimeout(() => { btn.textContent = 'Copy'; btn.style.color = 'rgba(255,255,255,0.55)' }, 1500)
    }
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done).catch(done)
    else {
      const ta = document.createElement('textarea')
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.select()
      try { document.execCommand('copy') } catch {}
      ta.remove(); done()
    }
  }
  root.addEventListener('click', onClick)
  return () => root.removeEventListener('click', onClick)
}
