import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './assets/main.css'
import { initDatabase } from './db/database'
import { migrateFromLocalStorage } from './db/migration'
import * as Sentry from '@sentry/vue'

async function bootstrap() {
  await initDatabase()
  await migrateFromLocalStorage()

  const app = createApp(App)

  if (import.meta.env.VITE_SENTRY_DSN) {
    Sentry.init({
      app,
      dsn: import.meta.env.VITE_SENTRY_DSN,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration(),
      ],
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 1.0,
      environment: import.meta.env.MODE,
    })
  }

  app.use(createPinia())
  app.use(router)
  app.mount('#app')
}

bootstrap()
