import { computed, ref, watch } from 'vue'
import { useTheme } from 'vuetify'
import { applyTheme, type AppTheme, getStoredTheme, setStoredTheme } from '@/lib/theme'

// Shared across every component so all sun/moon toggles stay in sync.
const currentTheme = ref<AppTheme>('academicLight')

export function useAppTheme () {
  const vuetifyTheme = useTheme()

  if (document.documentElement.dataset.theme !== currentTheme.value) {
    currentTheme.value = getStoredTheme()
    applyTheme(currentTheme.value, vuetifyTheme)
  }

  watch(currentTheme, themeName => {
    setStoredTheme(themeName)
    applyTheme(themeName, vuetifyTheme)
  })

  const isDark = computed(() => currentTheme.value === 'academicDark')

  function toggleTheme () {
    const nextTheme: AppTheme = isDark.value ? 'academicLight' : 'academicDark'
    currentTheme.value = nextTheme
  }

  const themeIcon = computed(() => isDark.value ? 'mdi-weather-sunny' : 'mdi-weather-night')
  const themeLabel = computed(() => isDark.value ? 'Switch to sun mode' : 'Switch to moon mode')

  return {
    theme: currentTheme,
    isDark,
    toggleTheme,
    themeIcon,
    themeLabel,
  }
}
