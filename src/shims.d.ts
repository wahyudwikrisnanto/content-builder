declare module '*.css' {
  const content: string
  export default content
}

declare module 'highlight.js/styles/*' {
  const content: string
  export default content
}

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
