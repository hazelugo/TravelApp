<script setup lang="ts">
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useUIStore } from '@/stores/ui'
import { useTripStore } from '@/stores/trips'
import { useTrip } from '@/composables/useTrip'

const uiStore = useUIStore()
const tripStore = useTripStore()
const { resolveTripId } = useTrip()

const { confirm } = storeToRefs(uiStore)
const { confirmOk, confirmCancel } = uiStore

onMounted(async () => {
  // 1. Apply dark mode class before any component renders (prevents FOUC)
  uiStore.initDarkMode()

  // 2. Resolve trip ID and initialize the data store
  const tripId = resolveTripId()
  await tripStore.initialize(tripId)
})
</script>

<template>
  <RouterView />

  <!--
    Confirm dialog stub — fully styled in Phase 3 (ConfirmDialog.vue component).
    Placed here so showConfirm() works from any store action during Phase 2 testing.
  -->
  <Teleport to="body">
    <div
      v-if="confirm"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
    >
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {{ confirm.title }}
        </h2>
        <p v-if="confirm.message" class="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {{ confirm.message }}
        </p>
        <div class="flex gap-3 justify-end">
          <button
            class="px-4 py-2 text-sm rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            @click="confirmCancel"
          >
            Cancel
          </button>
          <button
            :class="[
              'px-4 py-2 text-sm rounded-xl text-white font-medium transition-colors',
              confirm.okClass ?? 'bg-rose-500 hover:bg-rose-600'
            ]"
            @click="confirmOk"
          >
            {{ confirm.okLabel ?? 'Delete' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
