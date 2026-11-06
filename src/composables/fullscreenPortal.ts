import { ref } from 'vue'

/**
 * Teleport target for body-level overlays (resize handles). Native Fullscreen API
 * only paints the fullscreen element's subtree — anything teleported to <body>
 * becomes invisible while cb-root is fullscreen, so point teleports at cb-root instead.
 */
export const fullscreenPortalRoot = ref<HTMLElement | null>(null)
