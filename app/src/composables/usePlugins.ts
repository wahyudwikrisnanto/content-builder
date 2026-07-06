import { inject, provide, type Component } from 'vue'
import type { CmsElement, ElementType } from '../types'

export interface RendererPlugin {
  type: 'renderer'
  /** Element type(s) this plugin handles, OR a predicate for full control */
  match: ElementType | ElementType[] | ((el: CmsElement) => boolean)
  /** Vue component to render instead of the built-in element renderer */
  component: Component
}

export interface DialogPlugin {
  type: 'dialog'
  /** Element type(s) this plugin handles */
  match: ElementType | ElementType[]
  /** Label shown on the trigger button in the Properties panel */
  label: string
  /** Icon name (uses the built-in Icon component) */
  icon?: string
  /**
   * Called when the user clicks the trigger button.
   * Resolve with an object of CmsElement fields to patch, or null to cancel.
   */
  open: (el: CmsElement) => Promise<Partial<CmsElement> | null>
}

export interface ActivatorPlugin {
  type: 'activator'
  /** Element type(s) this plugin handles */
  match: ElementType | ElementType[] | ((el: CmsElement) => boolean)
  /**
   * Called when the user clicks/double-clicks the element.
   * Resolve with a partial CmsElement to patch, or null to cancel.
   */
  activate: (el: CmsElement) => Promise<Partial<CmsElement> | null>
}

export type CmsPlugin = RendererPlugin | DialogPlugin | ActivatorPlugin

const PLUGINS_KEY = Symbol('cms-plugins')

export function providePlugins(plugins: CmsPlugin[]): void {
  provide(PLUGINS_KEY, plugins)
}

export function usePlugins(): CmsPlugin[] {
  return inject<CmsPlugin[]>(PLUGINS_KEY, [])
}

export function matchesElement(match: RendererPlugin['match'] | DialogPlugin['match'], el: CmsElement): boolean {
  if (typeof match === 'function') return match(el)
  if (Array.isArray(match)) return match.includes(el.type)
  return match === el.type
}

export function findRendererPlugin(plugins: CmsPlugin[], el: CmsElement): RendererPlugin | null {
  for (const p of plugins) {
    if (p.type === 'renderer' && matchesElement(p.match, el)) return p
  }
  return null
}

export function findDialogPlugins(plugins: CmsPlugin[], el: CmsElement): DialogPlugin[] {
  return plugins.filter(p => p.type === 'dialog' && matchesElement(p.match, el)) as DialogPlugin[]
}

export function findActivatorPlugin(plugins: CmsPlugin[], el: CmsElement): ActivatorPlugin | null {
  for (const p of plugins) {
    if (p.type === 'activator' && matchesElement(p.match, el)) return p
  }
  return null
}
