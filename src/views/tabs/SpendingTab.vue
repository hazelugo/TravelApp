<script setup lang="ts">
import { computed } from 'vue'
import { useTripStore } from '@/stores/trips'

const trip = useTripStore()
const totalParticipants = computed(() => trip.state.friends.length || trip.state.attendance.adults + trip.state.attendance.kids)

const CATS = [
  { key: 'Transport', bar: 'bg-blue-400',    badge: 'bg-blue-100 text-blue-600' },
  { key: 'Lodging',   bar: 'bg-emerald-400', badge: 'bg-emerald-100 text-emerald-600' },
  { key: 'Food',      bar: 'bg-amber-400',   badge: 'bg-amber-100 text-amber-600' },
  { key: 'Activity',  bar: 'bg-violet-400',  badge: 'bg-violet-100 text-violet-600' },
]

const breakdown = computed(() => CATS.map(c => {
  const inCat = trip.state.events.filter(e => e.category === c.key)
  const total = inCat.reduce((s, e) => s + (e.perPerson ? e.cost * totalParticipants.value : e.cost), 0)
  return { ...c, total, count: inCat.length }
}))

const grand = computed(() => breakdown.value.reduce((s, b) => s + b.total, 0))
const maxCat = computed(() => Math.max(...breakdown.value.map(b => b.total), 1))
function fmt(n: number) { return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n) }
</script>

<template>
  <div class="space-y-5 anim-fade-up">
    <div v-if="!grand" class="rounded-2xl border-2 border-dashed border-slate-200 dark:border-[#2a3347] p-16 text-center">
      <p class="text-4xl mb-3 select-none">💸</p>
      <p class="text-sm font-semibold text-slate-600 dark:text-slate-400">No spending data yet</p>
      <p class="text-xs text-slate-400 mt-1">Add events in the Itinerary tab to see breakdowns here.</p>
    </div>

    <div v-else class="bg-white dark:bg-[#1a1f2e] rounded-2xl border border-slate-100 dark:border-[#2a3347] shadow-sm p-6">
      <div class="flex items-baseline justify-between mb-1">
        <p class="eyebrow">Total spending</p>
        <span class="text-xs text-slate-400">{{ trip.state.events.length }} events</span>
      </div>
      <p class="text-4xl font-black text-slate-800 dark:text-slate-100 mt-2 leading-none">${{ fmt(grand) }}</p>

      <div class="mt-6 space-y-4">
        <div v-for="b in breakdown" :key="b.key">
          <div class="flex items-baseline justify-between mb-1.5">
            <div class="flex items-center gap-2">
              <span :class="['w-2.5 h-2.5 rounded-full', b.bar]"></span>
              <span class="text-sm font-medium text-slate-700 dark:text-slate-300">{{ b.key }}</span>
              <span class="text-xs text-slate-400">· {{ b.count }}</span>
            </div>
            <span class="text-sm font-semibold text-slate-700 dark:text-slate-300">${{ fmt(b.total) }}</span>
          </div>
          <div class="h-2 bg-slate-100 dark:bg-[#253047] rounded-full overflow-hidden">
            <div :class="['h-full rounded-full', b.bar]"
              :style="`width:${(b.total / maxCat) * 100}%;transition:width .7s cubic-bezier(0.25,1,0.5,1)`" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
