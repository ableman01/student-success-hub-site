/**
 * plugins/vuetify.ts
 *
 * Framework documentation: https://vuetifyjs.com`
 */

// Composables
import { createVuetify } from 'vuetify'
import { getStoredTheme } from '@/lib/theme'
// Styles
import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'

// https://vuetifyjs.com/en/introduction/why-vuetify/#feature-guides
export default createVuetify({
  theme: {
    defaultTheme: getStoredTheme(),
    themes: {
      academicLight: {
        dark: false,
        colors: {
          background: '#f3f7f4',
          surface: '#ffffff',
          primary: '#14594f',
          secondary: '#3e8b6d',
          success: '#2e7d5b',
          warning: '#b38943',
          error: '#b85d52',
          info: '#2f6f8f',
        },
      },
      academicDark: {
        dark: true,
        colors: {
          background: '#0b1418',
          surface: '#132024',
          primary: '#6fb8a8',
          secondary: '#a7c9b6',
          success: '#6fb8a8',
          warning: '#e2c27a',
          error: '#ef8a80',
          info: '#7fb3c9',
        },
      },
    },
  },
})
