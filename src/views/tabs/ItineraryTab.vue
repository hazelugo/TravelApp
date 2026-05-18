<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTripStore } from '@/stores/trips'
import type { EventCategory } from '@/types/domain'

const trip = useTripStore()

const newEvent = ref({ name: '', date: '', time: '', category: 'Activity' as EventCategory, cost: 0, perPerson: false, notes: '', url: '' })

const totalParticipants = computed(() => trip.state.friends.length || trip.state.attendance.adults + trip.state.attendance.kids)

const CAT_COLORS: Record<string, { badge: string; dot: string }> = {
  Transport: { badge: 'bg-blue-100 text-blue-600',    dot: 'bg-blue-100 text-blue-600'    },
  Lodging:   { badge: 'bg-emerald-100 text-emerald-600', dot: 'bg-emerald-100 text-emerald-600' },
  Food:      { badge: 'bg-amber-100 text-amber-600',  dot: 'bg-amber-100 text-amber-600'  },
  Activity:  { badge: 'bg-violet-100 text-violet-600', dot: 'bg-violet-100 text-violet-600' },
}

function fmt(n: number) { return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n) }
function fmtDate(d: string) {
  if (!d) return ''
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function addEvent() {
  if (!newEvent.value.name.trim()) return
  trip.addEvent({ ...newEvent.value, name: newEvent.value.name.trim() })
  newEvent.value = { name: '', date: '', time: '', category: 'Activity', cost: 0, perPerson: false, notes: '', url: '' }
}
function removeEvent(id: string) { trip.removeEvent(id) }
</script>

<template>
  <div class="space-y-5 anim-fade-up">

    <!-- Add event form -->
    <div class="bg-white dark:bg-[#1a1f2e] rounded-2xl border border-slate-100 dark:border-[#2a3347] shadow-sm p-6">
      <h2 class="eyebrow mb-4">Add Event</h2>
      <div class="space-y-3">
        <input v-model="newEvent.name" @keydown.enter="addEvent" type="text" placeholder="What's the plan? e.g. Eiffel Tower visit"
          class="w-full px-3 py-2.5 border border-slate-200 dark:border-[#2a3347] rounded-xl text-sm bg-white dark:bg-[#1e2535] text-slate-700 dark:text-slate-200 placeholder-slate-300 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500" />
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <select v-model="newEvent.category"
            class="px-3 py-2.5 border border-slate-200 dark:border-[#2a3347] rounded-xl text-sm bg-white dark:bg-[#1e2535] text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500">
            <option>Transport</option><option>Lodging</option><option>Food</option><option>Activity</option>
          </select>
          <div class="relative">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
            <input v-model.number="newEvent.cost" type="number" min="0" placeholder="0"
              class="w-full pl-7 pr-3 py-2.5 border border-slate-200 dark:border-[#2a3347] rounded-xl text-sm bg-white dark:bg-[#1e2535] text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          <input v-model="newEvent.date" type="date"
            class="px-3 py-2.5 border border-slate-200 dark:border-[#2a3347] rounded-xl text-sm bg-white dark:bg-[#1e2535] text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500" />
          <input v-model="newEvent.time" type="time"
            class="px-3 py-2.5 border border-slate-200 dark:border-[#2a3347] rounded-xl text-sm bg-white dark:bg-[#1e2535] text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500" />
        </div>
      </div>
      <button @click="addEvent" :disabled="!newEvent.name.trim()"
        class="mt-4 w-full py-2.5 rounded-full text-sm font-semibold text-white disabled:opacity-40 transition-all"
        style="background:#0d9488;box-shadow:0 2px 8px rgba(20,184,166,.35)">
        Add to Itinerary
      </button>
    </div>

    <!-- Event list -->
    <div v-if="!trip.state.events.length" class="rounded-2xl border-2 border-dashed border-slate-200 dark:border-[#2a3347] p-16 text-center">
      <p class="text-4xl mb-3 select-none">🗺️</p>
      <p class="text-sm font-semibold text-slate-600 dark:text-slate-400">Your adventure is waiting</p>
      <p class="text-xs text-slate-400 mt-1">Every great trip begins with a plan.</p>
    </div>

    <div v-else class="relative">
      <div class="absolute left-8 top-0 bottom-0 w-px bg-slate-200 dark:bg-[#2a3347]"></div>
      <div class="space-y-1">
        <div v-for="event in trip.state.events" :key="event.id"
          class="relative flex items-start gap-0 group transition-all select-none py-2">
          <!-- Category dot -->
          <div class="relative flex flex-col items-center shrink-0 z-10 mr-4" style="width:32px">
            <div :class="['w-5 h-5 rounded-full border-2 border-white dark:border-[#0f1117] shadow-sm flex items-center justify-center mt-2.5 shrink-0', CAT_COLORS[event.category]?.dot]">
              <span class="text-[8px] font-bold">{{ event.category[0] }}</span>
            </div>
          </div>
          <!-- Content card -->
          <div class="flex-1 min-w-0 bg-white dark:bg-[#1a1f2e] rounded-2xl border border-slate-100 dark:border-[#2a3347] shadow-sm px-4 py-3.5 hover:border-slate-200 hover:shadow-md transition-all">
            <div class="flex items-start gap-2">
              <div class="flex-1 min-w-0">
                <p class="font-semibold text-slate-800 dark:text-slate-100 text-base leading-snug truncate">{{ event.name }}</p>
                <div class="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span v-if="event.date" class="text-xs text-slate-400">{{ fmtDate(event.date) }}<span v-if="event.time" class="text-slate-300"> · </span><span v-if="event.time">{{ event.time }}</span></span>
                  <span :class="['text-[11px] px-2 py-0.5 rounded-full font-semibold', CAT_COLORS[event.category]?.badge]">{{ event.category }}</span>
                  <span v-if="event.perPerson" class="text-[11px] bg-slate-100 dark:bg-[#1e2535] text-slate-500 px-2 py-0.5 rounded-full">Per person</span>
                </div>
                <p v-if="event.notes" class="text-xs text-slate-400 mt-2 leading-relaxed pl-3 border-l-2 border-slate-100 dark:border-[#2a3347] line-clamp-2">{{ event.notes }}</p>
              </div>
              <div class="text-right shrink-0 ml-2">
                <p class="font-bold text-slate-700 dark:text-slate-300 text-sm">${{ fmt(event.perPerson ? event.cost * totalParticipants : event.cost) }}</p>
                <p v-if="event.perPerson && totalParticipants > 1" class="text-[11px] text-slate-400 mt-0.5">${{ fmt(event.cost) }}/pp</p>
              </div>
              <!-- Actions -->
              <div class="flex flex-col gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-all">
                <a :href="`https://maps.google.com/?q=${encodeURIComponent(event.name)}`" target="_blank" rel="noopener"
                  class="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                </a>
                <button @click="removeEvent(event.id)"
                  class="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
