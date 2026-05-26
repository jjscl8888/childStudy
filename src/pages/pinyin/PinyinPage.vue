<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { CheckCircle, Lock, Star, Play, Volume2 } from 'lucide-vue-next'
import TopBar from '@/components/layout/TopBar.vue'
import ProgressBar from '@/components/common/ProgressBar.vue'
import { pinyinData } from '@/data/pinyinData'
import { useUserStore } from '@/stores/userStore'
import { useLearningPathStore } from '@/stores/learningPathStore'
import { useSpacedRepetitionStore } from '@/stores/spacedRepetitionStore'
import { useTextToSpeech } from '@/composables/useTextToSpeech'

const router = useRouter()
const userStore = useUserStore()
const learningPathStore = useLearningPathStore()
const spacedRepetition = useSpacedRepetitionStore()
const tts = useTextToSpeech('zh-CN', 0.6)
const speakingId = ref<string | null>(null)

const activeTab = ref<'path' | 'category' | 'review'>('path')

const tabs = [
  { key: 'path' as const, label: '学习路径', icon: '🗺️' },
  { key: 'category' as const, label: '分类浏览', icon: '📂' },
  { key: 'review' as const, label: '复习巩固', icon: '🔄' },
]

const categoryType = ref<'shengmu' | 'yunmu' | 'zhengti'>('shengmu')

const categoryTabs = [
  { key: 'shengmu' as const, label: '声母', icon: '🗣️', color: '#FF9F43' },
  { key: 'yunmu' as const, label: '韵母', icon: '🎵', color: '#54A0FF' },
  { key: 'zhengti' as const, label: '整体认读', icon: '📖', color: '#2ED573' },
]

const categoryGroups = computed(() => {
  const type = categoryType.value
  const items = pinyinData.filter(p => p.type === type)
  const groupMap = new Map<string, typeof items>()
  items.forEach(item => {
    const g = item.group
    if (!groupMap.has(g)) groupMap.set(g, [])
    groupMap.get(g)!.push(item)
  })
  return Array.from(groupMap.entries()).map(([name, items]) => ({ name, items }))
})

onMounted(() => {
  learningPathStore.initModulePath('pinyin', pinyinData)
})

const moduleProgress = computed(() => learningPathStore.getModuleProgress('pinyin'))

const pathNodes = computed(() => {
  const nodes = learningPathStore.getModuleNodes('pinyin')
  return nodes.map(node => {
    const data = pinyinData.find(p => p.id === node.itemId)
    return { ...node, data }
  })
})

const reviewItems = computed(() => {
  return spacedRepetition.getModuleReviews('pinyin')
    .filter(item => item.lastReview !== null)
    .map(item => {
      const data = pinyinData.find(p => p.id === item.itemId)
      const isDue = item.nextReview <= Date.now()
      return { ...item, data, isDue }
    })
    .sort((a, b) => {
      if (a.isDue && !b.isDue) return -1
      if (!a.isDue && b.isDue) return 1
      return a.nextReview - b.nextReview
    })
})

const overdueCount = computed(() => reviewItems.value.filter(r => r.isDue).length)

function playPinyin(p: { id: string; pinyin: string; example: string }) {
  speakingId.value = p.id
  tts.speak(p.pinyin, { lang: 'zh-CN', rate: 0.6 })
  setTimeout(() => {
    speakingId.value = null
  }, 1200)
}

function goToDetail(itemId: string) {
  if (!learningPathStore.isNodeAccessible('pinyin', itemId)) return
  router.push(`/pinyin/${itemId}`)
}

function goToCategoryDetail(itemId: string) {
  router.push(`/pinyin/${itemId}`)
}

function startCategoryLearning(items: typeof pinyinData) {
  if (items.length > 0) {
    router.push(`/pinyin/${items[0].id}`)
  }
}

function goReview(itemId: string) {
  router.push(`/pinyin/${itemId}`)
}

function getNodePosition(index: number, total: number) {
  const row = Math.floor(index / 4)
  const colInRow = index % 4
  const isReversed = row % 2 === 1
  const col = isReversed ? 3 - colInRow : colInRow
  return { row, col }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'completed': return '✅'
    case 'available': return '▶️'
    case 'learning': return '📖'
    default: return '🔒'
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'completed': return '#2ED573'
    case 'available': return '#FF9F43'
    case 'learning': return '#54A0FF'
    default: return '#D1D5DB'
  }
}
</script>

<template>
  <div class="min-h-screen" style="background-color: #FFF9E6">
    <TopBar title="拼音王国 📝" />

    <div class="px-4 pt-4 pb-6">
      <div class="mb-4">
        <ProgressBar
          :current="moduleProgress.completed"
          :total="moduleProgress.total"
          color="#FF9F43"
        />
      </div>

      <div class="mb-5 flex gap-2">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="flex items-center gap-1.5 shrink-0 rounded-full px-5 py-2.5 text-sm font-bold transition-all duration-200"
          :class="activeTab === tab.key ? 'text-white shadow-md' : 'bg-white text-gray-500 border-2 border-gray-100'"
          :style="activeTab === tab.key ? { backgroundColor: '#FF9F43' } : {}"
          @click="activeTab = tab.key"
        >
          {{ tab.icon }} {{ tab.label }}
          <span
            v-if="tab.key === 'review' && overdueCount > 0"
            class="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white text-xs"
          >
            {{ overdueCount }}
          </span>
        </button>
      </div>

      <div v-if="activeTab === 'path'">
        <div class="mb-4 rounded-2xl p-4" style="background: linear-gradient(135deg, #FF9F4318, #FF9F4308)">
          <div class="flex items-center gap-3">
            <div class="flex h-12 w-12 items-center justify-center rounded-full text-2xl" style="background-color: #FF9F4322">
              🐵
            </div>
            <div>
              <p class="text-base font-bold text-gray-700">
                {{ moduleProgress.completed === 0 ? '开始你的拼音之旅吧！' : `已学会 ${moduleProgress.completed} 个拼音，继续加油！` }}
              </p>
              <p v-if="moduleProgress.currentItemId" class="text-sm text-gray-400">
                下一个待学习 →
              </p>
            </div>
          </div>
        </div>

        <div class="path-map relative">
          <div
            v-for="(node, index) in pathNodes"
            :key="node.id"
            class="path-node mb-4"
            :class="{ 'animate-pulse-subtle': node.status === 'available' }"
          >
            <div class="flex items-center gap-3">
              <div
                class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold transition-all duration-300"
                :style="{
                  backgroundColor: getStatusColor(node.status) + '22',
                  color: getStatusColor(node.status),
                  boxShadow: node.status === 'available' ? `0 0 0 3px ${getStatusColor(node.status)}33` : 'none',
                }"
              >
                <CheckCircle v-if="node.status === 'completed'" class="h-6 w-6" />
                <Play v-else-if="node.status === 'available'" class="h-5 w-5" />
                <Lock v-else class="h-5 w-5" />
              </div>

              <button
                class="flex-1 flex items-center gap-3 rounded-2xl border-2 p-3 transition-all duration-200"
                :class="node.status !== 'locked' ? 'active:scale-[0.97] cursor-pointer' : 'cursor-not-allowed opacity-60'"
                :style="{
                  borderColor: getStatusColor(node.status) + '40',
                  backgroundColor: node.status !== 'locked' ? 'white' : '#F9FAFB',
                }"
                :disabled="node.status === 'locked'"
                @click="goToDetail(node.itemId)"
              >
                <div v-if="node.data" class="flex items-center gap-3 flex-1 min-w-0">
                  <span
                    class="text-2xl font-bold shrink-0"
                    :style="{ color: node.status !== 'locked' ? '#FF9F43' : '#D1D5DB' }"
                  >
                    {{ node.data.pinyin }}
                  </span>
                  <div class="min-w-0">
                    <p class="text-sm font-bold text-gray-700 truncate">{{ node.data.example }}</p>
                    <p class="text-xs text-gray-400">{{ node.data.examplePinyin }}</p>
                  </div>
                </div>

                <div class="shrink-0 flex items-center gap-1">
                  <Star
                    v-if="node.status === 'completed' && node.stars > 0"
                    v-for="i in Math.min(node.stars, 3)"
                    :key="i"
                    class="h-4 w-4 fill-yellow-400 text-yellow-400"
                  />
                  <span
                    v-if="node.status === 'available'"
                    class="text-xs font-bold px-2 py-0.5 rounded-full text-white"
                    style="background-color: #FF9F43"
                  >
                    GO
                  </span>
                </div>
              </button>
            </div>

            <div
              v-if="index < pathNodes.length - 1"
              class="ml-6 h-4 w-0.5"
              :style="{ backgroundColor: node.status === 'completed' ? '#2ED573' : '#E5E7EB' }"
            />
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'category'">
        <div class="mb-4 flex gap-2">
          <button
            v-for="ct in categoryTabs"
            :key="ct.key"
            class="flex items-center gap-1.5 shrink-0 rounded-full px-4 py-2 text-sm font-bold transition-all duration-200"
            :class="categoryType === ct.key ? 'text-white shadow-md' : 'bg-white border-2 border-gray-100'"
            :style="categoryType === ct.key ? { backgroundColor: ct.color } : { color: '#9CA3AF' }"
            @click="categoryType = ct.key"
          >
            {{ ct.icon }} {{ ct.label }}
          </button>
        </div>

        <div v-for="group in categoryGroups" :key="group.name" class="mb-5">
          <div class="mb-2 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span
                class="inline-block rounded-full px-3 py-1 text-xs font-bold text-white"
                :style="{ backgroundColor: categoryTabs.find(t => t.key === categoryType)?.color }"
              >
                {{ group.name }}
              </span>
              <span class="text-xs text-gray-400">{{ group.items.length }}个</span>
            </div>
            <button
              class="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold text-white transition-all active:scale-95"
              :style="{ backgroundColor: categoryTabs.find(t => t.key === categoryType)?.color || '#FF9F43' }"
              @click="startCategoryLearning(group.items)"
            >
              学习本类 →
            </button>
          </div>

          <div class="grid grid-cols-4 gap-2">
            <button
              v-for="p in group.items"
              :key="p.id"
              class="flex flex-col items-center gap-1 rounded-2xl border-2 bg-white p-3 transition-all duration-200 active:scale-95"
              :style="{ borderColor: (categoryTabs.find(t => t.key === categoryType)?.color || '#FF9F43') + '30' }"
              @click="goToCategoryDetail(p.id)"
            >
              <span
                class="text-2xl font-bold"
                :style="{ color: categoryTabs.find(t => t.key === categoryType)?.color }"
              >
                {{ p.pinyin }}
              </span>
              <span class="text-lg">{{ p.emoji }}</span>
              <span class="text-[10px] text-gray-400 truncate w-full text-center">{{ p.example }}</span>
              <button
                class="mt-1 flex h-6 w-6 items-center justify-center rounded-full transition-all active:scale-90"
                :class="speakingId === p.id ? 'animate-pulse' : ''"
                :style="{
                  backgroundColor: (categoryTabs.find(t => t.key === categoryType)?.color || '#FF9F43') + '18',
                  color: categoryTabs.find(t => t.key === categoryType)?.color || '#FF9F43',
                }"
                @click.stop="playPinyin(p)"
              >
                <Volume2 class="h-3.5 w-3.5" />
              </button>
            </button>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'review'">
        <div v-if="reviewItems.length === 0" class="flex flex-col items-center py-12">
          <div class="text-5xl mb-4">📚</div>
          <p class="text-lg font-bold text-gray-500">还没有需要复习的拼音</p>
          <p class="text-sm text-gray-400 mt-1">先去学习路径学习新的拼音吧！</p>
        </div>

        <div v-else>
          <div
            v-if="overdueCount > 0"
            class="mb-4 rounded-2xl p-4"
            style="background: linear-gradient(135deg, #FF6B6B18, #FF6B6B08)"
          >
            <p class="text-base font-bold text-gray-700">
              🔔 有 {{ overdueCount }} 个拼音需要复习！
            </p>
          </div>

          <div class="space-y-3">
            <button
              v-for="item in reviewItems"
              :key="item.id"
              class="flex w-full items-center gap-3 rounded-2xl border-2 bg-white p-4 transition-all active:scale-[0.97]"
              :style="{
                borderColor: item.isDue ? '#FF9F4340' : '#E5E7EB',
              }"
              @click="goReview(item.itemId)"
            >
              <div
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-bold"
                :style="{
                  backgroundColor: item.isDue ? '#FF9F4322' : '#F3F4F6',
                  color: item.isDue ? '#FF9F43' : '#9CA3AF',
                }"
              >
                {{ item.data?.pinyin || '?' }}
              </div>

              <div class="flex-1 min-w-0 text-left">
                <p class="text-sm font-bold text-gray-700">{{ item.data?.example || item.itemId }}</p>
                <p class="text-xs text-gray-400">
                  复习 {{ item.reviewCount }} 次 ·
                  {{ item.isDue ? '需要复习' : `${Math.ceil((item.nextReview - Date.now()) / 86400000)}天后复习` }}
                </p>
              </div>

              <div class="shrink-0">
                <span
                  v-if="item.isDue"
                  class="text-xs font-bold px-2 py-1 rounded-full text-white"
                  style="background-color: #FF9F43"
                >
                  复习
                </span>
                <span
                  v-else
                  class="text-xs font-bold px-2 py-1 rounded-full"
                  style="background-color: #F3F4F6; color: #9CA3AF"
                >
                  已掌握
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-pulse-subtle {
  animation: pulseSubtle 2s ease-in-out infinite;
}
@keyframes pulseSubtle {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.85; }
}
</style>
