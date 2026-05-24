<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'
import { Home, BookOpen, Gamepad2, User } from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()

const tabs = [
  { name: '首页', icon: Home, path: '/' },
  { name: '学习', icon: BookOpen, path: '/explore' },
  { name: '游戏', icon: Gamepad2, path: '/games' },
  { name: '我的', icon: User, path: '/profile' },
]

function isActive(path: string): boolean {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}

function navigate(path: string) {
  if (route.path !== path) {
    router.push(path)
  }
}
</script>

<template>
  <nav
    class="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl bg-white shadow-[0_-4px_16px_rgba(0,0,0,0.08)]"
  >
    <div class="flex items-center justify-around py-2">
      <button
        v-for="tab in tabs"
        :key="tab.path"
        class="flex flex-col items-center gap-0.5 px-4 py-1 transition-transform active:scale-95"
        @click="navigate(tab.path)"
      >
        <component
          :is="tab.icon"
          class="h-6 w-6 transition-colors"
          :class="isActive(tab.path) ? 'text-[#FF9F43]' : 'text-gray-400'"
          :stroke-width="isActive(tab.path) ? 2.5 : 1.8"
        />
        <span
          class="text-xs font-medium transition-colors"
          :class="isActive(tab.path) ? 'text-[#FF9F43]' : 'text-gray-400'"
        >
          {{ tab.name }}
        </span>
      </button>
    </div>
  </nav>
</template>
