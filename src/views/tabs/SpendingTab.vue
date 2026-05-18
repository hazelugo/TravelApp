<script setup lang="ts">
import { computed, ref } from 'vue'
import { useTripStore } from '@/stores/trips'

const trip = useTripStore()
const totalParticipants = computed(() => trip.state.friends.length || trip.state.attendance.adults + trip.state.attendance.kids)

const CATS = [
  { key: 'Transport', color: '#60a5fa', light: '#dbeafe', text: 'text-blue-600'    },
  { key: 'Lodging',   color: '#34d399', light: '#d1fae5', text: 'text-emerald-600' },
  { key: 'Food',      color: '#fbbf24', light: '#fef3c7', text: 'text-amber-600'   },
  { key: 'Activity',  color: '#a78bfa', light: '#ede9fe', text: 'text-violet-600'  },
]

const breakdown = computed(() => CATS.map(c => {
  const inCat = trip.state.events.filter(e => e.category === c.key)
  const total = inCat.reduce((s, e) => s + (e.perPerson ? e.cost * totalParticipants.value : e.cost), 0)
  return { ...c, total, count: inCat.length }
}))

const grand = computed(() => breakdown.value.reduce((s, b) => s + b.total, 0))
const activeSlice = ref<string | null>(null)

function fmt(n: number) { return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n) }
function pct(n: number) { return grand.value > 0 ? Math.round(n / grand.value * 100) : 0 }

// Donut chart — r=80, circumference = 2π×80 ≈ 502.65
const R = 80
const CIRC = 2 * Math.PI * R
const GAP = 3 // gap between slices in px

const slices = computed(() => {
  let offset = -CIRC / 4 // start at 12 o'clock
  return breakdown.value
    .filter(b => b.total > 0)
    .map(b => {
      const fraction = b.total / grand.value
      const dash = Math.max(0, fraction * CIRC - GAP)
      const slice = { ...b, dash, gap: CIRC - dash, offset }
      offset += fraction * CIRC
      return slice
    })
})

const hoveredSlice = computed(() =>
  activeSlice.value ? breakdown.value.find(b => b.key === activeSlice.value) ?? null : null
)
</script>

<template>
  <div class="space-y-5 anim-fade-up">
    <div v-if="!grand" class="rounded-2xl border-2 border-dashed border-slate-200 dark:border-[#2a3347] p-16 text-center">
      <p class="text-4xl mb-3 select-none">💸</p>
      <p class="text-sm font-semibold text-slate-600 dark:text-slate-400">No spending data yet</p>
      <p class="text-xs text-slate-400 mt-1">Add events in the Itinerary tab to see breakdowns here.</p>
    </div>

    <div v-else class="bg-white dark:bg-[#1a1f2e] rounded-2xl border border-slate-100 dark:border-[#2a3347] shadow-sm p-6">
      <div class="flex items-baseline justify-between mb-6">
        <p class="eyebrow">Spending breakdown</p>
        <span class="text-xs text-slate-400">{{ trip.state.events.length }} events</span>
      </div>

      <!-- Donut + legend row -->
      <div class="flex flex-col sm:flex-row items-center gap-8">

        <!-- Donut chart -->
        <div class="relative shrink-0" style="width:200px;height:200px">
          <svg width="200" height="200" viewBox="0 0 200 200">
            <!-- Background ring -->
            <circle cx="100" cy="100" :r="R" fill="none"
              class="stroke-slate-100 dark:stroke-[#253047]" stroke-width="28" />
            <!-- Slices -->
            <circle v-for="s in slices" :key="s.key"
              cx="100" cy="100" :r="R" fill="none"
              :stroke="s.color"
              :stroke-width="activeSlice === s.key ? 32 : 28"
              :stroke-dasharray="`${s.dash} ${s.gap}`"
              :stroke-dashoffset="-s.offset"
              stroke-linecap="round"
              style="transition:stroke-width 0.15s,opacity 0.15s"
              :style="{
                strokeDasharray: `${s.dash} ${s.gap}`,
                strokeDashoffset: String(-s.offset),
                opacity: activeSlice && activeSlice !== s.key ? 0.35 : 1,
              }"
              @mouseenter="activeSlice = s.key"
              @mouseleave="activeSlice = null"
              class="cursor-pointer"
            />
          </svg>
          <!-- Centre label -->
          <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <template v-if="hoveredSlice">
              <p class="text-lg font-black text-slate-800 dark:text-slate-100 leading-none">${{ fmt(hoveredSlice.total) }}</p>
              <p class="text-xs text-slate-400 mt-1">{{ hoveredSlice.key }}</p>
              <p class="text-xs font-bold mt-0.5" :style="`color:${hoveredSlice.color}`">{{ pct(hoveredSlice.total) }}%</p>
            </template>
            <template v-else>
              <p class="text-2xl font-black text-slate-800 dark:text-slate-100 leading-none">${{ fmt(grand) }}</p>
              <p class="text-xs text-slate-400 mt-1">total</p>
            </template>
          </div>
        </div>

        <!-- Legend -->
        <div class="flex-1 w-full space-y-3">
          <div v-for="b in breakdown.filter(b => b.total > 0)" :key="b.key"
            class="flex items-center gap-3 cursor-pointer rounded-xl px-3 py-2.5 transition-colors"
            :class="activeSlice === b.key ? 'bg-slate-50 dark:bg-[#1e2535]' : 'hover:bg-slate-50 dark:hover:bg-[#1e2535]'"
            @mouseenter="activeSlice = b.key"
            @mouseleave="activeSlice = null">
            <!-- Color dot -->
            <span class="w-3 h-3 rounded-full shrink-0" :style="`background:${b.color}`"></span>
            <!-- Label + count -->
            <span class="text-sm font-medium text-slate-700 dark:text-slate-300 flex-1">{{ b.key }}</span>
            <span class="text-xs text-slate-400">{{ b.count }} event{{ b.count !== 1 ? 's' : '' }}</span>
            <!-- Pct + amount -->
            <div class="text-right">
              <span class="text-sm font-bold text-slate-700 dark:text-slate-200">${{ fmt(b.total) }}</span>
              <span class="text-xs text-slate-400 ml-1.5">{{ pct(b.total) }}%</span>
            </div>
          </div>

          <!-- Zero categories dimmed -->
          <div v-for="b in breakdown.filter(b => b.total === 0)" :key="b.key + '-zero'"
            class="flex items-center gap-3 px-3 py-2 opacity-30">
            <span class="w-3 h-3 rounded-full shrink-0 bg-slate-200 dark:bg-slate-600"></span>
            <span class="text-sm text-slate-400 flex-1">{{ b.key }}</span>
            <span class="text-xs text-slate-300">—</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
