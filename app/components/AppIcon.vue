<script setup lang="ts">
withDefaults(defineProps<{ name: string; size?: number }>(), { size: 14 })

const paths: Record<string, string[]> = {
  overview: ['M3 11h6V3H3v8Z', 'M15 21h6V3h-6v18Z', 'M3 21h6v-6H3v6Z'],
  trades: ['M4 6h16', 'M4 12h16', 'M4 18h10'],
  analytics: ['M4 18 9 13l4 3 7-10'],
  journal: ['M6 3h11l3 3v15H6V3Z', 'M9 9h8', 'M9 13h8', 'M9 17h5'],
  playbook: ['M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4Z', 'M8 4v13a3 3 0 0 0 3 3'],
  risk: ['M12 3 20 7v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4Z'],
  imports: ['M12 3v12', 'm7-7-7 7-7-7', 'M5 21h14'],
  settings: ['M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z', 'M4 12H2', 'M22 12h-2', 'M12 4V2', 'M12 22v-2'],
  search: ['M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z', 'm16 16 5 5'],
  bell: ['M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z', 'M10 21h4'],
  plus: ['M12 5v14', 'M5 12h14'],
  panel: ['M4 5h16v14H4V5Z', 'M9 5v14'],
  trend: ['M4 16 9 11l4 3 7-8', 'M15 6h5v5'],
  warn: ['M12 4 21 20H3L12 4Z', 'M12 9v5', 'M12 17h.01'],
  info: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z', 'M12 10v7', 'M12 7h.01'],
  refresh: ['M20 12a8 8 0 0 1-14 5', 'M4 17h5v-5', 'M4 12a8 8 0 0 1 14-5', 'M20 7h-5v5'],
  expand: ['M8 3H3v5', 'M16 3h5v5', 'M8 21H3v-5', 'M16 21h5v-5'],
  download: ['M12 3v12', 'm7-7-7 7-7-7', 'M5 21h14'],
  filter: ['M4 5h16', 'M7 12h10', 'M10 19h4']
}
</script>

<template>
  <svg class="nav-icon" :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path v-for="path in paths[name] ?? paths.overview" :key="path" :d="path" />
  </svg>
</template>
