// src/stores/ui.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface ConfirmOptions {
  title: string
  message?: string
  okLabel?: string
  okClass?: string
}

interface ConfirmState extends ConfirmOptions {
  resolve: (value: boolean) => void
}

export const useUIStore = defineStore('ui', () => {
  // ── Dark mode ───────────────────────────────────────────────────────────
  const darkMode = ref(false)

  /**
   * Call once on app mount. Reads localStorage and applies the correct class.
   * Must be called before components render to avoid FOUC.
   */
  function initDarkMode(): void {
    darkMode.value = !!localStorage.getItem('travelapp_dark')
    document.documentElement.classList.toggle('dark', darkMode.value)
  }

  function toggleDark(): void {
    darkMode.value = !darkMode.value
    document.documentElement.classList.toggle('dark', darkMode.value)
    localStorage.setItem('travelapp_dark', darkMode.value ? '1' : '')
  }

  // ── Confirm dialog (Promise-based) ──────────────────────────────────────
  // `confirm` is null when no dialog is showing.
  // When non-null, ConfirmDialog.vue renders it and calls confirmOk/confirmCancel.
  const confirm = ref<ConfirmState | null>(null)

  function showConfirm(opts: ConfirmOptions): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      confirm.value = { ...opts, resolve }
    })
  }

  function confirmOk(): void {
    confirm.value?.resolve(true)
    confirm.value = null
  }

  function confirmCancel(): void {
    confirm.value?.resolve(false)
    confirm.value = null
  }

  return {
    darkMode,
    initDarkMode,
    toggleDark,
    confirm,
    showConfirm,
    confirmOk,
    confirmCancel,
  }
})
