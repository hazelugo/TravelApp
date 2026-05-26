<script setup lang="ts">
import { ref } from 'vue'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppBottomNav from '@/components/layout/AppBottomNav.vue'
import OverviewTab from '@/views/tabs/OverviewTab.vue'
import ItineraryTab from '@/views/tabs/ItineraryTab.vue'
import SpendingTab from '@/views/tabs/SpendingTab.vue'
import SplitterTab from '@/views/tabs/SplitterTab.vue'
// import PhotosTab from '@/views/tabs/PhotosTab.vue'
import { useTripStore } from '@/stores/trips'

const currentTab = ref('overview')
const trip = useTripStore()

const TABS: Record<string, typeof OverviewTab> = {
  overview:   OverviewTab,
  itinerary:  ItineraryTab,
  analytics:  SpendingTab,
  splitter:   SplitterTab,
  // photos:  PhotosTab,
}
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-slate-50 dark:bg-[#0f1117]">
    <!-- Sidebar (desktop) -->
    <AppSidebar :current-tab="currentTab" @tab="currentTab = $event" />

    <!-- Main area -->
    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
      <AppHeader :current-tab="currentTab" :sync-status="trip.syncStatus" />

      <!-- Content -->
      <main class="flex-1 overflow-y-auto px-4 pt-5 pb-28 lg:p-8">
        <div class="max-w-5xl mx-auto">
          <Transition name="fade" mode="out-in">
            <component :is="TABS[currentTab]" :key="currentTab" />
          </Transition>
        </div>
      </main>
    </div>

    <!-- Bottom nav (mobile) -->
    <AppBottomNav :current-tab="currentTab" @tab="currentTab = $event" />
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s, transform 0.15s; }
.fade-enter-from { opacity: 0; transform: translateY(6px); }
.fade-leave-to   { opacity: 0; transform: translateY(-4px); }
</style>
