<script setup lang="ts">
import type { Trade } from '../../../shared/domain/types'

type JournalEntry = {
  id: string
  user_id: string
  trade_id: string | null
  journal_date: string
  timezone: string
  confidence: number | null
  execution_score: number | null
  emotion: string | null
  market_context: string | null
  wins: string | null
  losses: string | null
  lesson: string | null
  created_at: string
  updated_at: string
}

const props = defineProps<{
  authHeaders: Record<string, string>
  trades: Trade[]
}>()

const entries = ref<JournalEntry[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const editing = ref<Partial<JournalEntry> | null>(null)

const newEntry = () => {
  editing.value = {
    journal_date: new Date().toISOString().slice(0, 10),
    timezone: 'America/Mexico_City',
    confidence: 7,
    execution_score: 7,
    emotion: '',
    market_context: '',
    wins: '',
    losses: '',
    lesson: '',
    trade_id: null
  }
}

const editEntry = (entry: JournalEntry) => {
  editing.value = { ...entry }
}

const cancel = () => {
  editing.value = null
}

const fetchEntries = async () => {
  loading.value = true
  error.value = null
  try {
    entries.value = await $fetch<JournalEntry[]>('/api/journal', { headers: props.authHeaders })
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load journal'
  } finally {
    loading.value = false
  }
}

const save = async () => {
  if (!editing.value) return
  const payload = {
    tradeId: editing.value.trade_id ?? null,
    journalDate: editing.value.journal_date,
    timezone: editing.value.timezone ?? 'America/Mexico_City',
    confidence: editing.value.confidence ?? null,
    executionScore: editing.value.execution_score ?? null,
    emotion: editing.value.emotion ?? null,
    marketContext: editing.value.market_context ?? null,
    wins: editing.value.wins ?? null,
    losses: editing.value.losses ?? null,
    lesson: editing.value.lesson ?? null
  }
  try {
    if (editing.value.id) {
      await $fetch(`/api/journal/${editing.value.id}`, { method: 'PUT', headers: props.authHeaders, body: payload })
    } else {
      await $fetch('/api/journal', { method: 'POST', headers: props.authHeaders, body: payload })
    }
    editing.value = null
    await fetchEntries()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to save'
  }
}

const remove = async (id: string) => {
  if (!confirm('Delete this journal entry?')) return
  try {
    await $fetch(`/api/journal/${id}`, { method: 'DELETE', headers: props.authHeaders })
    await fetchEntries()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to delete'
  }
}

onMounted(() => fetchEntries())
</script>

<template>
  <div class="col" style="padding: var(--gap-grid);">
    <div v-if="error" class="alert loss"><AppIcon name="warn" />{{ error }}</div>
    <div class="card">
      <div class="card-head">
        <h3>Journal entries</h3>
        <span class="meta">{{ entries.length }} total</span>
        <div class="grow" />
        <button class="btn btn-primary" @click="newEntry"><AppIcon name="plus" /> New entry</button>
      </div>
      <div v-if="loading" class="card-body"><span class="muted">Loading...</span></div>
      <div v-else-if="entries.length === 0" class="card-body"><span class="muted">No journal entries yet. Reflect on today and save your first entry.</span></div>
      <div v-else class="table-wrap">
        <table class="t">
          <thead><tr><th>Date</th><th>Emotion</th><th class="num">Confidence</th><th class="num">Execution</th><th>Lesson</th><th>Trade</th><th></th></tr></thead>
          <tbody>
            <tr v-for="entry in entries" :key="entry.id">
              <td class="mono">{{ entry.journal_date }}</td>
              <td>{{ entry.emotion ?? '—' }}</td>
              <td class="num">{{ entry.confidence ?? '—' }}</td>
              <td class="num">{{ entry.execution_score ?? '—' }}</td>
              <td class="muted" style="max-width: 360px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ entry.lesson ?? '—' }}</td>
              <td class="mono muted">{{ entry.trade_id ? entry.trade_id.slice(0, 8) : '—' }}</td>
              <td style="display: flex; gap: 4px;">
                <button class="btn btn-sm btn-ghost" @click="editEntry(entry)">Edit</button>
                <button class="btn btn-sm btn-ghost" @click="remove(entry.id)">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="editing" class="card">
      <div class="card-head"><h3>{{ editing.id ? 'Edit entry' : 'New entry' }}</h3><div class="grow" /><button class="btn btn-sm btn-ghost" @click="cancel">Cancel</button></div>
      <form class="card-body grid" style="grid-template-columns: repeat(4, 1fr);" @submit.prevent="save">
        <div class="field"><label>Date</label><input v-model="editing.journal_date" class="input mono" type="date" required /></div>
        <div class="field">
          <label>Linked trade</label>
          <select v-model="editing.trade_id" class="input mono">
            <option :value="null">None</option>
            <option v-for="trade in trades.slice(0, 50)" :key="trade.id" :value="trade.id">
              {{ trade.openedAt.slice(5, 10) }} · {{ trade.symbol }} · {{ trade.side }}
            </option>
          </select>
        </div>
        <div class="field"><label>Confidence (1-10)</label><input v-model.number="editing.confidence" class="input mono" type="number" min="1" max="10" /></div>
        <div class="field"><label>Execution (1-10)</label><input v-model.number="editing.execution_score" class="input mono" type="number" min="1" max="10" /></div>
        <div class="field" style="grid-column: span 2;"><label>Emotion</label><input v-model="editing.emotion" class="input" placeholder="Calm, Focused, Anxious..." /></div>
        <div class="field" style="grid-column: span 2;"><label>Market context</label><input v-model="editing.market_context" class="input" placeholder="HTF context, levels, news..." /></div>
        <div class="field" style="grid-column: span 2;"><label>Wins</label><textarea v-model="editing.wins" class="input" rows="3" /></div>
        <div class="field" style="grid-column: span 2;"><label>Losses / mistakes</label><textarea v-model="editing.losses" class="input" rows="3" /></div>
        <div class="field" style="grid-column: span 4;"><label>Lesson</label><textarea v-model="editing.lesson" class="input" rows="2" placeholder="The single takeaway from today." /></div>
        <div style="grid-column: span 4; display: flex; justify-content: flex-end;">
          <button class="btn btn-primary" type="submit">Save entry</button>
        </div>
      </form>
    </div>
  </div>
</template>
