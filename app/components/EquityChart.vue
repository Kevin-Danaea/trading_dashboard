<script setup lang="ts">
const props = withDefaults(defineProps<{ points: number[]; height?: number }>(), { height: 220 })
const width = 820
const pad = { l: 44, r: 12, t: 12, b: 24 }
const min = computed(() => Math.min(...props.points))
const max = computed(() => Math.max(...props.points))
const span = computed(() => max.value - min.value || 1)
const x = (index: number) => pad.l + index * ((width - pad.l - pad.r) / ((props.points.length - 1) || 1))
const y = (value: number) => pad.t + (props.height - pad.t - pad.b) * (1 - (value - min.value) / span.value)
const linePath = computed(() => props.points.map((value, index) => `${index === 0 ? 'M' : 'L'}${x(index).toFixed(1)} ${y(value).toFixed(1)}`).join(' '))
const positive = computed(() => props.points.at(-1)! >= props.points[0]!)
const stroke = computed(() => positive.value ? 'var(--gain)' : 'var(--loss)')
</script>

<template>
  <svg width="100%" :height="height" :viewBox="`0 0 ${width} ${height}`" preserveAspectRatio="none" role="img" aria-label="Equity curve">
    <g v-for="tick in 5" :key="tick">
      <line :x1="pad.l" :x2="width - pad.r" :y1="pad.t + (height - pad.t - pad.b) * ((tick - 1) / 4)" :y2="pad.t + (height - pad.t - pad.b) * ((tick - 1) / 4)" stroke="var(--line-1)" stroke-dasharray="2 4" />
    </g>
    <path :d="`${linePath} L ${x(points.length - 1)} ${height - pad.b} L ${pad.l} ${height - pad.b} Z`" :fill="stroke" opacity="0.13" />
    <path :d="linePath" fill="none" :stroke="stroke" stroke-width="1.5" />
    <circle :cx="x(points.length - 1)" :cy="y(points.at(-1)!)" r="3" :fill="stroke" />
  </svg>
</template>
