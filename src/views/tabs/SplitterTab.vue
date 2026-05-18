<script setup lang="ts">
import { computed } from 'vue'
import { useTripStore } from '@/stores/trips'

const trip = useTripStore()
const settlements = computed(() => trip.settlements)
const friendName = (id: string) => trip.state.friends.find(f => f.id === id)?.name ?? '?'

function fmt(n: number) { return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) }
</script>

<template>
  <div class="space-y-5 anim-fade-up">
    <div v-if="trip.state.friends.length < 2" class="rounded-2xl border-2 border-dashed border-slate-200 dark:border-[#2a3347] p-16 text-center">
      <p class="text-4xl mb-3 select-none">👥</p>
      <p class="text-sm font-semibold text-slate-600 dark:text-slate-400">Add at least 2 people in the Group tab</p>
      <p class="text-xs text-slate-400 mt-1">Then log expenses here to calculate who owes what.</p>
    </div>

    <div v-else-if="!trip.state.payments.length" class="rounded-2xl border-2 border-dashed border-slate-200 dark:border-[#2a3347] p-16 text-center">
      <p class="text-4xl mb-3 select-none">💸</p>
      <p class="text-sm font-semibold text-slate-600 dark:text-slate-400">Log expenses to see who owes what</p>
      <p class="text-xs text-slate-400 mt-1">Track who paid for what, then settle up at the end.</p>
    </div>

    <div v-else class="bg-white dark:bg-[#1a1f2e] rounded-2xl border border-slate-100 dark:border-[#2a3347] shadow-sm p-6">
      <p class="eyebrow mb-4">Settlements</p>
      <div v-if="!settlements.length" class="py-8 text-center">
        <p class="text-2xl mb-2 select-none">🎉</p>
        <p class="text-sm font-semibold text-slate-700 dark:text-slate-300">All settled up!</p>
        <p class="text-xs text-slate-400 mt-1">Everyone's square — time to enjoy the trip.</p>
      </div>
      <div v-else class="space-y-3">
        <div v-for="s in settlements" :key="`${s.from}-${s.to}`"
          class="flex items-center gap-4 p-3.5 bg-slate-50 dark:bg-[#1e2535] rounded-xl">
          <span class="text-sm font-semibold text-slate-700 dark:text-slate-200 flex-1">{{ friendName(s.from) }}</span>
          <span class="text-xs text-slate-400">owes</span>
          <span class="text-sm font-semibold text-teal-600 dark:text-[#2dd4bf]">${{ fmt(s.amount) }}</span>
          <span class="text-xs text-slate-400">to</span>
          <span class="text-sm font-semibold text-slate-700 dark:text-slate-200 flex-1 text-right">{{ friendName(s.to) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
