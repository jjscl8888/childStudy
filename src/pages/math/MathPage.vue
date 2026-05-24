<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { Volume2 } from 'lucide-vue-next'
import TopBar from '@/components/layout/TopBar.vue'
import ProgressBar from '@/components/common/ProgressBar.vue'
import QuizOption from '@/components/common/QuizOption.vue'
import RewardAnimation from '@/components/common/RewardAnimation.vue'
import StarDisplay from '@/components/common/StarDisplay.vue'
import { mathLevels, generateMathProblems } from '@/data/mathData'
import type { MathProblem, MathLevel } from '@/data/mathData'
import { useUserStore } from '@/stores/userStore'
import { useTextToSpeech } from '@/composables/useTextToSpeech'

const userStore = useUserStore()
const tts = useTextToSpeech('zh-CN', 0.7)

type ViewState = 'levels' | 'practice' | 'summary'

const viewState = ref<ViewState>('levels')
const selectedLevel = ref<MathLevel | null>(null)
const problems = ref<MathProblem[]>([])
const currentIndex = ref(0)
const selectedOption = ref<number | null>(null)
const revealed = ref(false)
const correctCount = ref(0)
const showReward = ref(false)
const feedbackType = ref<'correct' | 'wrong' | null>(null)

const currentProblem = computed(() => problems.value[currentIndex.value] ?? null)

const starsEarned = computed(() => correctCount.value)

const praiseMessages = [
  '太棒了！你真厉害！',
  '完美！继续加油哦！',
  '你真是数学小天才！',
  '做得太好了！为你骄傲！',
  '了不起！继续保持！',
]

function getRandomPraise(): string {
  return praiseMessages[Math.floor(Math.random() * praiseMessages.length)]
}

function speakQuestion() {
  if (!currentProblem.value) return
  const q = currentProblem.value.question
  const spoken = q.replace(/=/g, '等于').replace(/\+/g, '加').replace(/-/g, '减').replace(/×/g, '乘').replace(/÷/g, '除以')
  setTimeout(() => {
    tts.speak(spoken, { lang: 'zh-CN', rate: 0.7 })
  }, 400)
}

watch(currentIndex, () => {
  speakQuestion()
})

function startLevel(level: MathLevel) {
  selectedLevel.value = level
  problems.value = generateMathProblems(level.level, 5)
  currentIndex.value = 0
  correctCount.value = 0
  selectedOption.value = null
  revealed.value = false
  feedbackType.value = null
  viewState.value = 'practice'
  userStore.startSession()
  setTimeout(() => {
    tts.speak(`开始${level.name}！认真算一算，选出正确答案。`, { lang: 'zh-CN', rate: 0.7 })
  }, 400)
  setTimeout(() => {
    speakQuestion()
  }, 2500)
}

function selectOption(option: number) {
  if (revealed.value) return
  selectedOption.value = option
  revealed.value = true

  if (option === currentProblem.value!.answer) {
    correctCount.value++
    feedbackType.value = 'correct'
    tts.speak('答对了！', { lang: 'zh-CN', rate: 0.8 })
  } else {
    feedbackType.value = 'wrong'
    tts.speak('再想想哦', { lang: 'zh-CN', rate: 0.8 })
  }
}

function nextProblem() {
  if (currentIndex.value < problems.value.length - 1) {
    currentIndex.value++
    selectedOption.value = null
    revealed.value = false
    feedbackType.value = null
  } else {
    finishPractice()
  }
}

function finishPractice() {
  viewState.value = 'summary'
  showReward.value = true
  userStore.addLearningRecord({
    module: 'math',
    topic: selectedLevel.value!.name,
    action: 'practice',
    score: correctCount.value,
    starsEarned: starsEarned.value,
    duration: 180,
  })

  setTimeout(() => {
    const ratio = correctCount.value / problems.value.length
    if (ratio >= 0.8) {
      tts.speak(`太厉害了！答对了${correctCount.value}道题！${getRandomPraise()}`, { lang: 'zh-CN', rate: 0.8 })
    } else if (ratio >= 0.5) {
      tts.speak(`不错哦！答对了${correctCount.value}道题！继续努力！`, { lang: 'zh-CN', rate: 0.8 })
    } else {
      tts.speak(`答对了${correctCount.value}道题。多练习几次会更好的，加油！`, { lang: 'zh-CN', rate: 0.8 })
    }
  }, 600)
}

function goBack() {
  if (viewState.value === 'practice') {
    viewState.value = 'levels'
  } else if (viewState.value === 'summary') {
    viewState.value = 'levels'
  }
}

function restartLevel() {
  if (selectedLevel.value) {
    startLevel(selectedLevel.value)
  }
}

onUnmounted(() => {
  tts.stop()
})
</script>

<template>
  <div class="math-page min-h-screen pb-6" style="background-color: #FFF0F0">
    <TopBar title="数学城堡 🔢" />

    <div v-if="viewState === 'levels'" class="px-4 pt-4">
      <div class="mb-4 text-center">
        <h2 class="text-xl font-bold text-gray-700">选择关卡</h2>
        <p class="text-sm text-gray-400 mt-1">每关5道题，加油哦！💪</p>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <button
          v-for="level in mathLevels"
          :key="level.id"
          class="flex flex-col items-center rounded-2xl border-3 bg-white p-4 shadow-sm transition-all active:scale-[0.96]"
          :style="{ borderColor: level.color + '60' }"
          @click="startLevel(level)"
        >
          <div
            class="mb-2 flex h-14 w-14 items-center justify-center rounded-xl text-3xl"
            :style="{ backgroundColor: level.color + '18' }"
          >
            {{ level.icon }}
          </div>
          <h3 class="text-base font-bold text-gray-700">{{ level.name }}</h3>
          <p class="mt-0.5 text-xs text-gray-400">{{ level.description }}</p>
          <div
            class="mt-2 h-1.5 w-full overflow-hidden rounded-full"
            style="background-color: #f3f4f6"
          >
            <div
              class="h-full rounded-full transition-all duration-500"
              :style="{
                width: Math.min(userStore.getModuleProgress('math') * 5, 100) + '%',
                backgroundColor: level.color,
              }"
            />
          </div>
        </button>
      </div>
    </div>

    <div v-else-if="viewState === 'practice'" class="px-4 pt-4">
      <div class="mb-4 flex items-center justify-between">
        <button
          class="flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold text-white transition-colors active:scale-[0.96]"
          style="background-color: #FF6B6B"
          @click="goBack"
        >
          ← 返回
        </button>
        <span class="text-sm font-bold text-gray-500">
          {{ selectedLevel?.icon }} {{ selectedLevel?.name }}
        </span>
      </div>

      <ProgressBar
        :current="currentIndex + 1"
        :total="problems.length"
        color="#FF6B6B"
      />

      <div v-if="currentProblem" class="mt-6">
        <div class="mb-4 rounded-2xl bg-white p-5 shadow-sm">
          <div class="mb-3 text-center text-3xl tracking-widest">
            {{ currentProblem.visualAid }}
          </div>
          <div class="flex items-center justify-center gap-2">
            <p class="text-center text-4xl font-bold" style="color: #FF6B6B">
              {{ currentProblem.question }}
            </p>
            <button
              class="flex items-center justify-center rounded-full transition-all active:scale-90"
              style="background-color: #FF6B6B18; color: #FF6B6B; width: 32px; height: 32px"
              @click="speakQuestion"
            >
              <Volume2 class="h-4 w-4" />
            </button>
          </div>
        </div>

        <div class="mt-4 space-y-3">
          <QuizOption
            v-for="(option, idx) in currentProblem.options"
            :key="idx"
            :text="String(option)"
            :correct="option === currentProblem.answer"
            :selected="option === selectedOption"
            :revealed="revealed"
            @select="selectOption(option)"
          />
        </div>

        <Transition name="feedback-fade">
          <div v-if="feedbackType === 'correct'" class="mt-4 rounded-2xl bg-green-50 p-4 text-center">
            <p class="text-2xl font-bold text-green-500">✓ 太棒了！</p>
          </div>
          <div v-else-if="feedbackType === 'wrong'" class="mt-4 rounded-2xl bg-red-50 p-4 text-center">
            <p class="text-lg font-bold text-red-400">再想想哦 🤔</p>
            <p class="mt-1 text-sm text-gray-500">{{ currentProblem.hint }}</p>
          </div>
        </Transition>

        <Transition name="feedback-fade">
          <button
            v-if="revealed"
            class="mt-4 w-full rounded-2xl py-3 text-lg font-bold text-white transition-all active:scale-[0.97]"
            style="background-color: #FF6B6B"
            @click="nextProblem"
          >
            {{ currentIndex < problems.length - 1 ? '下一题 →' : '查看成绩 🎉' }}
          </button>
        </Transition>
      </div>
    </div>

    <div v-else-if="viewState === 'summary'" class="px-4 pt-4">
      <div class="mx-auto max-w-sm rounded-3xl bg-white p-6 text-center shadow-lg">
        <h2 class="mb-2 text-2xl font-bold text-gray-700">练习完成！🎉</h2>
        <p class="mb-4 text-gray-400">{{ selectedLevel?.icon }} {{ selectedLevel?.name }}</p>

        <div class="mb-4 rounded-2xl p-4" style="background-color: #FFF0F0">
          <p class="text-5xl font-bold" style="color: #FF6B6B">
            {{ correctCount }}/{{ problems.length }}
          </p>
          <p class="mt-1 text-sm text-gray-400">答对题数</p>
        </div>

        <div class="mb-6 flex items-center justify-center gap-2">
          <StarDisplay :count="starsEarned" />
        </div>

        <div class="space-y-3">
          <button
            class="w-full rounded-2xl py-3 text-lg font-bold text-white transition-all active:scale-[0.97]"
            style="background-color: #FF6B6B"
            @click="restartLevel"
          >
            再来一次 🔄
          </button>
          <button
            class="w-full rounded-2xl border-2 py-3 text-lg font-bold transition-all active:scale-[0.97]"
            style="border-color: #FF6B6B; color: #FF6B6B"
            @click="goBack"
          >
            返回选关 ←
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
