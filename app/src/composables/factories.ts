import type { CmsElement, ElementStyles, Factory, FactoryKey, InputType, ShapeType } from '../types'

let _uid = Date.now()
export const cmsUid = (): string => `el-${_uid++}`

export const cloneEl = <T>(o: T): T => JSON.parse(JSON.stringify(o))

const baseFlags = () => ({ visible: true, locked: false })

interface TextPreset { content: string; width: number; height: number; styles: Partial<ElementStyles> }
const TEXT_PRESETS: Record<string, TextPreset> = {
  heading:    { content: 'Heading',    width: 320, height: 56, styles: { fontSize: 36, fontWeight: '700' } },
  subheading: { content: 'Subheading', width: 280, height: 44, styles: { fontSize: 22, fontWeight: '600' } },
  body:       { content: 'Body text goes here. Edit this text to add your own content.', width: 340, height: 90, styles: {} },
  caption:    { content: 'Caption text', width: 180, height: 32, styles: { fontSize: 12, color: '#717171' } },
}

function createText(x = 60, y = 60, preset?: string): CmsElement {
  const base: CmsElement = {
    id: cmsUid(), type: 'text', x, y, width: 240, height: 48,
    content: 'Type something...',
    styles: {
      fontSize: 16, fontWeight: '400', fontStyle: 'normal',
      textDecoration: 'none', color: '#222222',
      backgroundColor: 'transparent', textAlign: 'left',
      lineHeight: 1.5, letterSpacing: 0, borderRadius: 0,
      padding: 10, borderWidth: 0, borderColor: '#DDDDDD', opacity: 1,
    },
    ...baseFlags(),
  }
  const p = preset ? TEXT_PRESETS[preset] : undefined
  if (p) {
    base.content = p.content
    base.width = p.width
    base.height = p.height
    Object.assign(base.styles, p.styles)
  }
  return base
}

function createImage(x = 60, y = 60): CmsElement {
  return {
    id: cmsUid(), type: 'image', x, y, width: 280, height: 200, content: '',
    styles: { borderRadius: 8, borderWidth: 0, borderColor: '#DDDDDD', opacity: 1, objectFit: 'cover' },
    ...baseFlags(),
  }
}

function createShape(x = 60, y = 60, shapeType: ShapeType = 'rect'): CmsElement {
  const isLine = shapeType === 'line'
  return {
    id: cmsUid(), type: 'shape', shapeType, x, y,
    width: isLine ? 200 : 120,
    height: isLine ? 4 : 120,
    content: '',
    styles: {
      backgroundColor: isLine ? '#222222' : '#F0F0F0',
      borderRadius: shapeType === 'circle' ? 999 : 8,
      borderWidth: isLine ? 0 : 1,
      borderColor: '#DDDDDD', opacity: 1,
      fontSize: 14, fontWeight: '500', fontStyle: 'normal',
      textDecoration: 'none', color: '#222222',
      textAlign: 'center', lineHeight: 1.4, letterSpacing: 0,
      padding: 8,
    },
    ...baseFlags(),
  }
}

function createVideo(x = 60, y = 60): CmsElement {
  return {
    id: cmsUid(), type: 'video', x, y, width: 320, height: 200, content: '',
    styles: { borderRadius: 8, borderWidth: 0, borderColor: '#DDDDDD', opacity: 1 },
    ...baseFlags(),
  }
}

function createDivider(x = 60, y = 60): CmsElement {
  return {
    id: cmsUid(), type: 'divider', x, y, width: 300, height: 2, content: '',
    styles: { backgroundColor: '#DDDDDD', opacity: 1, borderRadius: 0, borderWidth: 0, borderColor: '#DDDDDD' },
    ...baseFlags(),
  }
}

function createFrame(x = 60, y = 60): CmsElement {
  return {
    id: cmsUid(), type: 'frame', x, y, width: 400, height: 300, content: '',
    name: 'Frame',
    styles: { backgroundColor: 'transparent', borderRadius: 0, borderWidth: 1, borderColor: '#D4D4D4', opacity: 1 },
    parentId: null,
    ...baseFlags(),
  }
}

function createButton(x = 60, y = 60): CmsElement {
  return {
    id: cmsUid(), type: 'button', x, y, width: 160, height: 44,
    content: 'Click me',
    href: '',
    target: '_self',
    styles: {
      backgroundColor: '#2563EB',
      color: '#FFFFFF',
      borderRadius: 8,
      borderWidth: 0,
      borderColor: '#1E40AF',
      opacity: 1,
      padding: 10,
      fontSize: 14,
      fontWeight: '600',
      fontStyle: 'normal',
      textDecoration: 'none',
      textAlign: 'center',
      lineHeight: 1.2,
      letterSpacing: 0,
    },
    ...baseFlags(),
  }
}

function createCode(x = 60, y = 60): CmsElement {
  return {
    id: cmsUid(), type: 'code', x, y, width: 420, height: 160,
    content: "// Edit me\nconst hello = 'world';\nconsole.log(hello);",
    language: 'javascript',
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
    ...baseFlags(),
  }
}

function createInput(x = 60, y = 60, inputType: InputType = 'text'): CmsElement {
  const isMultiline = inputType === 'textarea'
  const isCheck = inputType === 'checkbox' || inputType === 'radio'
  const isSelect = inputType === 'select'
  return {
    id: cmsUid(), type: 'input', x, y,
    width: isCheck ? 200 : 280,
    height: isMultiline ? 100 : isCheck ? 28 : 44,
    content: '',
    inputType,
    inputLabel: inputType === 'checkbox' ? 'Check me'
      : inputType === 'radio' ? 'Option 1\nOption 2\nOption 3'
      : inputType === 'select' ? ''
      : '',
    placeholder: isCheck || isSelect ? '' : `Enter ${inputType}...`,
    inputOptions: isSelect ? 'Option 1\nOption 2\nOption 3' : inputType === 'radio' ? 'Option 1\nOption 2\nOption 3' : '',
    required: false,
    styles: {
      fontSize: 14, fontWeight: '400', color: '#222222',
      backgroundColor: isCheck ? 'transparent' : '#FFFFFF',
      borderRadius: isCheck ? 0 : 6,
      borderWidth: isCheck ? 0 : 1,
      borderColor: '#D1D5DB',
      opacity: 1, padding: isCheck ? 0 : 10,
    },
    ...baseFlags(),
  }
}

function createContainer(x = 60, y = 60): CmsElement {
  return {
    id: cmsUid(), type: 'container', x, y, width: 360, height: 240, content: '',
    styles: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#EBEBEB', opacity: 1, padding: 16 },
    ...baseFlags(),
  }
}

export const CmsFactories: Record<FactoryKey, Factory> = {
  'text':            createText,
  'text-heading':    (x, y) => createText(x, y, 'heading'),
  'text-subheading': (x, y) => createText(x, y, 'subheading'),
  'text-body':       (x, y) => createText(x, y, 'body'),
  'text-caption':    (x, y) => createText(x, y, 'caption'),
  'image':           createImage,
  'shape-rect':      (x, y) => createShape(x, y, 'rect'),
  'shape-circle':    (x, y) => createShape(x, y, 'circle'),
  'shape-line':      (x, y) => createShape(x, y, 'line'),
  'video':           createVideo,
  'divider':         createDivider,
  'container':       createContainer,
  'frame':           createFrame,
  'code':            createCode,
  'button':          createButton,
  'input':           createInput,
  'input-text':      (x, y) => createInput(x, y, 'text'),
  'input-email':     (x, y) => createInput(x, y, 'email'),
  'input-password':  (x, y) => createInput(x, y, 'password'),
  'input-number':    (x, y) => createInput(x, y, 'number'),
  'input-textarea':  (x, y) => createInput(x, y, 'textarea'),
  'input-select':    (x, y) => createInput(x, y, 'select'),
  'input-checkbox':  (x, y) => createInput(x, y, 'checkbox'),
  'input-radio':     (x, y) => createInput(x, y, 'radio'),
}
