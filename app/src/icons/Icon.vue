<script setup lang="ts">
defineProps<{ name: string; size?: number }>()
</script>

<template>
  <svg :width="size ?? 20" :height="size ?? 20" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <template v-if="name === 'type'">
      <path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/>
    </template>
    <template v-else-if="name === 'image'">
      <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
    </template>
    <template v-else-if="name === 'square'">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
    </template>
    <template v-else-if="name === 'circle'">
      <circle cx="12" cy="12" r="9"/>
    </template>
    <template v-else-if="name === 'line'">
      <path d="M5 12h14"/>
    </template>
    <template v-else-if="name === 'video'">
      <rect x="2" y="4" width="20" height="16" rx="2"/><polygon points="10,8 16,12 10,16" fill="currentColor" stroke="none"/>
    </template>
    <template v-else-if="name === 'divider'">
      <path d="M3 12h18"/><path d="M3 6h18" opacity=".25"/><path d="M3 18h18" opacity=".25"/>
    </template>
    <template v-else-if="name === 'container'">
      <rect x="3" y="3" width="18" height="18" rx="2" stroke-dasharray="4 3"/>
    </template>
    <template v-else-if="name === 'layers'">
      <polygon points="12,2 2,7 12,12 22,7"/><polyline points="2,17 12,22 22,17"/><polyline points="2,12 12,17 22,12"/>
    </template>
    <template v-else-if="name === 'eye'">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </template>
    <template v-else-if="name === 'eye-off'">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </template>
    <template v-else-if="name === 'lock'">
      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
    </template>
    <template v-else-if="name === 'unlock'">
      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 019.9-1"/>
    </template>
    <template v-else-if="name === 'trash'">
      <polyline points="3,6 5,6 21,6"/>
      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
    </template>
    <template v-else-if="name === 'copy'">
      <rect x="9" y="9" width="13" height="13" rx="2"/>
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
    </template>
    <template v-else-if="name === 'undo'">
      <path d="M3 7v6h6"/><path d="M21 17a9 9 0 00-9-9 9 9 0 00-6.69 3L3 13"/>
    </template>
    <template v-else-if="name === 'redo'">
      <path d="M21 7v6h-6"/><path d="M3 17a9 9 0 019-9 9 9 0 016.69 3L21 13"/>
    </template>
    <template v-else-if="name === 'bold'">
      <path d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z"/><path d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z"/>
    </template>
    <template v-else-if="name === 'italic'">
      <line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/>
    </template>
    <template v-else-if="name === 'underline'">
      <path d="M6 3v7a6 6 0 0012 0V3"/><line x1="4" y1="21" x2="20" y2="21"/>
    </template>
    <template v-else-if="name === 'align-left'">
      <line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/>
      <line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/>
    </template>
    <template v-else-if="name === 'align-center'">
      <line x1="18" y1="10" x2="6" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/>
      <line x1="21" y1="14" x2="3" y2="14"/><line x1="18" y1="18" x2="6" y2="18"/>
    </template>
    <template v-else-if="name === 'align-justify'">
      <line x1="21" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/>
      <line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="3" y2="18"/>
    </template>
    <template v-else-if="name === 'list-bullet'">
      <line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/>
      <circle cx="4" cy="6" r="1.2" fill="currentColor"/>
      <circle cx="4" cy="12" r="1.2" fill="currentColor"/>
      <circle cx="4" cy="18" r="1.2" fill="currentColor"/>
    </template>
    <template v-else-if="name === 'list-number'">
      <line x1="10" y1="6" x2="20" y2="6"/><line x1="10" y1="12" x2="20" y2="12"/><line x1="10" y1="18" x2="20" y2="18"/>
      <text x="3" y="8" font-size="6" fill="currentColor" stroke="none" font-family="sans-serif">1</text>
      <text x="3" y="14" font-size="6" fill="currentColor" stroke="none" font-family="sans-serif">2</text>
      <text x="3" y="20" font-size="6" fill="currentColor" stroke="none" font-family="sans-serif">3</text>
    </template>
    <template v-else-if="name === 'align-right'">
      <line x1="21" y1="10" x2="7" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/>
      <line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="7" y2="18"/>
    </template>
    <template v-else-if="name === 'chevron-down'">
      <polyline points="6,9 12,15 18,9"/>
    </template>
    <template v-else-if="name === 'plus'">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </template>
    <template v-else-if="name === 'minus'">
      <line x1="5" y1="12" x2="19" y2="12"/>
    </template>
    <template v-else-if="name === 'arrow-up'">
      <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5,12 12,5 19,12"/>
    </template>
    <template v-else-if="name === 'arrow-down'">
      <line x1="12" y1="5" x2="12" y2="19"/><polyline points="19,12 12,19 5,12"/>
    </template>
    <template v-else-if="name === 'grid'">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </template>
    <template v-else-if="name === 'button'">
      <rect x="2" y="8" width="20" height="8" rx="4"/>
      <line x1="7" y1="12" x2="17" y2="12"/>
    </template>
    <template v-else-if="name === 'upload'">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
      <polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/>
    </template>
    <template v-else-if="name === 'check'">
      <polyline points="20,6 9,17 4,12"/>
    </template>
    <template v-else-if="name === 'download'">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
      <polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/>
    </template>
    <template v-else-if="name === 'external-link'">
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
      <polyline points="15,3 21,3 21,9"/><line x1="10" y1="14" x2="21" y2="3"/>
    </template>
    <template v-else-if="name === 'code'">
      <polyline points="16,18 22,12 16,6"/><polyline points="8,6 2,12 8,18"/>
    </template>
    <template v-else-if="name === 'frame'">
      <line x1="22" y1="6" x2="2" y2="6"/><line x1="22" y1="18" x2="2" y2="18"/>
      <line x1="6" y1="2" x2="6" y2="22"/><line x1="18" y1="2" x2="18" y2="22"/>
    </template>
    <template v-else-if="name === 'chevron-right'">
      <polyline points="9,18 15,12 9,6"/>
    </template>
    <template v-else-if="name === 'maximize'">
      <path d="M3 9V3h6"/><path d="M21 9V3h-6"/><path d="M3 15v6h6"/><path d="M21 15v6h-6"/>
    </template>
    <template v-else-if="name === 'minimize'">
      <path d="M9 3v6H3"/><path d="M15 3v6h6"/><path d="M9 21v-6H3"/><path d="M15 21v-6h6"/>
    </template>
    <template v-else-if="name === 'flex-height'">
      <line x1="12" y1="3" x2="12" y2="21"/>
      <polyline points="7,7 12,3 17,7"/>
      <polyline points="7,17 12,21 17,17"/>
    </template>
    <template v-else-if="name === 'move'">
      <polyline points="5,9 2,12 5,15"/><polyline points="9,5 12,2 15,5"/>
      <polyline points="15,19 12,22 9,19"/><polyline points="19,9 22,12 19,15"/>
      <line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/>
    </template>
    <template v-else-if="name === 'sidebar-left'">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <line x1="9" y1="3" x2="9" y2="21"/>
    </template>
    <template v-else-if="name === 'align-left-edge'">
      <line x1="4" y1="3" x2="4" y2="21"/><rect x="8" y="7" width="12" height="4" rx="1"/><rect x="8" y="13" width="8" height="4" rx="1"/>
    </template>
    <template v-else-if="name === 'align-center-h'">
      <line x1="12" y1="3" x2="12" y2="21"/><rect x="4" y="7" width="16" height="4" rx="1"/><rect x="6" y="13" width="12" height="4" rx="1"/>
    </template>
    <template v-else-if="name === 'align-right-edge'">
      <line x1="20" y1="3" x2="20" y2="21"/><rect x="4" y="7" width="12" height="4" rx="1"/><rect x="8" y="13" width="8" height="4" rx="1"/>
    </template>
    <template v-else-if="name === 'align-top-edge'">
      <line x1="3" y1="4" x2="21" y2="4"/><rect x="7" y="8" width="4" height="12" rx="1"/><rect x="13" y="8" width="4" height="8" rx="1"/>
    </template>
    <template v-else-if="name === 'align-center-v'">
      <line x1="3" y1="12" x2="21" y2="12"/><rect x="7" y="4" width="4" height="16" rx="1"/><rect x="13" y="6" width="4" height="12" rx="1"/>
    </template>
    <template v-else-if="name === 'align-bottom-edge'">
      <line x1="3" y1="20" x2="21" y2="20"/><rect x="7" y="4" width="4" height="12" rx="1"/><rect x="13" y="8" width="4" height="8" rx="1"/>
    </template>
    <template v-else-if="name === 'responsive'">
      <rect x="2" y="6" width="20" height="12" rx="2"/>
      <line x1="2" y1="12" x2="22" y2="12" stroke-dasharray="3 2"/>
    </template>
  </svg>
</template>
