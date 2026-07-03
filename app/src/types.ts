export type ElementType = 'text' | 'image' | 'shape' | 'video' | 'divider' | 'container' | 'frame' | 'code' | 'button' | 'input'
export type InputType = 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'textarea' | 'select' | 'checkbox' | 'radio'
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
  responsive?: boolean
  clipContent?: boolean
  // input element fields
  inputType?: InputType
  placeholder?: string
  inputLabel?: string
  required?: boolean
  inputOptions?: string   // newline-separated options for select/radio
}

export type FactoryKey =
  | 'text' | 'text-heading' | 'text-subheading' | 'text-body' | 'text-caption'
  | 'image'
  | 'shape-rect' | 'shape-circle' | 'shape-line'
  | 'video' | 'divider' | 'container' | 'frame' | 'code' | 'button'
  | 'input' | 'input-text' | 'input-email' | 'input-password' | 'input-number'
  | 'input-textarea' | 'input-select' | 'input-checkbox' | 'input-radio'

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
  selectedIds: string[]
  editingTextId: string | null
  allSelected: boolean
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
  sidebarHidden: boolean
}

export interface CanvasPreset {
  label: string
  w: number
  h: number
  /** Mark as the default preset. Auto-set when only one preset is provided. */
  default?: boolean
}

export type SidebarSection = 'elements' | 'layers' | 'textStyles'

export interface SidebarConfig {
  /**
   * Which sections to show and in what order.
   * Omit to show all three in default order.
   * Pass [] to hide the sidebar entirely.
   */
  sections?: SidebarSection[]
  /** Per-section label / visibility overrides. */
  sectionOptions?: Partial<Record<SidebarSection, { label?: string; hidden?: boolean }>>
}

export type CanvasHeightMode = 'flexible' | 'fixed'

export interface BuilderConfig {
  /**
   * Canvas size presets for the toolbar dropdown.
   * - Omitted / empty → built-in presets.
   * - Exactly 1 item → applied as default on mount, dropdown hidden.
   * - Multiple items → shown in dropdown; item with default:true (or index 0) applied on mount.
   */
  canvasSizes?: CanvasPreset[]
  /** Sidebar panel configuration. */
  sidebar?: SidebarConfig
  /** Sets initial flexibleHeight state. Default: 'fixed'. */
  canvasHeightMode?: CanvasHeightMode
  /** Show the "Scale content to fit" toggle in the preset dropdown. Default: true. */
  showScaleToggle?: boolean
}
