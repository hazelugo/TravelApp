<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useTripStore } from '@/stores/trips'

const trip = useTripStore()

// ── Weather ──────────────────────────────────────────────────────────────
interface WeatherDay { date: string; code: number; high: number; low: number; sunrise: string; sunset: string }
const weather = ref<WeatherDay[]>([])
const weatherLoading = ref(false)
const weatherError = ref('')

const WMO: Record<number, string> = {
  0:'Clear sky',1:'Mainly clear',2:'Partly cloudy',3:'Overcast',
  45:'Foggy',48:'Foggy',51:'Light drizzle',53:'Drizzle',55:'Heavy drizzle',
  61:'Light rain',63:'Rain',65:'Heavy rain',71:'Light snow',73:'Snow',75:'Heavy snow',
  80:'Showers',81:'Rain showers',82:'Heavy showers',95:'Thunderstorm',96:'Thunderstorm',99:'Thunderstorm',
}
function weatherEmoji(code: number) {
  if (code <= 1) return '☀️'; if (code <= 3) return '⛅'; if (code <= 48) return '🌫️'
  if (code <= 67) return '🌧️'; if (code <= 77) return '❄️'; if (code <= 82) return '🌦️'; return '⛈️'
}
function fmtTime(iso: string) {
  if (!iso) return ''
  const timePart = iso.includes('T') ? iso.split('T')[1] : iso
  const [h, m] = timePart.split(':').map(Number)
  const d = new Date(); d.setHours(h, m, 0, 0)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}
function fmtWeatherDate(d: string) {
  if (!d) return ''
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

async function fetchWeather() {
  if (!trip.state.trip.destination) { weather.value = []; return }
  weatherLoading.value = true; weatherError.value = ''
  try {
    const fallbackName = trip.state.trip.destination.split(',')[0].trim()
    const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(fallbackName)}&count=1&language=en&format=json`)
    const geoData = await geoRes.json()
    if (!geoData.results?.length) { weatherError.value = 'Location not found'; weatherLoading.value = false; return }
    const { latitude: lat, longitude: lon } = geoData.results[0]
    const today = new Date().toISOString().slice(0, 10)
    const maxEnd = new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10)
    const tripStart = trip.state.trip.startDate && trip.state.trip.startDate >= today ? trip.state.trip.startDate : today
    if (tripStart > maxEnd) { weather.value = []; weatherError.value = 'Forecast not available yet — check back closer to your trip.'; weatherLoading.value = false; return }
    const start = tripStart
    const endRaw = trip.state.trip.endDate || start
    const end = endRaw > maxEnd ? maxEnd : (endRaw < start ? start : endRaw)
    const wData = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset&timezone=auto&start_date=${start}&end_date=${end}`).then(r => r.json())
    if (wData.error) { weatherError.value = wData.reason || 'Could not load weather' }
    else if (wData.daily) {
      weather.value = wData.daily.time.map((date: string, i: number) => ({
        date, code: (wData.daily.weather_code ?? wData.daily.weathercode)[i],
        high: Math.round(wData.daily.temperature_2m_max[i]), low: Math.round(wData.daily.temperature_2m_min[i]),
        sunrise: wData.daily.sunrise[i], sunset: wData.daily.sunset[i],
      }))
    }
  } catch { weatherError.value = 'Could not load weather' }
  weatherLoading.value = false
}

let weatherTimer: ReturnType<typeof setTimeout> | undefined
watch(() => [trip.state.trip.destination, trip.state.trip.startDate, trip.state.trip.endDate], () => {
  clearTimeout(weatherTimer)
  weatherTimer = setTimeout(fetchWeather, 900)
}, { immediate: true })

// When start date is set, default end date to same day if end is empty or before start
watch(() => trip.state.trip.startDate, (start) => {
  if (start && (!trip.state.trip.endDate || trip.state.trip.endDate < start)) {
    trip.state.trip.endDate = start
  }
})

const totalParticipants = computed(() => trip.state.friends.length || trip.state.attendance.adults + trip.state.attendance.kids)

const totalEventCost = computed(() =>
  trip.state.events.reduce((s, e) => s + (e.perPerson ? e.cost * totalParticipants.value : e.cost), 0)
)

const perPerson = computed(() =>
  totalParticipants.value > 0 ? totalEventCost.value / totalParticipants.value : 0
)

const budgetUsed = computed(() =>
  trip.state.budget > 0 ? Math.min(100, Math.round((totalEventCost.value / trip.state.budget) * 100)) : 0
)

const daysUntil = computed(() => {
  if (!trip.state.trip.startDate) return null
  return Math.ceil((new Date(trip.state.trip.startDate).getTime() - Date.now()) / 86400000)
})

const tripDuration = computed(() => {
  if (!trip.state.trip.startDate || !trip.state.trip.endDate) return 0
  return Math.ceil((new Date(trip.state.trip.endDate).getTime() - new Date(trip.state.trip.startDate).getTime()) / 86400000)
})

const destEditing = ref(false)
function startDestEdit() {
  destEditing.value = true
  setTimeout(() => (document.getElementById('dest-input') as HTMLInputElement)?.focus(), 0)
}

const AVATAR_COLORS = ['#6366f1', '#14b8a6', '#f59e0b', '#10b981', '#8b5cf6']
const initial = (n: string) => n.trim().charAt(0).toUpperCase()

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n)
}

function fmtDate(d: string) {
  if (!d) return ''
  const dt = new Date(d + 'T00:00:00')
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
</script>

<template>
  <div class="space-y-5 anim-fade-up">

    <!-- Welcome banner (empty state) -->
    <div v-if="!trip.state.trip.destination && !trip.state.events.length && !trip.state.friends.length"
      class="bg-gradient-to-r from-teal-50 via-cyan-50 to-teal-50 border border-teal-100 rounded-2xl p-6 flex items-center gap-5 overflow-hidden">
      <span class="text-4xl select-none anim-float shrink-0">✈️</span>
      <div>
        <p class="font-bold text-teal-800 dark:text-teal-300 text-base">Your next adventure starts here.</p>
        <p class="text-sm text-teal-600 dark:text-teal-400 mt-1 leading-relaxed">
          Type your destination below, add dates and a budget, then share the link — your whole group can plan and split costs together.
        </p>
      </div>
    </div>

    <!-- Hero row: trip header + summary card -->
    <div class="grid grid-cols-1 lg:grid-cols-5 gap-5">

      <!-- Trip header (3 cols) -->
      <div class="lg:col-span-3 bg-white dark:bg-[#1a1f2e] rounded-2xl border border-slate-100 dark:border-[#2a3347] shadow-sm p-7 space-y-5">
        <!-- Destination: click-to-edit -->
        <div>
          <button v-if="!destEditing" @click="startDestEdit"
            class="w-full text-left group flex items-center gap-2 min-w-0">
            <span class="truncate block" :class="trip.state.trip.destination ? 'text-slate-900 dark:text-slate-100' : 'text-slate-300 dark:text-slate-600'"
              style="font-size:1.75rem;font-weight:700;line-height:1.2;letter-spacing:-0.01em">
              {{ trip.state.trip.destination || 'Where are you going?' }}
            </span>
            <svg class="shrink-0 opacity-0 group-hover:opacity-40 transition-opacity text-slate-400 mt-1" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <input v-else id="dest-input" v-model="trip.state.trip.destination" type="text"
            placeholder="Where are you going?"
            @blur="destEditing = false"
            @keydown.enter="destEditing = false"
            @keydown.escape="destEditing = false"
            class="w-full bg-transparent border-none border-b-2 border-teal-400 outline-none pb-1 text-slate-900 dark:text-slate-100 placeholder-slate-300 dark:placeholder-slate-600"
            style="font-size:1.75rem;font-weight:700;line-height:1.2;letter-spacing:-0.01em" />
        </div>

        <!-- Dates row -->
        <div class="flex items-center gap-3">
          <div class="flex-1 min-w-0">
            <p class="eyebrow mb-1">From</p>
            <input v-model="trip.state.trip.startDate" type="date"
              class="w-full bg-transparent border-b border-slate-200 dark:border-slate-600 pb-1 text-sm text-slate-600 dark:text-slate-400 focus:outline-none focus:border-teal-400" />
          </div>
          <span class="text-slate-300 text-lg font-light mt-4 shrink-0">→</span>
          <div class="flex-1 min-w-0">
            <p class="eyebrow mb-1">To</p>
            <input v-model="trip.state.trip.endDate" type="date"
              class="w-full bg-transparent border-b border-slate-200 dark:border-slate-600 pb-1 text-sm text-slate-600 dark:text-slate-400 focus:outline-none focus:border-teal-400" />
          </div>
        </div>

        <!-- Duration + budget -->
        <div class="flex items-center gap-3 pt-1 border-t border-slate-100 dark:border-[#2a3347]">
          <div class="flex items-center gap-1.5 shrink-0">
            <span v-if="tripDuration > 0" class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              {{ tripDuration }} days
            </span>
            <span v-if="daysUntil !== null && daysUntil > 0" class="text-xs text-slate-400">· {{ daysUntil }} to go</span>
            <span v-else-if="daysUntil === 0" class="text-xs text-teal-600 dark:text-teal-400 font-semibold">· 🎉 Today!</span>
            <span v-else-if="!tripDuration" class="text-xs text-slate-300 italic">Set dates to see duration</span>
          </div>
          <div class="ml-auto flex items-center gap-2 shrink-0">
            <span class="eyebrow">Budget</span>
            <span class="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {{ trip.state.budget ? '$' + fmt(trip.state.budget) : '—' }}
            </span>
          </div>
        </div>
      </div>

      <!-- Teal hero summary card (2 cols) -->
      <div v-if="totalEventCost > 0 || trip.state.trip.startDate"
        class="lg:col-span-2 rounded-2xl p-6 text-white flex flex-col"
        style="background:linear-gradient(135deg,#14b8a6 0%,#0d9488 50%,#0f766e 100%);box-shadow:0 20px 25px -5px rgba(0,0,0,.08),0 10px 25px -8px rgba(20,184,166,.45)">
        <!-- Cost hero -->
        <div>
          <p class="text-white/60 text-[10px] font-bold uppercase tracking-widest">Total Trip Cost</p>
          <div class="flex items-end gap-3 mt-1.5">
            <p class="cost-hero-number text-white leading-none">${{ fmt(totalEventCost) }}</p>
            <span v-if="perPerson > 0" class="mb-1.5 px-2.5 py-1 rounded-full bg-white/20 text-white text-xs font-bold whitespace-nowrap">
              ${{ fmt(perPerson) }} pp
            </span>
          </div>
        </div>

        <!-- Breakdown -->
        <div class="mt-auto pt-5 space-y-2">
          <div class="flex justify-between items-center text-xs text-white/70">
            <span>{{ totalParticipants }} traveler{{ totalParticipants !== 1 ? 's' : '' }}</span>
            <span class="font-semibold text-white/90">{{ trip.state.events.length }} event{{ trip.state.events.length !== 1 ? 's' : '' }}</span>
          </div>

          <!-- Budget progress -->
          <div v-if="trip.state.budget > 0" class="pt-3">
            <div class="flex justify-between text-[10px] text-white/60 mb-2 uppercase tracking-wider font-semibold">
              <span>Budget used</span>
              <span>{{ budgetUsed }}%</span>
            </div>
            <div class="h-2.5 bg-white/20 rounded-full overflow-hidden">
              <div class="h-full rounded-full transition-all duration-700"
                :class="totalEventCost > trip.state.budget ? 'bg-rose-400' : 'bg-white'"
                :style="`width:${budgetUsed}%`" />
            </div>
            <p v-if="totalEventCost > trip.state.budget" class="text-xs text-rose-300 mt-1.5 font-medium">
              ${{ fmt(totalEventCost - trip.state.budget) }} over budget
            </p>
          </div>
        </div>
      </div>

      <!-- Empty summary placeholder -->
      <div v-else class="lg:col-span-2 rounded-2xl border-2 border-dashed border-slate-200 dark:border-[#2a3347] p-6 flex flex-col items-center justify-center text-center gap-3">
        <p class="text-4xl">🗺️</p>
        <p class="text-sm font-semibold text-slate-600 dark:text-slate-400">Your trip summary will appear here</p>
        <p class="text-xs text-slate-400 leading-relaxed">Add your destination and dates<br>to get started</p>
      </div>
    </div>

    <!-- Stats strip -->
    <div v-if="trip.state.trip.destination || trip.state.friends.length || trip.state.events.length || tripDuration > 0"
      class="bg-white dark:bg-[#1a1f2e] rounded-2xl border border-slate-100 dark:border-[#2a3347] shadow-sm divide-x divide-slate-100 dark:divide-[#2a3347] grid grid-cols-2 lg:grid-cols-4 overflow-hidden">

      <!-- Travelers -->
      <div class="px-5 py-4 flex flex-col gap-1.5">
        <p class="eyebrow">Travelers</p>
        <p class="text-2xl font-black text-slate-800 dark:text-slate-100 leading-none">{{ totalParticipants || '—' }}</p>
        <div v-if="trip.state.friends.length" class="flex -space-x-1.5 mt-0.5">
          <span v-for="(f, i) in trip.state.friends.slice(0, 5)" :key="f.id"
            class="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white ring-1 ring-white dark:ring-[#1a1f2e]"
            :style="`background:${AVATAR_COLORS[i % 5]}`">
            {{ initial(f.name) }}
          </span>
          <span v-if="trip.state.friends.length > 5"
            class="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-[9px] font-bold text-slate-500 ring-1 ring-white dark:ring-[#1a1f2e]">
            +{{ trip.state.friends.length - 5 }}
          </span>
        </div>
        <p v-else class="text-xs text-slate-400">No travelers yet</p>
      </div>

      <!-- Duration -->
      <div class="px-5 py-4 flex flex-col gap-1.5">
        <p class="eyebrow">Duration</p>
        <p class="text-2xl font-black text-slate-800 dark:text-slate-100 leading-none">{{ tripDuration || '—' }}</p>
        <p class="text-xs text-slate-400">{{ tripDuration > 0 ? 'days' : 'Set dates above' }}</p>
      </div>

      <!-- Events -->
      <div class="px-5 py-4 flex flex-col gap-1.5">
        <p class="eyebrow">Events</p>
        <p class="text-2xl font-black text-slate-800 dark:text-slate-100 leading-none">{{ trip.state.events.length || '—' }}</p>
        <p class="text-xs text-slate-400">{{ trip.state.events.length ? 'in itinerary' : 'Nothing planned yet' }}</p>
      </div>

      <!-- Per person -->
      <div class="px-5 py-4 flex flex-col gap-1.5">
        <p class="eyebrow">Per Person</p>
        <p class="text-2xl font-black leading-none" :class="perPerson > 0 ? 'text-slate-800 dark:text-slate-100' : 'text-slate-300 dark:text-slate-600'">
          ${{ perPerson > 0 ? fmt(perPerson) : '0' }}
        </p>
        <p class="text-xs text-slate-400">{{ perPerson > 0 ? 'avg each' : 'Add costs to calculate' }}</p>
      </div>
    </div>

    <!-- Weather widget -->
    <div v-if="trip.state.trip.destination" class="bg-white dark:bg-[#1a1f2e] rounded-2xl border border-slate-100 dark:border-[#2a3347] shadow-sm px-6 pt-5 pb-6">
      <div class="flex items-center justify-between mb-5">
        <div>
          <h2 class="eyebrow">Weather Forecast</h2>
          <p class="text-sm font-medium text-slate-700 dark:text-slate-300 mt-0.5 truncate max-w-[220px]">{{ trip.state.trip.destination }}</p>
        </div>
        <span class="text-xl">🌍</span>
      </div>
      <div v-if="weatherLoading" class="flex items-center gap-2 text-slate-400 text-sm py-2">
        <svg class="animate-spin shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
        Loading weather…
      </div>
      <p v-else-if="weatherError" class="text-sm text-rose-500">{{ weatherError }}</p>
      <div v-else-if="weather.length" class="overflow-x-auto -mx-2 px-2 pb-1">
        <div class="flex gap-2.5" style="min-width:max-content">
          <div v-for="day in weather" :key="day.date"
            class="flex flex-col items-center gap-1.5 px-3.5 py-3 bg-slate-50 dark:bg-[#1e2535] rounded-2xl min-w-[76px]">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{{ fmtWeatherDate(day.date) }}</p>
            <span class="text-3xl leading-none">{{ weatherEmoji(day.code) }}</span>
            <p class="text-[10px] text-slate-400 text-center leading-snug">{{ WMO[day.code] || '' }}</p>
            <div class="flex items-center gap-1.5 mt-0.5">
              <span class="text-sm font-bold text-rose-500">{{ day.high }}°</span>
              <span class="text-slate-300">/</span>
              <span class="text-xs text-blue-400">{{ day.low }}°</span>
            </div>
            <div class="flex items-center gap-1 text-[10px] text-amber-500 font-medium">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              {{ fmtTime(day.sunrise) }}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="ml-1 text-indigo-400"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              {{ fmtTime(day.sunset) }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
