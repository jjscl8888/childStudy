<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Volume2 } from 'lucide-vue-next'
import TopBar from '@/components/layout/TopBar.vue'
import ProgressBar from '@/components/common/ProgressBar.vue'
import RewardAnimation from '@/components/common/RewardAnimation.vue'
import StarDisplay from '@/components/common/StarDisplay.vue'
import { pinyinData } from '@/data/pinyinData'
import { chineseData } from '@/data/chineseData'
import { englishData } from '@/data/englishData'
import { generateMathProblems } from '@/data/mathData'
import type { MathProblem } from '@/data/mathData'
import { useUserStore } from '@/stores/userStore'
import { useTextToSpeech } from '@/composables/useTextToSpeech'

const router = useRouter()
const userStore = useUserStore()
const tts = useTextToSpeech('zh-CN', 0.7)

interface QuizQuestion {
  id: string
  type: 'pinyin' | 'chinese' | 'english' | 'math'
  question: string
  options: string[]
  correctIndex: number
  imageUrl?: string
  emoji?: string
  visualAid?: string
}

type ViewState = 'playing' | 'result'

const viewState = ref<ViewState>('playing')
const currentIndex = ref(0)
const selectedIndex = ref<number | null>(null)
const revealed = ref(false)
const correctCount = ref(0)
const showReward = ref(false)
const starAnimation = ref(false)
const starAnimationKey = ref(0)
const imageLoadError = ref(false)

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

function generateQuestions(): QuizQuestion[] {
  const questions: QuizQuestion[] = []

  const pinyinItems = pickRandom(pinyinData, 2)
  for (const item of pinyinItems) {
    const wrongOptions = pickRandom(
      pinyinData.filter(p => p.pinyin !== item.pinyin),
      3
    ).map(p => p.pinyin)
    const options = shuffle([item.pinyin, ...wrongOptions])
    questions.push({
      id: `py-${item.id}`,
      type: 'pinyin',
      question: `哪个拼音是"${item.example}"？`,
      options,
      correctIndex: options.indexOf(item.pinyin),
      imageUrl: item.imageUrl,
      emoji: item.emoji,
    })
  }

  const chineseItems = pickRandom(chineseData, 2)
  for (const item of chineseItems) {
    const wrongOptions = pickRandom(
      chineseData.filter(c => c.character !== item.character),
      3
    ).map(c => c.character)
    const options = shuffle([item.character, ...wrongOptions])
    questions.push({
      id: `cn-${item.id}`,
      type: 'chinese',
      question: '这是什么字？',
      options,
      correctIndex: options.indexOf(item.character),
      imageUrl: item.imageUrl,
      emoji: item.emoji,
    })
  }

  const englishItems = pickRandom(englishData, 2)
  for (const item of englishItems) {
    const wrongOptions = pickRandom(
      englishData.filter(e => e.word !== item.word),
      3
    ).map(e => e.word)
    const options = shuffle([item.word, ...wrongOptions])
    questions.push({
      id: `en-${item.id}`,
      type: 'english',
      question: "What's this in English?",
      options,
      correctIndex: options.indexOf(item.word),
      imageUrl: item.imageUrl,
      emoji: item.emoji,
    })
  }

  const mathProblems: MathProblem[] = generateMathProblems(4, 2)
  for (const prob of mathProblems) {
    const options = prob.options.map(String)
    questions.push({
      id: `math-${prob.id}`,
      type: 'math',
      question: prob.question,
      options,
      correctIndex: options.indexOf(String(prob.answer)),
      visualAid: prob.visualAid,
    })
  }

  return shuffle(questions)
}

const questions = ref<QuizQuestion[]>(generateQuestions())

const currentQuestion = computed(() => questions.value[currentIndex.value])

const starsEarned = computed(() => correctCount.value)

const resultMessage = computed(() => {
  const score = correctCount.value
  if (score === 8) return '🏆 完美满分！你太厉害了！'
  if (score >= 6) return '🌟 非常棒！继续加油！'
  if (score >= 4) return '💪 不错哦！再试试会更好！'
  return '😊 别灰心，多练习就会进步！'
})

const typeLabel: Record<string, string> = {
  pinyin: '📝 拼音',
  chinese: '📖 汉字',
  english: '🌍 英语',
  math: '🔢 数学',
}

function speakQuestion() {
  if (!currentQuestion.value) return
  const q = currentQuestion.value.question
  const spoken = q.replace(/=/g, '等于').replace(/\+/g, '加').replace(/-/g, '减').replace(/×/g, '乘').replace(/÷/g, '除以')
  const lang = currentQuestion.value.type === 'english' ? 'en-US' : 'zh-CN'
  tts.speak(spoken, { lang, rate: 0.7 })
}

function onImageError() {
  imageLoadError.value = true
}

function selectOption(index: number) {
  if (revealed.value) return
  selectedIndex.value = index
  revealed.value = true

  if (index === currentQuestion.value!.correctIndex) {
    correctCount.value++
    starAnimationKey.value++
    starAnimation.value = true
    setTimeout(() => {
      starAnimation.value = false
    }, 800)
  }

  setTimeout(() => {
    nextQuestion()
  }, revealed.value && index !== currentQuestion.value!.correctIndex ? 1500 : 1000)
}

function nextQuestion() {
  if (currentIndex.value < questions.value.length - 1) {
    currentIndex.value++
    selectedIndex.value = null
    revealed.value = false
    imageLoadError.value = false
  } else {
    finishQuiz()
  }
}

function finishQuiz() {
  viewState.value = 'result'
  showReward.value = true
  userStore.addLearningRecord({
    module: 'games',
    topic: '综合测验',
    action: 'quiz',
    score: correctCount.value,
    starsEarned: starsEarned.value,
    duration: 120,
  })
  if (correctCount.value === 8) {
    userStore.unlockAchievement('perfect_quiz')
  }
}

function restart() {
  questions.value = generateQuestions()
  currentIndex.value = 0
  selectedIndex.value = null
  revealed.value = false
  imageLoadError.value = false
  correctCount.value = 0
  viewState.value = 'playing'
  showReward.value = false
}

function goBack() {
  router.push('/games')
}
</script>

<template>
  <div class="min-h-screen pb-6" style="background-color: #FFF9E6">
    <TopBar title="综合测验 🧠" />

    <div v-if="viewState === 'playing'" class="px-4 pt-4">
      <ProgressBar
        :current="currentIndex + 1"
        :total="questions.length"
        color="#FF9F43"
      />

      <div v-if="currentQuestion" class="mt-5">
        <div class="mb-3 flex items-center gap-2">
          <span
            class="rounded-full px-3 py-1 text-xs font-bold text-white"
            :style="{ backgroundColor: currentQuestion.type === 'pinyin' ? '#FF9F43' : currentQuestion.type === 'chinese' ? '#2ED573' : currentQuestion.type === 'english' ? '#54A0FF' : '#FF6B6B' }"
          >
            {{ typeLabel[currentQuestion.type] }}
          </span>
          <span class="text-sm text-gray-400">第 {{ currentIndex + 1 }}/{{ questions.length }} 题</span>
        </div>

        <div class="mb-5 rounded-2xl bg-white p-5 shadow-sm">
          <img
            v-if="currentQuestion.imageUrl && !imageLoadError"
            :src="currentQuestion.imageUrl"
            :alt="currentQuestion.question"
            class="mx-auto mb-3 h-32 w-32 rounded-xl object-cover"
            @error="onImageError"
          />
          <div
            v-else-if="currentQuestion.emoji"
            class="mx-auto mb-3 flex h-32 w-32 items-center justify-center rounded-xl bg-orange-50 text-6xl"
          >
            {{ currentQuestion.emoji }}
          </div>
          <div v-if="currentQuestion.visualAid" class="mb-2 text-center text-2xl tracking-widest">
            {{ currentQuestion.visualAid }}
          </div>
          <div class="flex items-center justify-center gap-2">
            <p class="text-center text-xl font-bold text-gray-700">
              {{ currentQuestion.question }}
            </p>
            <button
              class="flex items-center justify-center rounded-full transition-all active:scale-90"
              style="background-color: #FF9F4318; color: #FF9F43; width: 32px; height: 32px"
              @click="speakQuestion"
            >
              <Volume2 class="h-4 w-4" />
            </button>
          </div>
        </div>

        <div class="space-y-3">
          <button
            v-for="(option, idx) in currentQuestion.options"
            :key="idx"
            class="flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-3.5 text-left text-lg font-semibold transition-all duration-200 active:scale-[0.97]"
            :class="
              revealed && idx === currentQuestion.correctIndex
                ? 'bg-[#2ED573] text-white border-[#2ED573]'
                : revealed && idx === selectedIndex && idx !== currentQuestion.correctIndex
                  ? 'bg-[#FF6B6B] text-white border-[#FF6B6B]'
                  : selectedIndex === idx
                    ? 'bg-[#FF9F43] text-white border-[#FF9F43]'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-[#FF9F43] hover:bg-orange-50'
            "
            :disabled="revealed"
            @click="selectOption(idx)"
          >
            <span
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base font-bold"
              :class="
                revealed && idx === currentQuestion.correctIndex
                  ? 'bg-white/30'
                  : revealed && idx === selectedIndex && idx !== currentQuestion.correctIndex
                    ? 'bg-white/30'
                    : 'bg-orange-100 text-[#FF9F43]'
              "
            >
              {{ ['A', 'B', 'C', 'D'][idx] }}
            </span>
            <span>{{ option }}</span>
          </button>
        </div>

        <Transition name="star-pop">
          <div
            v-if="starAnimation"
            :key="starAnimationKey"
            class="pointer-events-none fixed left-1/2 top-1/3 z-50 -translate-x-1/2 text-3xl font-bold text-yellow-500"
          >
            +1⭐
          </div>
        </Transition>
      </div>
    </div>

    <div v-else-if="viewState === 'result'" class="px-4 pt-4">
      <div class="mx-auto max-w-sm rounded-3xl bg-white p-6 text-center shadow-lg">
        <h2 class="mb-2 text-2xl font-bold text-gray-700">测验完成！🎉</h2>

        <div class="mb-4 rounded-2xl p-5" style="background-color: #FFF3D6">
          <p class="text-5xl font-bold" style="color: #FF9F43">
            {{ correctCount }}/{{ questions.length }}
          </p>
          <p class="mt-1 text-sm text-gray-400">答对题数</p>
        </div>

        <p class="mb-4 text-lg font-bold text-gray-600">{{ resultMessage }}</p>

        <div class="mb-6 flex items-center justify-center gap-2">
          <StarDisplay :count="starsEarned" />
        </div>

        <div class="space-y-3">
          <button
            class="w-full rounded-2xl py-3 text-lg font-bold text-white transition-all active:scale-[0.97]"
            style="background-color: #FF9F43"
            @click="restart"
          >
            再来一次 🔄
          </button>
          <button
            class="w-full rounded-2xl border-2 py-3 text-lg font-bold transition-all active:scale-[0.97]"
            style="border-color: #FF9F43; color: #FF9F43"
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
.star-pop-enter-active {
  animation: starPop 0.8s ease-out;
}
.star-pop-leave-active {
  animation: starPop 0.3s ease-in reverse;
}
@keyframes starPop {
  0% {
    opacity: 0;
    transform: translate(-50%, 0) scale(0.5);
  }
  30% {
    opacity: 1;
    transform: translate(-50%, -20px) scale(1.3);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -80px) scale(0.8);
  }
}
</style>
