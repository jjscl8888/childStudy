<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import { useLearningPathStore } from '@/stores/learningPathStore'
import { useSpacedRepetitionStore } from '@/stores/spacedRepetitionStore'
import { pinyinData } from '@/data/pinyinData'
import { chineseData } from '@/data/chineseData'
import { englishData } from '@/data/englishData'

const router = useRouter()
const userStore = useUserStore()
const learningPathStore = useLearningPathStore()
const spacedRepetition = useSpacedRepetitionStore()

if (!userStore.currentUser) {
  router.replace('/welcome')
}

onMounted(() => {
  learningPathStore.initModulePath('pinyin', pinyinData)
  learningPathStore.initModulePath('chinese', chineseData)
})

const modules = [
  {
    emoji: '📝',
    title: '拼音王国',
    desc: '声母韵母快乐学',
    color: '#FF9F43',
    route: '/pinyin',
    moduleKey: 'pinyin',
  },
  {
    emoji: '📖',
    title: '汉字花园',
    desc: '一笔一划认汉字',
    color: '#2ED573',
    route: '/chinese',
    moduleKey: 'chinese',
  },
  {
    emoji: '🌍',
    title: '英语世界',
    desc: 'ABC轻松起步',
    color: '#54A0FF',
    route: '/english',
    moduleKey: 'english',
  },
  {
    emoji: '🔢',
    title: '数学城堡',
    desc: '数字运算大冒险',
    color: '#FF6B6B',
    route: '/math',
    moduleKey: 'math',
  },
  {
    emoji: '🌟',
    title: '探索天地',
    desc: '发现奇妙的世界',
    color: '#A55EEA',
    route: '/explore',
    moduleKey: 'explore',
  },
  {
    emoji: '🎙️',
    title: '发音评测',
    desc: '朗读评分练发音',
    color: '#FF6348',
    route: '/speech',
    moduleKey: 'speech',
  },
]

const greeting = computed(() => {
  if (!userStore.currentUser) return ''
  return `你好，${userStore.currentUser.name}！🌟`
})

const totalReviewCount = computed(() => spacedRepetition.reviewCount)

const pinyinProgress = computed(() => learningPathStore.getModuleProgress('pinyin'))
const chineseProgress = computed(() => learningPathStore.getModuleProgress('chinese'))

function getProgress(moduleKey: string): number {
  if (moduleKey === 'pinyin') return pinyinProgress.value.completed
  if (moduleKey === 'chinese') return chineseProgress.value.completed
  return userStore.getModuleProgress(moduleKey)
}

function getTotal(moduleKey: string): number {
  if (moduleKey === 'pinyin') return pinyinProgress.value.total
  if (moduleKey === 'chinese') return chineseProgress.value.total
  return 0
}

function navigateTo(route: string) {
  router.push(route)
}
</script>

<template>
  <div v-if="userStore.currentUser" class="home-page relative min-h-screen pb-6">
    <div class="clouds-bg" aria-hidden="true">
      <div class="cloud cloud-1"></div>
      <div class="cloud cloud-2"></div>
      <div class="cloud cloud-3"></div>
      <div class="star-decor star-1">✦</div>
      <div class="star-decor star-2">✧</div>
      <div class="star-decor star-3">✦</div>
    </div>

    <div class="relative z-10 px-4 pt-6">
      <section class="greeting-section mb-5 animate-fade-in">
        <div class="fun-card flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-800 mb-1">{{ greeting }}</h1>
            <div class="flex items-center gap-3 text-sm">
              <span class="star-badge">⭐ {{ userStore.totalStars }}</span>
              <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-orange-100 text-orange-700 font-bold">
                🔥 连续{{ userStore.currentStreak }}天
              </span>
              <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 text-blue-700 font-bold">
                Lv.{{ userStore.currentLevel }}
              </span>
            </div>
          </div>
          <div class="flex h-14 w-14 items-center justify-center rounded-xl2 text-4xl bg-primary/10">
            {{ userStore.currentUser.avatar }}
          </div>
        </div>
      </section>

      <section v-if="totalReviewCount > 0" class="mb-5 animate-slide-up" style="animation-delay: 0.1s; animation-fill-mode: both;">
        <button
          class="w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all active:scale-[0.97]"
          style="border-color: #FF6B6B40; background: linear-gradient(135deg, #FF6B6B12, #FF6B6B06)"
          @click="navigateTo('/games/quiz')"
        >
          <div class="flex h-12 w-12 items-center justify-center rounded-full text-2xl" style="background-color: #FF6B6B22">
            🔔
          </div>
          <div class="flex-1 text-left">
            <h3 class="text-base font-bold text-gray-700">有 {{ totalReviewCount }} 个知识点需要复习</h3>
            <p class="text-sm text-gray-400">点击去复习，巩固记忆！</p>
          </div>
          <div class="text-accent text-lg font-bold">GO!</div>
        </button>
      </section>

      <section class="modules-section mb-5">
        <h2 class="text-lg font-bold text-gray-600 mb-3 flex items-center gap-2">
          <span>🗺️</span> 学习路径
        </h2>
        <div class="space-y-3">
          <button
            v-for="(mod, index) in modules"
            :key="mod.moduleKey"
            class="fun-card-hover flex items-center gap-4 p-4 animate-slide-up w-full text-left"
            :style="{ animationDelay: `${index * 0.08}s`, animationFillMode: 'both' }"
            @click="navigateTo(mod.route)"
          >
            <div
              class="flex h-14 w-14 items-center justify-center rounded-xl3 text-3xl shrink-0"
              :style="{ backgroundColor: mod.color + '18' }"
            >
              {{ mod.emoji }}
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="text-base font-bold text-gray-700">{{ mod.title }}</h3>
              <p class="text-xs text-gray-400">{{ mod.desc }}</p>
              <div class="mt-1.5 w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-500"
                  :style="{
                    width: getTotal(mod.moduleKey) > 0 ? Math.min(getProgress(mod.moduleKey) / getTotal(mod.moduleKey) * 100, 100) + '%' : Math.min(getProgress(mod.moduleKey) * 5, 100) + '%',
                    backgroundColor: mod.color,
                  }"
                ></div>
              </div>
            </div>
            <div class="shrink-0 text-right">
              <span class="text-xs text-gray-400">
                已学 {{ getProgress(mod.moduleKey) }} 项
              </span>
            </div>
          </button>
        </div>
      </section>

      <section class="challenge-section animate-slide-up" style="animation-delay: 0.4s; animation-fill-mode: both;">
        <button
          class="fun-card-hover w-full flex items-center gap-4 p-5 border-2 border-accent/30"
          @click="navigateTo('/games/quiz')"
        >
          <div class="flex h-14 w-14 items-center justify-center rounded-xl3 text-4xl bg-accent/10">
            🏆
          </div>
          <div class="flex-1 text-left">
            <h3 class="text-lg font-bold text-gray-700">今日挑战</h3>
            <p class="text-sm text-gray-400">完成挑战赢取额外星星！</p>
          </div>
          <div class="text-accent text-2xl font-bold">GO!</div>
        </button>
      </section>
    </div>
  </div>
</template>

<style scoped>
.home-page {
  background-color: #FFF9E6;
}

.clouds-bg {
  position: fixed;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 0;
}

.cloud {
  position: absolute;
  background: white;
  border-radius: 50%;
  opacity: 0.4;
}

.cloud::before,
.cloud::after {
  content: '';
  position: absolute;
  background: white;
  border-radius: 50%;
}

.cloud-1 {
  width: 80px;
  height: 30px;
  top: 8%;
  left: -10%;
  animation: cloudDrift 25s linear infinite;
}
.cloud-1::before {
  width: 40px;
  height: 40px;
  top: -20px;
  left: 15px;
}
.cloud-1::after {
  width: 30px;
  height: 30px;
  top: -12px;
  left: 40px;
}

.cloud-2 {
  width: 60px;
  height: 22px;
  top: 18%;
  left: -10%;
  animation: cloudDrift 35s linear infinite 8s;
}
.cloud-2::before {
  width: 30px;
  height: 30px;
  top: -15px;
  left: 10px;
}
.cloud-2::after {
  width: 22px;
  height: 22px;
  top: -8px;
  left: 30px;
}

.cloud-3 {
  width: 70px;
  height: 26px;
  top: 30%;
  left: -10%;
  animation: cloudDrift 30s linear infinite 15s;
}
.cloud-3::before {
  width: 35px;
  height: 35px;
  top: -18px;
  left: 12px;
}
.cloud-3::after {
  width: 26px;
  height: 26px;
  top: -10px;
  left: 36px;
}

@keyframes cloudDrift {
  from { transform: translateX(0); }
  to { transform: translateX(calc(100vw + 120px)); }
}

.star-decor {
  position: absolute;
  color: #FFD700;
  opacity: 0.15;
  font-size: 1.5rem;
}

.star-1 { top: 12%; right: 15%; animation: float 3s ease-in-out infinite; }
.star-2 { top: 35%; right: 8%; animation: float 4s ease-in-out infinite 1s; font-size: 1rem; }
.star-3 { top: 55%; left: 5%; animation: float 3.5s ease-in-out infinite 0.5s; font-size: 1.2rem; }

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}
</style>
