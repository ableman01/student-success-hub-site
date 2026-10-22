export type AppTheme = 'academicLight' | 'academicDark'

export const themeStorageKey = 'lasu-theme-preference'

export function getStoredTheme (): AppTheme {
  try {
    return localStorage.getItem(themeStorageKey) === 'academicDark' ? 'academicDark' : 'academicLight'
  } catch {
    return 'academicLight'
  }
}

export function applyTheme (themeName: AppTheme, theme: { change: (name: string) => void }) {
  theme.change(themeName)
  document.documentElement.dataset.theme = themeName
  document.documentElement.style.colorScheme = themeName === 'academicDark' ? 'dark' : 'light'
}

export function setStoredTheme (themeName: AppTheme) {
  try {
    localStorage.setItem(themeStorageKey, themeName)
  } catch {
    // Theme still applies for this session when storage is unavailable.
  }
}
