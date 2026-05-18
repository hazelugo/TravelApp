import { createRouter, createWebHistory } from 'vue-router'
import TripView from '@/views/TripView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: TripView,
    },
    {
      path: '/:pathMatch(.*)*',
      component: TripView, // SPA — all routes render the trip view
    },
  ],
})

export default router
