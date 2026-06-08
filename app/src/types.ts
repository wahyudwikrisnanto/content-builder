export type ElementType = 'text' | 'image' | 'shape' | 'video' | 'divider' | 'container' | 'frame' | 'code' | 'button'
export type ShapeType = 'rect' | 'circle' | 'line'
export type SidebarTab = 'elements' | 'layers' | 'textStyles'
export type TextAlign = 'left' | 'center' | 'right' | 'justify'
export type ListType = 'none' | 'bullet' | 'number'
export type FontWeight = '300' | '400' | '500' | '600' | '700'
export type ObjectFit = 'cover' | 'contain' | 'fill'

export interface ElementStyles {
  fontSize?: number
  fontWeight?: FontWeight | string
  fontStyle?: 'normal' | 'italic'
  textDecoration?: 'none' | 'underline'
  color?: string
  backgroundColor?: string
  textAlign?: TextAlign
  lineHeight?: number
  letterSpacing?: number
  borderRadius?: number
  padding?: number
  borderWidth?: number
  borderColor?: string
  opacity?: number
  objectFit?: ObjectFit
  listType?: ListType
  textStrokeWidth?: number
  textStrokeColor?: string
}

export interface CmsElement {
  id: string
  type: ElementType
  shapeType?: ShapeType
  x: number
  y: number
  width: number
  height: number
  content: string
  styles: ElementStyles
  visible: boolean
  locked: boolean
  parentId?: string | null
  name?: string
  language?: string
  href?: string
  target?: '_self' | '_blank'
  copyEnabled?: boolean
}

export type FactoryKey =
  | 'text' | 'text-heading' | 'text-subheading' | 'text-body' | 'text-caption'
  | 'image'
  | 'shape-rect' | 'shape-circle' | 'shape-line'
  | 'video' | 'divider' | 'container' | 'frame' | 'code' | 'button'

export type Factory = (x?: number, y?: number) => CmsElement

export type GuideAxis = 'x' | 'y'
export interface Guide {
  axis: GuideAxis
  pos: number
  start: number
  end: number
}

export interface CmsState {
  elements: CmsElement[]
  selectedId: string | null
  editingTextId: string | null
  canvasWidth: number
  canvasHeight: number
  zoom: number
  sidebarTab: SidebarTab
  history: CmsElement[][]
  future: CmsElement[][]
  guides: Guide[]
  fullscreen: boolean
  flexibleHeight: boolean
  preview: boolean
  previewFullscreen: boolean
}

export interface CanvasPreset { label: string; w: number; h: number }
