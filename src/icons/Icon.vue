<script setup lang="ts">
import { computed } from 'vue'
import { Icon as Iconify } from '@iconify/vue'

const props = defineProps<{ name: string; size?: number }>()

// Maps internal name → Iconify icon id.
// Names containing ':' are passed through as-is (already an iconify id).
const ICONS: Record<string, string> = {
  'type':                'lucide:type',
  'image':               'lucide:image',
  'square':              'lucide:square',
  'circle':              'lucide:circle',
  'line':                'lucide:minus',
  'video':               'lucide:video',
  'divider':             'lucide:separator-horizontal',
  'container':           'lucide:box-dashed',
  'layers':              'lucide:layers',
  'eye':                 'lucide:eye',
  'eye-off':             'lucide:eye-off',
  'lock':                'lucide:lock',
  'unlock':              'lucide:lock-open',
  'trash':               'lucide:trash-2',
  'copy':                'lucide:copy',
  'undo':                'lucide:undo-2',
  'redo':                'lucide:redo-2',
  'bold':                'lucide:bold',
  'italic':              'lucide:italic',
  'underline':           'lucide:underline',
  'align-left':          'lucide:align-left',
  'align-center':        'lucide:align-center',
  'align-right':         'lucide:align-right',
  'align-justify':       'lucide:align-justify',
  'list-bullet':         'lucide:list',
  'list-number':         'lucide:list-ordered',
  'chevron-down':        'lucide:chevron-down',
  'chevron-right':       'lucide:chevron-right',
  'plus':                'lucide:plus',
  'minus':               'lucide:minus',
  'arrow-up':            'lucide:arrow-up',
  'arrow-down':          'lucide:arrow-down',
  'grid':                'lucide:grid-2x2',
  'button':              'lucide:rectangle-horizontal',
  'upload':              'lucide:upload',
  'check':               'lucide:check',
  'download':            'lucide:download',
  'external-link':       'lucide:external-link',
  'code':                'lucide:code',
  'frame':               'lucide:frame',
  'maximize':            'lucide:maximize-2',
  'minimize':            'lucide:minimize-2',
  'flex-height':         'lucide:arrow-up-down',
  'move':                'lucide:move',
  'sidebar-left':        'lucide:panel-left',
  'responsive':          'lucide:monitor',
  'input':               'lucide:text-cursor-input',
  'input-textarea':      'lucide:text-cursor-input',
  'input-select':        'lucide:chevron-down-square',
  'input-checkbox':      'lucide:square-check',
  'input-radio':         'lucide:circle-dot',
  'align-left-edge':     'lucide:align-start-horizontal',
  'align-center-h':      'lucide:align-center-horizontal',
  'align-right-edge':    'lucide:align-end-horizontal',
  'align-top-edge':      'lucide:align-start-vertical',
  'align-center-v':      'lucide:align-center-vertical',
  'align-bottom-edge':   'lucide:align-end-vertical',
}

const icon = computed(() =>
  props.name.includes(':') ? props.name : (ICONS[props.name] ?? `lucide:${props.name}`)
)
</script>

<template>
  <Iconify :icon="icon" :width="size ?? 20" :height="size ?? 20" />
</template>
