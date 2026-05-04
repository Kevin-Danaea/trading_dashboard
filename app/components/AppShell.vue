<script setup lang="ts">
const route = defineModel<string>('route', { required: true })
const range = defineModel<string>('range', { required: true })

const workspaceItems = [
  { id: 'overview', label: 'Overview', k: 'G O' },
  { id: 'trades', label: 'Trades', k: 'G T', badge: '120' },
  { id: 'analytics', label: 'Analytics', k: 'G A' },
  { id: 'journal', label: 'Journal', k: 'G J' },
  { id: 'playbook', label: 'Playbook', k: 'G P' },
  { id: 'risk', label: 'Risk', k: 'G R' }
]
const systemItems = [
  { id: 'imports', label: 'Imports', k: 'G I' },
  { id: 'settings', label: 'Settings', k: 'G ,' }
]
const ranges = ['1D', '1W', '1M', '3M', 'YTD', 'ALL']
</script>

<template>
  <div class="app" data-theme="dark" data-density="medium" data-accent="brass">
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-mark">L</div>
        <div class="brand-copy">
          <div class="brand-name">Ledger</div>
          <div class="brand-sub">Trade Journal</div>
        </div>
      </div>
      <nav class="nav">
        <div class="nav-section">Workspace</div>
        <button v-for="item in workspaceItems" :key="item.id" class="nav-item" :aria-current="route === item.id" @click="route = item.id">
          <AppIcon :name="item.id" />
          <span class="nav-label">{{ item.label }}</span>
          <span v-if="item.badge" class="nav-badge">{{ item.badge }}</span>
          <span v-else class="nav-kbd">{{ item.k }}</span>
        </button>
        <div class="nav-section">System</div>
        <button v-for="item in systemItems" :key="item.id" class="nav-item" :aria-current="route === item.id" @click="route = item.id">
          <AppIcon :name="item.id" />
          <span class="nav-label">{{ item.label }}</span>
          <span class="nav-kbd">{{ item.k }}</span>
        </button>
      </nav>
      <div class="sidebar-foot">
        <div class="avatar">DM</div>
        <div class="foot-meta">
          <span class="foot-name">Diego Marin</span>
          <span class="foot-sub">PRO · 60d streak</span>
        </div>
      </div>
    </aside>

    <header class="topbar">
      <button class="icon-btn" aria-label="Toggle sidebar"><AppIcon name="panel" /></button>
      <div class="crumbs"><span>Workspace</span><span>/</span><strong>{{ route[0]?.toUpperCase() + route.slice(1) }}</strong></div>
      <div class="search"><AppIcon name="search" :size="12" /><input placeholder="Search trades, setups, tags..." /><span class="search-kbd">⌘K</span></div>
      <div class="spacer" />
      <div class="market-status"><span class="dot-live" /><span>NY · OPEN</span><span class="muted">20:42 UTC</span></div>
      <div class="range-picker">
        <button v-for="item in ranges" :key="item" :aria-pressed="range === item" @click="range = item">{{ item }}</button>
      </div>
      <button class="icon-btn" aria-label="Notifications"><AppIcon name="bell" /></button>
      <button class="btn btn-primary"><AppIcon name="plus" :size="12" /> Log trade <span class="kbd">N</span></button>
    </header>

    <main class="main">
      <slot />
    </main>
  </div>
</template>
