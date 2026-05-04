<script setup lang="ts">
const props = withDefaults(defineProps<{ data: number[]; width?: number; height?: number; tone?: 'pos' | 'neg' | 'warn' | 'accent' }>(), {
  width: 64,
  height: 22,
  tone: 'pos'
})

const path = computed(() => {
  const min = Math.min(...props.data)
  const max = Math.max(...props.data)
  const span = max - min || 1
  const stepX = props.width / ((props.data.length - 1) || 1)
  return props.data
    .map((value, index) => {
      const x = index * stepX
      const y = props.height - ((value - min) / span) * (props.height - 2) - 1
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')
})

const stroke = computed(() => props.tone === 'neg' ? 'var(--loss)' : props.tone === 'warn' ? 'var(--warn)' : props.tone === 'accent' ? 'var(--accent)' : 'var(--gain)')
</script>

<template>
  <svg :width="width" :height="height" :viewBox="`0 0 ${width} ${height}`" aria-hidden="true">
    <path :d="`${path} L ${width} ${height} L 0 ${height} Z`" :fill="stroke" opacity="0.12" />
    <path :d="path" fill="none" :stroke="stroke" stroke-width="1.25" stroke-linejoin="round" stroke-linecap="round" />
  </svg>
</template>
