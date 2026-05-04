<script setup lang="ts">
defineProps<{
  label: string
  value: string
  delta?: string
  deltaTone?: 'pos' | 'neg' | 'warn'
  deltaLabel?: string
  sparkData?: number[]
}>()
</script>

<template>
  <div class="kpi">
    <div class="kpi-label">{{ label }}</div>
    <div class="kpi-value">{{ value }}</div>
    <div class="kpi-meta">
      <span v-if="delta" :class="['delta', deltaTone ?? 'pos']">{{ delta }}</span>
      <span v-if="deltaLabel" class="muted">{{ deltaLabel }}</span>
    </div>
    <Sparkline v-if="sparkData" class="spark" :data="sparkData" :tone="deltaTone === 'neg' ? 'neg' : 'pos'" />
  </div>
</template>
