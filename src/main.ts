/**
 * main.ts
 *
 * Bootstraps Vuetify and other plugins then mounts the App`
 */

// Composables
import { createApp } from 'vue'

import { getStoredTheme } from '@/lib/theme'
// Plugins
import { registerPlugins } from '@/plugins'

// Components
import App from './App.vue'

// Styles
import 'unfonts.css'
import 'virtual:uno.css'
import './styles/main.scss'

// Apply the saved sun / moon preference before the first paint to avoid a flash.
const savedTheme = getStoredTheme()
document.documentElement.dataset.theme = savedTheme
document.documentElement.style.colorScheme = savedTheme === 'academicDark' ? 'dark' : 'light'

const app = createApp(App)

registerPlugins(app)

app.mount('#app')
