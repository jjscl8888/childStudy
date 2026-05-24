import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './assets/main.css'
import { initDatabase } from './db/database'
import { migrateFromLocalStorage } from './db/migration'

async function bootstrap() {
  await initDatabase()
  await migrateFromLocalStorage()

  const app = createApp(App)
  app.use(createPinia())
  app.use(router)
  app.mount('#app')
}

bootstrap()
