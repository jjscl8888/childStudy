<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import { useLearningPathStore } from '@/stores/learningPathStore'
import { useSpacedRepetitionStore } from '@/stores/spacedRepetitionStore'
import TopBar from '@/components/layout/TopBar.vue'

const router = useRouter()
const userStore = useUserStore()
const learningPathStore = useLearningPathStore()
const spacedRepetition = useSpacedRepetitionStore()

const showSwitchModal = ref(false)

const unlockedCount = computed(() => userStore.achievements.filter(a => a.unlocked).length)
const totalCount = computed(() => userStore.achievements.length)

const weekDays = computed(() => {
  const days = ['一', '二', '三', '四', '五', '六', '日']
  const now = new Date()
  const today = now.getDay() === 0 ? 6 : now.getDay() - 1
  const mondayOffset = today

  return days.map((label, i) => {
    const date = new Date(now)
    date.setDate(now.getDate() - mondayOffset + i)
    const dateStr = date.toDateString()
    const hasRecord = userStore.learningRecords.some(r => new Date(r.createdAt).toDateString() === dateStr)
    return { label, hasRecord, isToday: i === today }
  })
})

const moduleStats = computed(() => {
  const modules = [
    { key: 'pinyin', name: '拼音', color: '#FF9F43' },
    { key: 'chinese', name: '汉字', color: '#2ED573' },
    { key: 'english', name: '英语', color: '#54A0FF' },
    { key: 'math', name: '数学', color: '#FF6B6B' },
    { key: 'explore', name: '探索', color: '#A55EEA' },
  ]
  return modules.map(m => ({
    ...m,
    count: userStore.learningRecords.filter(r => r.module === m.key).length,
  }))
})

const totalRecords = computed(() => userStore.learningRecords.length)

function handleSwitchUser(userId: string) {
  userStore.switchUser(userId)
  learningPathStore.saveToStorage()
  spacedRepetition.saveToStorage()
  showSwitchModal.value = false
}

function goToShop() {
  router.push('/profile/shop')
}

function goToParent() {
  router.push('/admin/login')
}

function handleLogout() {
  userStore.logout()
  router.replace('/welcome')
}
</script>

<template>
  <div v-if="userStore.currentUser" class="min-h-screen bg-warm pb-6">
    <TopBar title="我的房间 🏠" />

    <div class="px-4 pt-4 space-y-4">
      <div class="fun-card flex items-center gap-4">
        <div class="flex h-20 w-20 items-center justify-center rounded-xl3 text-5xl bg-primary/10 shrink-0">
          {{ userStore.currentUser.avatar }}
        </div>
        <div class="flex-1 min-w-0">
          <h2 class="text-xl font-bold text-gray-700 truncate">{{ userStore.currentUser.name }}</h2>
          <div class="flex flex-wrap items-center gap-2 mt-2">
            <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 text-blue-700 font-bold text-sm">
              Lv.{{ userStore.currentLevel }}
            </span>
            <span class="star-badge text-sm">
              ⭐ {{ userStore.totalStars }}
            </span>
            <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-orange-100 text-orange-700 font-bold text-sm">
              🔥 {{ userStore.currentStreak }}天
            </span>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div class="fun-card">
          <div class="flex items-center gap-2 mb-3">
            <span class="text-xl">🏆</span>
            <h3 class="font-bold text-gray-700">成就墙</h3>
          </div>
          <div class="grid grid-cols-4 gap-2 mb-3">
            <div
              v-for="ach in userStore.achievements"
              :key="ach.id"
              class="flex h-10 w-10 items-center justify-center rounded-xl2 text-xl transition-transform hover:scale-110"
              :class="ach.unlocked ? 'bg-yellow-100' : 'bg-gray-100 grayscale opacity-50'"
              :title="ach.unlocked ? ach.name : '???'"
            >
              {{ ach.icon }}
            </div>
          </div>
          <p class="text-xs text-gray-400 font-bold">
            {{ unlockedCount }}/{{ totalCount }} 已解锁
          </p>
        </div>

        <div class="fun-card-hover" @click="goToShop">
          <div class="flex items-center gap-2 mb-3">
            <span class="text-xl">⭐</span>
            <h3 class="font-bold text-gray-700">星星商店</h3>
          </div>
          <div class="flex items-center justify-center h-16 text-4xl mb-2">
            🛒
          </div>
          <p class="text-xs text-gray-400 font-bold">
            余额: {{ userStore.totalStars }} ⭐
          </p>
        </div>

        <div class="fun-card">
          <div class="flex items-center gap-2 mb-3">
            <span class="text-xl">📅</span>
            <h3 class="font-bold text-gray-700">学习日历</h3>
          </div>
          <div class="grid grid-cols-7 gap-1.5">
            <div
              v-for="day in weekDays"
              :key="day.label"
              class="flex flex-col items-center gap-1"
            >
              <span class="text-xs text-gray-400 font-bold">{{ day.label }}</span>
              <div
                class="h-8 w-8 rounded-xl2 flex items-center justify-center text-sm font-bold transition-colors"
                :class="[
                  day.hasRecord ? 'bg-success text-white' : 'bg-gray-100 text-gray-300',
                  day.isToday ? 'ring-2 ring-primary' : ''
                ]"
              >
                {{ day.hasRecord ? '✓' : '·' }}
              </div>
            </div>
          </div>
        </div>

        <div class="fun-card">
          <div class="flex items-center gap-2 mb-3">
            <span class="text-xl">📊</span>
            <h3 class="font-bold text-gray-700">学习统计</h3>
          </div>
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs text-gray-400">总记录</span>
              <span class="text-sm font-bold text-gray-600">{{ totalRecords }}</span>
            </div>
            <div
              v-for="mod in moduleStats"
              :key="mod.key"
              class="flex items-center gap-2"
            >
              <span class="text-xs text-gray-400 w-8">{{ mod.name }}</span>
              <div class="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-500"
                  :style="{
                    width: Math.min(mod.count * 5, 100) + '%',
                    backgroundColor: mod.color,
                  }"
                ></div>
              </div>
              <span class="text-xs font-bold text-gray-500 w-6 text-right">{{ mod.count }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="space-y-3 pt-2">
        <button
          class="fun-btn-secondary w-full text-lg"
          @click="showSwitchModal = true"
        >
          🔄 切换用户
        </button>

        <button
          class="fun-btn-accent w-full text-lg"
          @click="goToParent"
        >
          👨‍👩‍👧 家长中心
        </button>

        <button
          class="fun-btn-secondary w-full text-lg"
          @click="handleLogout"
        >
          🚪 退出登录
        </button>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="showSwitchModal"
        class="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4"
        @click.self="showSwitchModal = false"
      >
        <div class="fun-card w-full max-w-sm animate-pop">
          <h3 class="text-lg font-bold text-gray-700 mb-4 text-center">选择用户</h3>
          <div class="space-y-3 max-h-60 overflow-y-auto">
            <button
              v-for="user in userStore.users"
              :key="user.id"
              class="fun-card-hover w-full flex items-center gap-3 p-3"
              :class="{ 'ring-2 ring-primary': user.id === userStore.currentUser?.id }"
              @click="handleSwitchUser(user.id)"
            >
              <div class="flex h-12 w-12 items-center justify-center rounded-xl2 text-3xl bg-primary/10 shrink-0">
                {{ user.avatar }}
              </div>
              <div class="flex-1 text-left">
                <div class="font-bold text-gray-700">{{ user.name }}</div>
                <div class="text-xs text-gray-400">⭐ {{ user.stars }} · Lv.{{ user.level }}</div>
              </div>
              <span v-if="user.id === userStore.currentUser?.id" class="text-primary font-bold text-sm">当前</span>
            </button>
          </div>
          <button
            class="fun-btn-primary w-full mt-4"
            @click="showSwitchModal = false"
          >
            关闭
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.animate-pop {
  animation: pop 0.3s ease-out;
}
</style>
