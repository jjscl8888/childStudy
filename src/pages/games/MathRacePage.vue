<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import TopBar from '@/components/layout/TopBar.vue'
import RewardAnimation from '@/components/common/RewardAnimation.vue'
import StarDisplay from '@/components/common/StarDisplay.vue'
import { generateMathProblems } from '@/data/mathData'
import type { MathProblem } from '@/data/mathData'
import { useUserStore } from '@/stores/userStore'

const router = useRouter()
const userStore = useUserStore()

type ViewState = 'countdown' | 'playing' | 'result'

const viewState = ref<ViewState>('countdown')
const problems = ref<MathProblem[]>([])
const currentIndex = ref(0)
const selectedOption = ref<number | null>(null)
const revealed = ref(false)
const correctCount = ref(0)
const timeElapsed = ref(0)
const showReward = ref(false)
const countdownValue = ref(3)
let timerInterval: ReturnType<typeof setInterval> | null = null
let countdownInterval: ReturnType<typeof setInterval> | null = null

const currentProblem = computed(() => problems.value[currentIndex.value] ?? null)

const starsEarned = computed(() => correctCount.value)

const formattedTime = computed(() => {
  const mins = Math.floor(timeElapsed.value / 60)
  const secs = timeElapsed.value % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
})

function initGame() {
  const allProblems: MathProblem[] = []
  for (let i = 0; i < 10; i++) {
    const level = Math.min(Math.floor(i / 2) + 2, 6)
    const probs = generateMathProblems(level, 1)
    allProblems.push(probs[0])
  }
  problems.value = allProblems
  currentIndex.value = 0
  selectedOption.value = null
  revealed.value = false
  correctCount.value = 0
  timeElapsed.value = 0
  viewState.value = 'countdown'
  showReward.value = false
  countdownValue.value = 3

  countdownInterval = setInterval(() => {
    countdownValue.value--
    if (countdownValue.value <= 0) {
      if (countdownInterval) clearInterval(countdownInterval)
      startRace()
    }
  }, 1000)
}

function startRace() {
  viewState.value = 'playing'
  timerInterval = setInterval(() => {
    timeElapsed.value++
  }, 1000)
}

function selectOption(option: number) {
  if (revealed.value) return
  selectedOption.value = option
  revealed.value = true

  if (option === currentProblem.value!.answer) {
    correctCount.value++
    setTimeout(() => {
      nextProblem()
    }, 500)
  } else {
    setTimeout(() => {
      nextProblem()
    }, 1500)
  }
}

function nextProblem() {
  if (currentIndex.value < problems.value.length - 1) {
    currentIndex.value++
    selectedOption.value = null
    revealed.value = false
  } else {
    finishRace()
  }
}

function finishRace() {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
  viewState.value = 'result'
  showReward.value = true
  userStore.addLearningRecord({
    module: 'games',
    topic: '数学竞速',
    action: 'math-race',
    score: correctCount.value,
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
  if (countdownInterval) {
    clearInterval(countdownInterval)
    countdownInterval = null
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
  if (countdownInterval) {
    clearInterval(countdownInterval)
    countdownInterval = null
  }
})
</script>

<template>
  <div class="min-h-screen pb-6" style="background-color: #FFF0F0">
    <TopBar title="数学竞速 🏎️" />

    <div v-if="viewState === 'countdown'" class="flex flex-col items-center justify-center px-4 pt-20">
      <div class="mb-6 text-center">
        <p class="mb-2 text-lg font-bold text-gray-500">准备好了吗？</p>
        <p class="text-sm text-gray-400">10道数学题，越快越好！</p>
      </div>
      <div
        :key="countdownValue"
        class="flex h-32 w-32 items-center justify-center rounded-full text-7xl font-bold text-white shadow-lg animate-bounce"
        style="background-color: #FF6B6B"
      >
        {{ countdownValue > 0 ? countdownValue : 'GO!' }}
      </div>
    </div>

    <div v-else-if="viewState === 'playing'" class="px-4 pt-4">
      <div class="mb-4 flex items-center justify-between rounded-2xl bg-white p-3 shadow-sm">
        <div class="flex items-center gap-1 text-sm font-bold" style="color: #FF6B6B">
          🏎️ 第 {{ currentIndex + 1 }}/{{ problems.length }} 题
        </div>
        <div class="flex items-center gap-1 text-sm font-bold text-gray-500">
          ⏱️ {{ formattedTime }}
        </div>
        <div class="flex items-center gap-1 text-sm font-bold text-yellow-500">
          ⭐ {{ correctCount }}
        </div>
      </div>

      <div class="mb-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          class="h-full rounded-full transition-all duration-300"
          :style="{
            width: ((currentIndex + 1) / problems.length * 100) + '%',
            backgroundColor: '#FF6B6B',
          }"
        />
      </div>

      <div v-if="currentProblem" class="mt-5">
        <div class="mb-5 rounded-2xl bg-white p-5 shadow-sm">
          <div class="mb-3 text-center text-2xl tracking-widest">
            {{ currentProblem.visualAid }}
          </div>
          <p class="text-center text-4xl font-bold" style="color: #FF6B6B">
            {{ currentProblem.question }}
          </p>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <button
            v-for="(option, idx) in currentProblem.options"
            :key="idx"
            class="flex items-center justify-center rounded-2xl border-2 py-4 text-2xl font-bold transition-all duration-200 active:scale-[0.95]"
            :class="
              revealed && option === currentProblem.answer
                ? 'bg-[#2ED573] text-white border-[#2ED573]'
                : revealed && option === selectedOption && option !== currentProblem.answer
                  ? 'bg-[#FF6B6B] text-white border-[#FF6B6B]'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-[#FF6B6B] hover:bg-red-50'
            "
            :disabled="revealed"
            @click="selectOption(option)"
          >
            {{ option }}
          </button>
        </div>

        <Transition name="feedback-fade">
          <div v-if="revealed && selectedOption === currentProblem.answer" class="mt-4 rounded-2xl bg-green-50 p-3 text-center">
            <p class="text-xl font-bold text-green-500">✓ 正确！</p>
          </div>
          <div v-else-if="revealed && selectedOption !== currentProblem.answer" class="mt-4 rounded-2xl bg-red-50 p-3 text-center">
            <p class="text-lg font-bold text-red-400">正确答案是 {{ currentProblem.answer }}</p>
          </div>
        </Transition>
      </div>
    </div>

    <div v-else-if="viewState === 'result'" class="px-4 pt-4">
      <div class="mx-auto max-w-sm rounded-3xl bg-white p-6 text-center shadow-lg">
        <h2 class="mb-2 text-2xl font-bold text-gray-700">竞速完成！🏁</h2>

        <div class="mb-4 grid grid-cols-2 gap-3">
          <div class="rounded-2xl p-4" style="background-color: #FFF0F0">
            <p class="text-4xl font-bold" style="color: #FF6B6B">{{ correctCount }}/{{ problems.length }}</p>
            <p class="mt-1 text-sm text-gray-400">答对题数</p>
          </div>
          <div class="rounded-2xl p-4" style="background-color: #FFF3D6">
            <p class="text-4xl font-bold" style="color: #FF9F43">{{ formattedTime }}</p>
            <p class="mt-1 text-sm text-gray-400">总用时</p>
          </div>
        </div>

        <div class="mb-6 flex items-center justify-center gap-2">
          <StarDisplay :count="starsEarned" />
        </div>

        <div class="space-y-3">
          <button
            class="w-full rounded-2xl py-3 text-lg font-bold text-white transition-all active:scale-[0.97]"
            style="background-color: #FF6B6B"
            @click="restart"
          >
            再来一次 🔄
          </button>
          <button
            class="w-full rounded-2xl border-2 py-3 text-lg font-bold transition-all active:scale-[0.97]"
            style="border-color: #FF6B6B; color: #FF6B6B"
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

<style scoped>
.feedback-fade-enter-active {
  transition: all 0.3s ease-out;
}
.feedback-fade-leave-active {
  transition: all 0.2s ease-in;
}
.feedback-fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}
.feedback-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
