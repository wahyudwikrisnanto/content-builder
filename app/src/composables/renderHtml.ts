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

function commonBoxStyle(el: CmsElement): string {
  const s = el.styles
  const opacity = s.opacity != null ? s.opacity : 1
  return [
    `position:absolute`,
    `left:${el.x}px`, `top:${el.y}px`,
    `width:${el.width}px`, `height:${el.height}px`,
    `opacity:${opacity}`,
  ].join(';')
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
  if (s.padding != null) parts.push(`padding:${s.padding}px`)
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
    width: '100%', height: '100%',
    'word-wrap': 'break-word', overflow: 'hidden',
    'background-color': s.backgroundColor === 'transparent' ? 'transparent' : (s.backgroundColor || 'transparent'),
    'border-radius': px(s.borderRadius),
    'font-family': 'inherit',
  })
  return `<div style="${commonBoxStyle(el)}"><div style="${style}">${inner}</div></div>`
}

function renderImage(el: CmsElement): string {
  const s = el.styles
  if (!el.content) return `<div style="${commonBoxStyle(el)};${boxCss(s)}"></div>`
  return `<div style="${commonBoxStyle(el)}"><img src="${escape(el.content)}" alt="" style="width:100%;height:100%;display:block;object-fit:${s.objectFit || 'cover'};border-radius:${s.borderRadius || 0}px"/></div>`
}

function renderShape(el: CmsElement): string {
  const s = el.styles
  const listType = s.listType || 'none'
  const justify = s.textAlign === 'right' ? 'flex-end' : s.textAlign === 'center' ? 'center' : 'flex-start'
  const box = `display:flex;align-items:center;justify-content:${justify};overflow:hidden;width:100%;height:100%;${boxCss(s)}`
  const textInner = listType === 'none'
    ? `<div style="${textCss(s, { width: '100%', 'white-space': 'pre-wrap', 'font-family': 'inherit' })}">${escape(el.content || '')}</div>`
    : `<div style="${textCss(s, { width: '100%', 'font-family': 'inherit' })}">${renderListBody(el.content || '', listType)}</div>`
  return `<div style="${commonBoxStyle(el)}"><div style="${box}">${textInner}</div></div>`
}

function renderVideo(el: CmsElement): string {
  const s = el.styles
  if (!el.content) {
    return `<div style="${commonBoxStyle(el)}"><div style="width:100%;height:100%;background:#18181B;border-radius:${s.borderRadius || 0}px"></div></div>`
  }
  let src = el.content
  if (src.includes('youtube.com/watch')) src = src.replace('watch?v=', 'embed/')
  if (src.includes('youtu.be/')) src = src.replace('youtu.be/', 'www.youtube.com/embed/')
  return `<div style="${commonBoxStyle(el)}"><iframe src="${escape(src)}" allowfullscreen style="width:100%;height:100%;border:none;border-radius:${s.borderRadius || 0}px"></iframe></div>`
}

function renderDivider(el: CmsElement): string {
  const s = el.styles
  return `<div style="${commonBoxStyle(el)}"><div style="width:100%;height:100%;background-color:${s.backgroundColor || '#DDD'};border-radius:${s.borderRadius || 0}px;opacity:${s.opacity ?? 1}"></div></div>`
}

function renderContainer(el: CmsElement): string {
  const s = el.styles
  return `<div style="${commonBoxStyle(el)}"><div style="width:100%;height:100%;${boxCss(s)}"></div></div>`
}

function renderFrame(el: CmsElement): string {
  const s = el.styles
  return `<div style="${commonBoxStyle(el)}"><div style="width:100%;height:100%;background-color:${s.backgroundColor || '#FFF'};border-radius:${s.borderRadius || 0}px;border:${s.borderWidth || 1}px solid ${s.borderColor || '#D4D4D4'}"></div></div>`
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
    return `<a href="${escape(el.href)}"${target} style="${commonBoxStyle(el)};text-decoration:none"><div style="${baseStyle}">${label}</div></a>`
  }
  return `<div style="${commonBoxStyle(el)}"><div style="${baseStyle}">${label}</div></div>`
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
  return `<div style="${commonBoxStyle(el)}"><div style="${boxStyle}">${header}<pre style="${preStyle}"><code class="hljs language-${escape(lang)}">${body}</code></pre></div></div>`
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

  const visibility = (el: CmsElement): boolean => {
    let cur: CmsElement | undefined = el
    const byId = new Map(payload.elements.map(e => [e.id, e]))
    while (cur) {
      if (!cur.visible) return false
      if (!cur.parentId) return true
      cur = byId.get(cur.parentId)
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

function flowTextCss(s: ElementStyles): string {
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
  if (s.backgroundColor && s.backgroundColor !== 'transparent') parts.push(`background-color:${s.backgroundColor}`)
  if (s.borderRadius != null) parts.push(`border-radius:${s.borderRadius}px`)
  if (s.borderWidth) parts.push(`border:${s.borderWidth}px solid ${s.borderColor || '#DDD'}`)
  if (s.textStrokeWidth) {
    parts.push(`-webkit-text-stroke-width:${s.textStrokeWidth}px`)
    parts.push(`-webkit-text-stroke-color:${s.textStrokeColor || '#000'}`)
    parts.push(`paint-order:stroke fill`)
  }
  return parts.join(';')
}

// Detect whether element is left/center/right within canvasW and return
// the appropriate margin CSS so alignment is preserved when container shrinks.
function flowWrap(el: CmsElement, mt: number, canvasW: number): string {
  const leftGap = el.x
  const rightGap = canvasW - el.x - el.width
  // tolerance: within 2px or 0.5% of canvas width
  const tol = Math.max(2, canvasW * 0.005)

  const base = [
    mt ? `margin-top:${mt}px` : '',
    `width:${el.width}px`,
    `box-sizing:border-box`,
    `overflow:hidden`,
  ]

  if (Math.abs(leftGap - rightGap) <= tol) {
    // centered — margin auto both sides, clamp to full width
    base.push(`margin-left:auto`, `margin-right:auto`, `max-width:100%`)
  } else if (rightGap <= leftGap) {
    // right-aligned — anchor to right edge
    base.push(`margin-left:auto`, `margin-right:${rightGap}px`, `max-width:calc(100% - ${rightGap}px)`)
  } else {
    // left-aligned — anchor to left edge
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
    return `<div style="${wrap}"><ul style="${inner_css};margin:0;padding-left:1.5em">${items}</ul></div>`
  }
  if (lt === 'number') {
    const items = (el.content || '').split('\n').map(l => `<li>${escape(l)}</li>`).join('')
    return `<div style="${wrap}"><ol style="${inner_css};margin:0;padding-left:1.5em">${items}</ol></div>`
  }
  return `<div style="${wrap}"><div style="${inner_css};white-space:pre-wrap">${escape(el.content || '')}</div></div>`
}

function flowRenderImage(el: CmsElement, mt: number, cw: number): string {
  const s = el.styles
  if (!el.content) return ''
  return `<div style="${flowWrap(el, mt, cw)}"><img src="${escape(el.content)}" alt="" style="width:100%;height:auto;display:block;object-fit:${s.objectFit || 'cover'};border-radius:${s.borderRadius || 0}px"/></div>`
}

function flowRenderShape(el: CmsElement, mt: number, cw: number): string {
  const s = el.styles
  const lt = s.listType || 'none'
  const inner_css = `width:100%;word-wrap:break-word;overflow-wrap:break-word;font-family:inherit;${flowTextCss(s)}`
  const inner = lt === 'bullet'
    ? `<ul style="${inner_css};margin:0;padding-left:1.5em">${(el.content || '').split('\n').map(l => `<li>${escape(l)}</li>`).join('')}</ul>`
    : lt === 'number'
    ? `<ol style="${inner_css};margin:0;padding-left:1.5em">${(el.content || '').split('\n').map(l => `<li>${escape(l)}</li>`).join('')}</ol>`
    : `<div style="${inner_css};white-space:pre-wrap">${escape(el.content || '')}</div>`
  return `<div style="${flowWrap(el, mt, cw)}">${inner}</div>`
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
  return `<div style="${flowWrap(el, mt, cw)}">${link}</div>`
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
  return `<div style="${flowWrap(el, mt, cw)}"><div style="${boxStyle}">${header}<pre style="${preStyle}"><code class="hljs language-${escape(lang)}">${body}</code></pre></div></div>`
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
    if (el.type === 'frame' || el.type === 'container') {
      const s = el.styles
      const boxStyle = [
        flowWrap(el, mt, cw),
        s.backgroundColor && s.backgroundColor !== 'transparent' ? `background-color:${s.backgroundColor}` : '',
        s.borderRadius != null ? `border-radius:${s.borderRadius}px` : '',
        s.borderWidth ? `border:${s.borderWidth}px solid ${s.borderColor || '#D4D4D4'}` : '',
        s.padding != null ? `padding:${s.padding}px` : '',
      ].filter(Boolean).join(';')
      const children = childrenOf(el.id)
      const parts: string[] = []
      let prevBottom = el.y
      for (const child of children) {
        const relEl = { ...child, x: child.x - el.x, y: child.y - el.y }
        const childMt = Math.max(0, relEl.y - (prevBottom - el.y))
        parts.push(renderNode(relEl as CmsElement, childMt, el.width))
        prevBottom = child.y + child.height
      }
      return `<div style="${boxStyle}">${parts.join('\n')}</div>`
    }
    return ''
  }

  const roots = childrenOf(null)
  const parts: string[] = []
  let prevBottom = 0
  for (const el of roots) {
    const mt = Math.max(0, el.y - prevBottom)
    parts.push(renderNode(el, mt, canvasW))
    prevBottom = el.y + el.height
  }

  return `<div class="content-render-flow" style="position:relative;width:${canvasW}px;max-width:100%;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">${parts.join('\n')}</div>`
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
