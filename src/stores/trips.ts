// src/stores/trips.ts
// Stub — full implementation in plan 02-01 (useTripStore with Supabase sync + realtime).
// This stub satisfies the TypeScript import in App.vue during parallel plan execution.
import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import type { TripState } from '@/types/domain'

export const useTripStore = defineStore('trip', () => {
  const tripId = ref<string>('')
  const syncStatus = ref<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const state = reactive<TripState>({
    trip: { destination: '', startDate: '', endDate: '' },
    attendance: { adults: 2, kids: 0, adultPrice: 0, kidPrice: 0 },
    budget: 0,
    events: [],
    friends: [],
    payments: [],
    settledPairs: [],
    photos: [],
  })

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async function initialize(_id: string): Promise<void> {
    // Stub — full implementation wires Supabase load + realtime subscription
    tripId.value = _id
  }

  return {
    tripId,
    syncStatus,
    state,
    initialize,
  }
})
