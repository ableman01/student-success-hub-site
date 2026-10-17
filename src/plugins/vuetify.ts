/**
 * plugins/vuetify.ts
 *
 * Framework documentation: https://vuetifyjs.com`
 */

// Composables
import { createVuetify } from 'vuetify'
// Styles
import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'

// https://vuetifyjs.com/en/introduction/why-vuetify/#feature-guides
export default createVuetify({
  theme: {
    defaultTheme: 'academicLight',
    themes: {
      academicLight: {
        dark: false,
        colors: {
          background: '#f4f6f2',
          surface: '#fffefa',
          primary: '#1b4658',
          secondary: '#668d76',
          success: '#52826a',
          warning: '#b38943',
          error: '#b85d52',
          info: '#527e91',
        },
      },
    },
  },
})
