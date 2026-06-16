import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'
import './styles.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import App from './App.vue'

const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'scriptBox',
    themes: {
      scriptBox: {
        dark: false,
        colors: {
          background: '#f6f7f9',
          surface: '#ffffff',
          primary: '#2563eb',
          secondary: '#0f766e',
          error: '#dc2626',
          success: '#16a34a',
          warning: '#d97706',
          info: '#0891b2'
        }
      }
    }
  }
})

createApp(App).use(createPinia()).use(vuetify).mount('#app')
