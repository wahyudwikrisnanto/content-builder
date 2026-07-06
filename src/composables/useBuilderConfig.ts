import { provide, inject } from 'vue'
import type { BuilderConfig } from '../types'

const CONFIG_KEY = Symbol('builder-config')

export function provideBuilderConfig(config: BuilderConfig | undefined): void {
  provide(CONFIG_KEY, config ?? {})
}

export function useBuilderConfig(): BuilderConfig {
  return inject(CONFIG_KEY, {})
}
