<script setup lang="ts">
import { computed } from 'vue'
import { useTripStore } from '@/stores/trips'
import { useUIStore } from '@/stores/ui'

const props = defineProps<{
  currentTab: string
}>()
const emit = defineEmits<{ (e: 'tab', id: string): void }>()

const trip = useTripStore()
const ui = useUIStore()

const tabs = [
  { id: 'overview',   label: 'Overview',  icon: 'i-overview'  },
  { id: 'attendance', label: 'Group',     icon: 'i-group'     },
  { id: 'itinerary',  label: 'Itinerary', icon: 'i-itinerary' },
  { id: 'analytics',  label: 'Spending',  icon: 'i-spending'  },
  { id: 'splitter',   label: 'Splitter',  icon: 'i-splitter'  },
  { id: 'photos',     label: 'Photos',    icon: 'i-photos'    },
]

const daysUntil = computed(() => {
  if (!trip.state.trip.startDate) return null
  const diff = Math.ceil((new Date(trip.state.trip.startDate).getTime() - Date.now()) / 86400000)
  return diff
})
</script>

<template>
  <aside class="hidden lg:flex flex-col w-60 bg-white dark:bg-[#1a1f2e] border-r border-slate-100 dark:border-[#2a3347] shrink-0 overflow-y-auto">

    <!-- Planis wordmark -->
    <div class="px-5 pt-6 pb-5 border-b border-slate-100 dark:border-[#2a3347]">
      <div class="flex flex-col gap-1">
        <!-- Custom wordmark: Plan + ı (with teal pin-dot) + s -->
        <span class="flex items-baseline" style="font-family:'Inter',sans-serif;font-weight:800;font-size:28px;letter-spacing:-0.05em;color:#0f172a;line-height:1" :style="ui.darkMode ? 'color:#f1f5f9' : ''">
          Plan
          <span class="relative inline-block">
            <!-- dotless ı -->
            <span style="font-variant-ligatures:none">ı</span>
            <!-- teal pin replaces the dot -->
            <svg viewBox="0 0 20 26" style="position:absolute;left:53.5%;bottom:0.60em;transform:translateX(-50%);width:0.30em;height:0.36em;overflow:visible" aria-hidden="true">
              <path d="M10 0 C15.5 0 20 4.3 20 9.6 C20 15.3 12.3 23 10 26 C7.7 23 0 15.3 0 9.6 C0 4.3 4.5 0 10 0 Z" fill="#0d9488"/>
              <circle cx="10" cy="9.4" r="3.6" fill="#fff"/>
            </svg>
          </span>
          s
        </span>
        <p class="text-xs text-slate-400 truncate max-w-[180px]">{{ trip.state.trip.destination || 'Plan & Budget' }}</p>
      </div>
    </div>

    <!-- Tab navigation -->
    <nav class="flex-1 px-3 py-4 space-y-0.5" aria-label="Navigation">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        @click="emit('tab', tab.id)"
        :aria-current="currentTab === tab.id ? 'page' : undefined"
        :class="[
          'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 text-left',
          currentTab === tab.id
            ? 'bg-teal-50 dark:bg-[#1e2535] text-teal-700 dark:text-[#2dd4bf]'
            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1e2535] hover:text-slate-700 dark:hover:text-slate-200'
        ]"
      >
        <span class="shrink-0 w-[17px] h-[17px]" :class="currentTab === tab.id ? 'text-teal-600 dark:text-[#2dd4bf]' : 'text-slate-400 dark:text-slate-500'">
          <svg width="17" height="17" aria-hidden="true"><use :href="`/icons.svg#${tab.icon}`"/></svg>
        </span>
        {{ tab.label }}
      </button>
    </nav>

    <!-- Countdown widget -->
    <div v-if="daysUntil !== null && daysUntil > 0" class="m-3 p-4 rounded-2xl bg-teal-50 dark:bg-[#1e2535] border border-teal-100 dark:border-[#2a3347]">
      <p class="text-[10px] text-teal-500 font-bold uppercase tracking-widest">Departing in</p>
      <p class="text-3xl font-extrabold text-teal-700 dark:text-[#2dd4bf] mt-0.5 leading-none">
        {{ daysUntil }}<span class="text-base font-normal ml-1 text-teal-600 dark:text-teal-400">days</span>
      </p>
      <p class="text-xs text-slate-400 mt-2 truncate">{{ trip.state.trip.destination }}</p>
    </div>
    <div v-else-if="daysUntil === 0" class="m-3 p-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
      <p class="text-[10px] font-bold uppercase tracking-widest opacity-70">It's today!</p>
      <p class="text-lg font-black mt-0.5 anim-bounce inline-block">🎉</p>
      <p class="text-sm font-semibold mt-1">Have an amazing trip!</p>
    </div>
  </aside>
</template>
