declare module 'vue' {
  interface GlobalComponents {
    'iconify-icon': import('vue').DefineComponent<{
      icon: string
      width?: string | number
      height?: string | number
      inline?: boolean
    }>
  }
}
export {}
