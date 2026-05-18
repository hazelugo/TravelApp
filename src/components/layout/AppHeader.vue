<script setup lang="ts">
import { ref } from 'vue'
import { useUIStore } from '@/stores/ui'

const props = defineProps<{
  currentTab: string
  syncStatus: 'idle' | 'saving' | 'saved' | 'error'
}>()
const emit = defineEmits<{ (e: 'copy-link'): void }>()

const ui = useUIStore()
const linkCopied = ref(false)

const TAB_META: Record<string, { label: string; desc: string }> = {
  overview:   { label: 'Overview',  desc: 'Trip summary and totals' },
  attendance: { label: 'Group',     desc: "Who's coming" },
  itinerary:  { label: 'Itinerary', desc: 'Events and activities' },
  analytics:  { label: 'Spending',  desc: 'Where your money is going' },
  splitter:   { label: 'Splitter',  desc: 'Settle who owes what' },
  photos:     { label: 'Photos',    desc: 'Trip photo wall' },
}
const meta = () => TAB_META[props.currentTab] ?? TAB_META.overview

function copyLink() {
  navigator.clipboard.writeText(window.location.href).catch(() => {})
  linkCopied.value = true
  emit('copy-link')
  setTimeout(() => { linkCopied.value = false }, 1600)
}

const syncLabel: Record<string, string> = {
  saving: 'Saving…', saved: 'Saved', error: 'Error', idle: 'Saved'
}
const syncClass: Record<string, string> = {
  saving: 'bg-amber-50 text-amber-700',
  saved:  'bg-emerald-50 text-emerald-700',
  error:  'bg-rose-50 text-rose-600',
  idle:   'bg-emerald-50 text-emerald-700',
}
const syncDot: Record<string, string> = {
  saving: 'bg-amber-400 animate-pulse',
  saved:  'bg-emerald-500',
  error:  'bg-rose-500',
  idle:   'bg-emerald-500',
}
</script>

<template>
  <header class="bg-white dark:bg-[#1a1f2e] border-b border-slate-100 dark:border-[#2a3347] px-6 py-4 flex items-center justify-between shrink-0 gap-4">
    <div class="min-w-0">
      <h1 class="text-base font-semibold text-slate-900 dark:text-slate-100">{{ meta().label }}</h1>
      <p class="text-xs text-slate-400 mt-0.5">{{ meta().desc }}</p>
    </div>

    <div class="hidden lg:flex items-center gap-2 shrink-0">
      <!-- Sync pill -->
      <div :class="['flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors', syncClass[syncStatus]]">
        <span :class="['w-1.5 h-1.5 rounded-full', syncDot[syncStatus]]"></span>
        {{ syncLabel[syncStatus] }}
      </div>

      <!-- Copy link -->
      <button @click="copyLink" :aria-label="linkCopied ? 'Copied!' : 'Copy share link'"
        :class="['w-8 h-8 flex items-center justify-center rounded-lg transition-all', linkCopied ? 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-[#1e2535]' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-[#1e2535]']">
        <svg v-if="!linkCopied" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
        <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </button>

      <!-- Theme toggle -->
      <button @click="ui.toggleDark()" :aria-label="ui.darkMode ? 'Light mode' : 'Dark mode'"
        class="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#1e2535] transition-all">
        <svg v-if="ui.darkMode" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
        <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
      </button>
    </div>
  </header>
</template>
