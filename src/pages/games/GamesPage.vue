<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { Star } from 'lucide-vue-next'
import TopBar from '@/components/layout/TopBar.vue'
import { useUserStore } from '@/stores/userStore'

const router = useRouter()
const userStore = useUserStore()

const todayStars = computed(() => {
  const today = new Date().toDateString()
  return userStore.learningRecords
    .filter(r => new Date(r.createdAt).toDateString() === today)
    .reduce((sum, r) => sum + r.starsEarned, 0)
})

const games = [
  {
    emoji: '🧠',
    title: '综合测验',
    desc: '回答各科问题，赢取星星！',
    color: '#FF9F43',
    route: '/games/quiz',
  },
  {
    emoji: '🃏',
    title: '记忆翻牌',
    desc: '翻牌配对，锻炼记忆力！',
    color: '#54A0FF',
    route: '/games/memory',
  },
  {
    emoji: '🏎️',
    title: '数学竞速',
    desc: '快速计算，挑战速度！',
    color: '#FF6B6B',
    route: '/games/math-race',
  },
]

function navigateTo(route: string) {
  router.push(route)
}
</script>

<template>
  <div class="min-h-screen pb-6" style="background-color: #FFF9E6">
    <TopBar title="游戏中心 🎮" />

    <div class="px-4 pt-4">
      <div class="mb-5 flex items-center justify-center gap-2 rounded-2xl bg-white p-4 shadow-sm">
        <Star class="h-6 w-6 fill-yellow-400 text-yellow-400" />
        <span class="text-base font-bold text-gray-500">今日获得</span>
        <span class="text-2xl font-bold text-yellow-500">{{ todayStars }}</span>
        <Star class="h-5 w-5 fill-yellow-400 text-yellow-400" />
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <button
          v-for="(game, index) in games"
          :key="game.title"
          class="fun-card-hover flex flex-col items-center p-6 animate-slide-up"
          :style="{
            animationDelay: `${index * 0.1}s`,
            animationFillMode: 'both',
            borderColor: game.color + '40',
          }"
          @click="navigateTo(game.route)"
        >
          <div
            class="mb-4 flex h-20 w-20 items-center justify-center rounded-xl3 text-5xl"
            :style="{ backgroundColor: game.color + '18' }"
          >
            {{ game.emoji }}
          </div>
          <h3 class="mb-1 text-xl font-bold text-gray-700">{{ game.title }}</h3>
          <p class="mb-4 text-sm text-gray-400">{{ game.desc }}</p>
          <span
            class="inline-flex items-center gap-1 rounded-full px-6 py-2.5 text-base font-bold text-white shadow-md transition-transform active:scale-95"
            :style="{ backgroundColor: game.color }"
          >
            开始游戏 →
          </span>
        </button>
      </div>
    </div>
  </div>
</template>
