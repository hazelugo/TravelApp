<script setup lang="ts">
import { ref } from 'vue'
import { useTripStore } from '@/stores/trips'

const trip = useTripStore()
const newName = ref('')
const AVATAR_COLORS = ['#6366f1', '#14b8a6', '#f59e0b', '#10b981', '#8b5cf6']
const initial = (n: string) => n.trim().charAt(0).toUpperCase()

function add() {
  const name = newName.value.trim()
  if (!name) return
  trip.addFriend(name)
  newName.value = ''
}
function remove(id: string) { trip.removeFriend(id) }
</script>

<template>
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-5 anim-fade-up">
    <!-- Names roster -->
    <div class="lg:col-span-2 bg-white dark:bg-[#1a1f2e] rounded-2xl border border-slate-100 dark:border-[#2a3347] shadow-sm p-6">
      <h2 class="eyebrow mb-5">Names</h2>
      <div class="flex gap-2 mb-4">
        <input v-model="newName" @keydown.enter="add" type="text" placeholder="Add a name…" maxlength="50"
          class="flex-1 px-3 py-2.5 border border-slate-200 dark:border-[#2a3347] rounded-xl text-sm bg-white dark:bg-[#1e2535] text-slate-700 dark:text-slate-200 placeholder-slate-300 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500" />
        <button @click="add" :disabled="!newName.trim()"
          class="px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-all"
          style="background:#0d9488">Add</button>
      </div>
      <div v-if="!trip.state.friends.length" class="py-8 text-center">
        <p class="text-4xl mb-3 select-none">👥</p>
        <p class="text-sm font-medium text-slate-600 dark:text-slate-400">Add your crew to get started</p>
        <p class="text-xs text-slate-400 mt-1">Names show up on the Splitter so everyone gets credited</p>
      </div>
      <ul v-else class="space-y-1">
        <li v-for="(f, i) in trip.state.friends" :key="f.id"
          class="group flex items-center gap-3 px-2.5 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-[#1e2535] transition-colors">
          <span class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
            :style="`background:${AVATAR_COLORS[i % 5]}`">{{ initial(f.name) }}</span>
          <span class="text-sm font-medium text-slate-700 dark:text-slate-200 flex-1 truncate">{{ f.name }}</span>
          <button @click="remove(f.id)"
            class="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all"
            aria-label="Remove">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </li>
      </ul>
    </div>

    <!-- Headcount card -->
    <div class="bg-white dark:bg-[#1a1f2e] rounded-2xl border border-slate-100 dark:border-[#2a3347] shadow-sm p-5">
      <h2 class="eyebrow">Headcount</h2>
      <p class="text-4xl font-black text-slate-800 dark:text-slate-100 mt-2 leading-none">{{ trip.state.friends.length }}</p>
      <p class="text-xs text-slate-400 mt-1">traveler{{ trip.state.friends.length !== 1 ? 's' : '' }}</p>
      <div class="mt-5 pt-5 border-t border-slate-100 dark:border-[#2a3347]">
        <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          <span class="font-semibold text-slate-700 dark:text-slate-200">Tip:</span>
          names show up on the Splitter so everyone gets credited for what they paid.
        </p>
      </div>
    </div>
  </div>
</template>
