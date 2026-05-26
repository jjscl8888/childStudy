<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { CheckCircle, Lock, Star, Play, Volume2 } from 'lucide-vue-next'
import TopBar from '@/components/layout/TopBar.vue'
import ProgressBar from '@/components/common/ProgressBar.vue'
import { chineseData } from '@/data/chineseData'
import { useUserStore } from '@/stores/userStore'
import { useLearningPathStore } from '@/stores/learningPathStore'
import { useSpacedRepetitionStore } from '@/stores/spacedRepetitionStore'
import { useTextToSpeech } from '@/composables/useTextToSpeech'

const router = useRouter()
const userStore = useUserStore()
const learningPathStore = useLearningPathStore()
const spacedRepetition = useSpacedRepetitionStore()
const tts = useTextToSpeech('zh-CN', 0.6)

const activeTab = ref<'path' | 'review' | 'category'>('path')

const tabs = [
  { key: 'path' as const, label: '学习路径', icon: '🗺️' },
  { key: 'category' as const, label: '分类浏览', icon: '📂' },
  { key: 'review' as const, label: '复习巩固', icon: '🔄' },
]

onMounted(() => {
  learningPathStore.initModulePath('chinese', chineseData)
})

const moduleProgress = computed(() => learningPathStore.getModuleProgress('chinese'))

const pathNodes = computed(() => {
  const nodes = learningPathStore.getModuleNodes('chinese')
  return nodes.map(node => {
    const data = chineseData.find(c => c.id === node.itemId)
    return { ...node, data }
  })
})

const groupedNodes = computed(() => {
  const groups: Record<string, typeof pathNodes.value> = {}
  for (const node of pathNodes.value) {
    const groupName = node.data?.groupName || '其他'
    if (!groups[groupName]) {
      groups[groupName] = []
    }
    groups[groupName].push(node)
  }
  return groups
})

const categoryGroups = computed(() => {
  const groups: Record<string, typeof chineseData> = {}
  for (const char of chineseData) {
    const name = char.groupName
    if (!groups[name]) {
      groups[name] = []
    }
    groups[name].push(char)
  }
  return groups
})

const groupEmojis: Record<string, string> = {
  '数字': '🔢',
  '自然': '🌿',
  '人物身体': '🧍',
  '动物': '🐾',
  '方位': '🧭',
  '天地': '🌤️',
  '家庭': '👨‍👩‍👧',
  '学校': '🏫',
  '生活': '🏠',
  '植物': '🌻',
  '常用动词': '🏃',
  '常用形容词': '🎨',
  '食物饮品': '🍽️',
  '身体扩展': '🦴',
  '交通工具': '🚗',
  '时间': '⏰',
  '更多动物': '🦁',
  '学校用品': '✏️',
  '常用虚词': '📝',
  '天气扩展': '🌦️',
  '衣物': '👕',
  '建筑场所': '🏠',
  '动作扩展': '🤲',
  '称谓': '👨‍👩‍👧‍👦',
}

const reviewItems = computed(() => {
  return spacedRepetition.getModuleReviews('chinese')
    .filter(item => item.lastReview !== null)
    .map(item => {
      const data = chineseData.find(c => c.id === item.itemId)
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

function goToDetail(itemId: string) {
  if (!learningPathStore.isNodeAccessible('chinese', itemId)) return
  router.push(`/chinese/${itemId}`)
}

function goToCategoryDetail(itemId: string) {
  router.push(`/chinese/${itemId}`)
}

function speakChar(character: string, event?: Event) {
  event?.stopPropagation()
  tts.speak(character, { lang: 'zh-CN', rate: 0.6 })
}

function startCategoryLearning(chars: typeof chineseData) {
  if (chars.length > 0) {
    router.push(`/chinese/${chars[0].id}`)
  }
}

function goReview(itemId: string) {
  router.push(`/chinese/${itemId}`)
}

function getStatusColor(status: string) {
  switch (status) {
    case 'completed': return '#2ED573'
    case 'available': return '#2ED573'
    case 'learning': return '#54A0FF'
    default: return '#D1D5DB'
  }
}
</script>

<template>
  <div class="min-h-screen" style="background-color: #F0FFF4">
    <TopBar title="汉字花园 📖" />

    <div class="px-4 pt-4 pb-6">
      <div class="mb-4">
        <ProgressBar
          :current="moduleProgress.completed"
          :total="moduleProgress.total"
          color="#2ED573"
        />
      </div>

      <div class="mb-5 flex gap-2">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="flex items-center gap-1.5 shrink-0 rounded-full px-5 py-2.5 text-sm font-bold transition-all duration-200"
          :class="activeTab === tab.key ? 'text-white shadow-md' : 'bg-white text-gray-500 border-2 border-gray-100'"
          :style="activeTab === tab.key ? { backgroundColor: '#2ED573' } : {}"
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
        <div class="mb-4 rounded-2xl p-4" style="background: linear-gradient(135deg, #2ED57318, #2ED57308)">
          <div class="flex items-center gap-3">
            <div class="flex h-12 w-12 items-center justify-center rounded-full text-2xl" style="background-color: #2ED57322">
              🐵
            </div>
            <div>
              <p class="text-base font-bold text-gray-700">
                {{ moduleProgress.completed === 0 ? '开始你的识字之旅吧！' : `已学会 ${moduleProgress.completed} 个汉字，继续加油！` }}
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
            class="path-node mb-3"
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
                    class="text-3xl font-bold shrink-0"
                    :style="{ color: node.status !== 'locked' ? '#2ED573' : '#D1D5DB' }"
                  >
                    {{ node.data.character }}
                  </span>
                  <div class="min-w-0">
                    <p class="text-sm font-bold text-gray-700">{{ node.data.pinyin }}</p>
                    <p class="text-xs text-gray-400">{{ node.data.groupName }}</p>
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
                    style="background-color: #2ED573"
                  >
                    GO
                  </span>
                </div>
              </button>
            </div>

            <div
              v-if="index < pathNodes.length - 1"
              class="ml-6 h-3 w-0.5"
              :style="{ backgroundColor: node.status === 'completed' ? '#2ED573' : '#E5E7EB' }"
            />
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'category'">
        <div
          v-for="(chars, groupName) in categoryGroups"
          :key="groupName"
          class="mb-5"
        >
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <span class="text-lg">{{ groupEmojis[groupName] || '📂' }}</span>
              <h3 class="text-base font-bold text-gray-700">{{ groupName }}</h3>
              <span class="text-xs text-gray-400 ml-1">{{ chars.length }}字</span>
            </div>
            <button
              class="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold text-white transition-all active:scale-95"
              style="background-color: #2ED573"
              @click="startCategoryLearning(chars)"
            >
              学习本类 →
            </button>
          </div>
          <div class="grid grid-cols-4 gap-2">
            <button
              v-for="char in chars"
              :key="char.id"
              class="flex flex-col items-center justify-center rounded-2xl border-2 bg-white p-2.5 transition-all active:scale-[0.95]"
              style="border-color: #2ED57330"
              @click="goToCategoryDetail(char.id)"
            >
              <span class="text-2xl font-bold" style="color: #2ED573">{{ char.character }}</span>
              <div class="flex items-center gap-0.5 mt-1">
                <span class="text-xs text-gray-500">{{ char.pinyin }}</span>
                <Volume2
                  class="h-3 w-3 cursor-pointer transition-colors"
                  style="color: #2ED573"
                  @click="speakChar(char.character, $event)"
                />
              </div>
            </button>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'review'">
        <div v-if="reviewItems.length === 0" class="flex flex-col items-center py-12">
          <div class="text-5xl mb-4">📚</div>
          <p class="text-lg font-bold text-gray-500">还没有需要复习的汉字</p>
          <p class="text-sm text-gray-400 mt-1">先去学习路径学习新的汉字吧！</p>
        </div>

        <div v-else>
          <div
            v-if="overdueCount > 0"
            class="mb-4 rounded-2xl p-4"
            style="background: linear-gradient(135deg, #FF6B6B18, #FF6B6B08)"
          >
            <p class="text-base font-bold text-gray-700">
              🔔 有 {{ overdueCount }} 个汉字需要复习！
            </p>
          </div>

          <div class="space-y-3">
            <button
              v-for="item in reviewItems"
              :key="item.id"
              class="flex w-full items-center gap-3 rounded-2xl border-2 bg-white p-4 transition-all active:scale-[0.97]"
              :style="{ borderColor: item.isDue ? '#2ED57340' : '#E5E7EB' }"
              @click="goReview(item.itemId)"
            >
              <div
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl font-bold"
                :style="{
                  backgroundColor: item.isDue ? '#2ED57322' : '#F3F4F6',
                  color: item.isDue ? '#2ED573' : '#9CA3AF',
                }"
              >
                {{ item.data?.character || '?' }}
              </div>

              <div class="flex-1 min-w-0 text-left">
                <p class="text-sm font-bold text-gray-700">{{ item.data?.pinyin }} · {{ item.data?.groupName }}</p>
                <p class="text-xs text-gray-400">
                  复习 {{ item.reviewCount }} 次 ·
                  {{ item.isDue ? '需要复习' : `${Math.ceil((item.nextReview - Date.now()) / 86400000)}天后复习` }}
                </p>
              </div>

              <div class="shrink-0">
                <span
                  v-if="item.isDue"
                  class="text-xs font-bold px-2 py-1 rounded-full text-white"
                  style="background-color: #2ED573"
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
