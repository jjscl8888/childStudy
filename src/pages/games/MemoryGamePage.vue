<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import TopBar from '@/components/layout/TopBar.vue'
import RewardAnimation from '@/components/common/RewardAnimation.vue'
import StarDisplay from '@/components/common/StarDisplay.vue'
import { pinyinData } from '@/data/pinyinData'
import { chineseData } from '@/data/chineseData'
import { englishData } from '@/data/englishData'
import { useUserStore } from '@/stores/userStore'

const router = useRouter()
const userStore = useUserStore()

interface MemoryCard {
  id: number
  pairId: string
  content: string
  type: 'pinyin' | 'chinese' | 'english'
  color: string
  flipped: boolean
  matched: boolean
}

type ViewState = 'playing' | 'result'

const viewState = ref<ViewState>('playing')
const cards = ref<MemoryCard[]>([])
const flippedCards = ref<number[]>([])
const moves = ref(0)
const pairsFound = ref(0)
const totalPairs = 8
const timeElapsed = ref(0)
const showReward = ref(false)
const isChecking = ref(false)
let timerInterval: ReturnType<typeof setInterval> | null = null

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function pickRandom<T>(arr: T[], count: number): T[] {
  return shuffle(arr).slice(0, count)
}

function initGame() {
  const pairs: { pairId: string; content: string; type: MemoryCard['type']; color: string }[] = []

  const pinyinItems = pickRandom(pinyinData, 4)
  for (const item of pinyinItems) {
    pairs.push({ pairId: `py-${item.id}`, content: item.pinyin, type: 'pinyin', color: '#FF9F43' })
  }

  const chineseItems = pickRandom(chineseData, 2)
  for (const item of chineseItems) {
    pairs.push({ pairId: `cn-${item.id}`, content: item.character, type: 'chinese', color: '#2ED573' })
  }

  const englishItems = pickRandom(englishData, 2)
  for (const item of englishItems) {
    pairs.push({ pairId: `en-${item.id}`, content: item.word, type: 'english', color: '#54A0FF' })
  }

  const allCards: MemoryCard[] = []
  let cardId = 0
  for (const pair of pairs) {
    for (let i = 0; i < 2; i++) {
      allCards.push({
        id: cardId++,
        pairId: pair.pairId,
        content: pair.content,
        type: pair.type,
        color: pair.color,
        flipped: false,
        matched: false,
      })
    }
  }

  cards.value = shuffle(allCards)
  flippedCards.value = []
  moves.value = 0
  pairsFound.value = 0
  timeElapsed.value = 0
  viewState.value = 'playing'
  showReward.value = false
  isChecking.value = false

  if (timerInterval) clearInterval(timerInterval)
  timerInterval = setInterval(() => {
    timeElapsed.value++
  }, 1000)
}

const starsEarned = computed(() => {
  return Math.max(1, 5 - Math.floor(moves.value / 8))
})

const formattedTime = computed(() => {
  const mins = Math.floor(timeElapsed.value / 60)
  const secs = timeElapsed.value % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
})

const typeLabel: Record<string, string> = {
  pinyin: '📝',
  chinese: '📖',
  english: '🌍',
}

function flipCard(index: number) {
  if (isChecking.value) return
  const card = cards.value[index]
  if (card.flipped || card.matched) return
  if (flippedCards.value.length >= 2) return

  card.flipped = true
  flippedCards.value.push(index)

  if (flippedCards.value.length === 2) {
    moves.value++
    isChecking.value = true
    const [first, second] = flippedCards.value
    const card1 = cards.value[first]
    const card2 = cards.value[second]

    if (card1.pairId === card2.pairId) {
      card1.matched = true
      card2.matched = true
      pairsFound.value++
      flippedCards.value = []
      isChecking.value = false

      if (pairsFound.value === totalPairs) {
        finishGame()
      }
    } else {
      setTimeout(() => {
        card1.flipped = false
        card2.flipped = false
        flippedCards.value = []
        isChecking.value = false
      }, 1000)
    }
  }
}

function finishGame() {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
  viewState.value = 'result'
  showReward.value = true
  userStore.addLearningRecord({
    module: 'games',
    topic: '记忆翻牌',
    action: 'memory',
    score: pairsFound.value,
    starsEarned: starsEarned.value,
    duration: timeElapsed.value,
  })
}

function restart() {
  initGame()
}

function goBack() {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
  router.push('/games')
}

onMounted(() => {
  initGame()
})

onUnmounted(() => {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
})
</script>

<template>
  <div class="min-h-screen pb-6" style="background-color: #FFF9E6">
    <TopBar title="记忆翻牌 🃏" />

    <div v-if="viewState === 'playing'" class="px-4 pt-4">
      <div class="mb-4 flex items-center justify-between rounded-2xl bg-white p-3 shadow-sm">
        <div class="flex items-center gap-1 text-sm font-bold text-gray-500">
          🔄 {{ moves }} 步
        </div>
        <div class="flex items-center gap-1 text-sm font-bold text-gray-500">
          🎯 {{ pairsFound }}/{{ totalPairs }}
        </div>
        <div class="flex items-center gap-1 text-sm font-bold text-gray-500">
          ⏱️ {{ formattedTime }}
        </div>
      </div>

      <div class="grid grid-cols-4 gap-2.5">
        <button
          v-for="(card, index) in cards"
          :key="card.id"
          class="relative flex aspect-square items-center justify-center rounded-2xl border-2 text-xl font-bold transition-all duration-300"
          :class="
            card.matched
              ? 'border-[#2ED573] bg-green-50 scale-95'
              : card.flipped
                ? 'border-[#54A0FF] bg-blue-50 rotate-0'
                : 'border-gray-200 bg-white hover:border-[#54A0FF] hover:shadow-md'
          "
          :style="!card.flipped && !card.matched ? { transform: 'scale(1)' } : {}"
          @click="flipCard(index)"
        >
          <template v-if="card.flipped || card.matched">
            <span
              class="text-2xl font-bold"
              :style="{ color: card.color }"
            >
              {{ card.content }}
            </span>
            <span class="absolute bottom-1 right-1 text-[10px]">
              {{ typeLabel[card.type] }}
            </span>
          </template>
          <template v-else>
            <span class="text-3xl">❓</span>
          </template>
        </button>
      </div>
    </div>

    <div v-else-if="viewState === 'result'" class="px-4 pt-4">
      <div class="mx-auto max-w-sm rounded-3xl bg-white p-6 text-center shadow-lg">
        <h2 class="mb-2 text-2xl font-bold text-gray-700">太棒了！🎉</h2>
        <p class="mb-4 text-gray-400">你找到了所有配对！</p>

        <div class="mb-4 grid grid-cols-3 gap-3">
          <div class="rounded-2xl p-3" style="background-color: #EBF5FF">
            <p class="text-2xl font-bold" style="color: #54A0FF">{{ moves }}</p>
            <p class="text-xs text-gray-400">步数</p>
          </div>
          <div class="rounded-2xl p-3" style="background-color: #FFF3D6">
            <p class="text-2xl font-bold" style="color: #FF9F43">{{ totalPairs }}</p>
            <p class="text-xs text-gray-400">配对</p>
          </div>
          <div class="rounded-2xl p-3" style="background-color: #F0FFF0">
            <p class="text-2xl font-bold" style="color: #2ED573">{{ formattedTime }}</p>
            <p class="text-xs text-gray-400">用时</p>
          </div>
        </div>

        <div class="mb-6 flex items-center justify-center gap-2">
          <StarDisplay :count="starsEarned" />
        </div>

        <div class="space-y-3">
          <button
            class="w-full rounded-2xl py-3 text-lg font-bold text-white transition-all active:scale-[0.97]"
            style="background-color: #54A0FF"
            @click="restart"
          >
            再玩一次 🔄
          </button>
          <button
            class="w-full rounded-2xl border-2 py-3 text-lg font-bold transition-all active:scale-[0.97]"
            style="border-color: #54A0FF; color: #54A0FF"
            @click="goBack"
          >
            返回 ←
          </button>
        </div>
      </div>
    </div>

    <RewardAnimation :show="showReward" :count="starsEarned" />
  </div>
</template>
