<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Volume2, Star } from 'lucide-vue-next'
import { chineseData } from '@/data/chineseData'
import { useUserStore } from '@/stores/userStore'
import { useLearningPathStore } from '@/stores/learningPathStore'
import { useSpacedRepetitionStore } from '@/stores/spacedRepetitionStore'
import { useTextToSpeech } from '@/composables/useTextToSpeech'
import SessionProgress from '@/components/learning/SessionProgress.vue'
import HanziStrokeWriter from '@/components/learning/HanziStrokeWriter.vue'
import CompanionGuide from '@/components/learning/CompanionGuide.vue'
import RewardAnimation from '@/components/common/RewardAnimation.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const learningPathStore = useLearningPathStore()
const spacedRepetition = useSpacedRepetitionStore()
const tts = useTextToSpeech('zh-CN', 0.6)

const id = computed(() => route.params.id as string)
const character = computed(() => chineseData.find(c => c.id === id.value))

const TOTAL_STEPS = 5
const currentStep = ref(0)
const showReward = ref(false)
const sessionCompleted = ref(false)
const companionMsg = ref('')
const companionEmotion = ref<'happy' | 'encourage' | 'think' | 'celebrate'>('happy')

const writingCompleted = ref(false)
const writingAccuracy = ref(0)
const selectedOption = ref<string | null>(null)
const revealed = ref(false)
const correctAnswers = ref(0)
const stepResults = ref<{ step: number; score: number; stars: number }[]>([])

const sessionSteps = [
  { label: '看图识字', icon: '👀' },
  { label: '字源故事', icon: '📜' },
  { label: '书写练习', icon: '✍️' },
  { label: '组词造句', icon: '💬' },
  { label: '巩固挑战', icon: '🏆' },
]

const quizOptions = computed(() => {
  if (!character.value) return []
  const correct = character.value.character
  const others = chineseData
    .filter(c => c.character !== correct)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
    .map(c => c.character)
  return [...others, correct].sort(() => Math.random() - 0.5)
})

const wordQuizOptions = computed(() => {
  if (!character.value) return []
  const words = character.value.words.map(w => w.word)
  const otherWords = chineseData
    .filter(c => c.id !== character.value!.id)
    .flatMap(c => c.words.map(w => w.word))
    .filter(w => !words.includes(w))
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
  return [...otherWords, ...words.slice(0, 1)].sort(() => Math.random() - 0.5)
})

function setCompanion(msg: string, emotion: 'happy' | 'encourage' | 'think' | 'celebrate' = 'happy') {
  companionMsg.value = msg
  companionEmotion.value = emotion
}

function playSound() {
  if (!character.value) return
  tts.speak(character.value.character, { lang: 'zh-CN', rate: 0.6 })
}

function speakText(text: string, rate: number = 0.7) {
  tts.speak(text, { lang: 'zh-CN', rate })
}

function onWritingComplete(accuracy: number) {
  writingCompleted.value = true
  writingAccuracy.value = accuracy
  const stars = accuracy >= 80 ? 3 : accuracy >= 50 ? 2 : 1
  stepResults.value.push({ step: 2, score: accuracy, stars })
  if (accuracy >= 80) {
    setCompanion('字写得真漂亮！像小书法家一样！✨', 'celebrate')
  } else {
    setCompanion('写得不错！多练几次会更好哦！', 'encourage')
  }
}

function selectOption(option: string) {
  if (revealed.value) return
  selectedOption.value = option
  revealed.value = true
  const isCorrect = option === character.value?.character
  if (isCorrect) {
    correctAnswers.value++
    stepResults.value.push({ step: 4, score: 100, stars: 3 })
    setCompanion('答对了！你已经认识这个字了！🎉', 'celebrate')
  } else {
    stepResults.value.push({ step: 4, score: 0, stars: 1 })
    setCompanion(`正确答案是"${character.value?.character}"，记住啦！`, 'encourage')
  }
}

function selectWordOption(option: string) {
  if (revealed.value && currentStep.value === 3) return
  selectedOption.value = option
  revealed.value = true
  const isCorrect = character.value?.words.some(w => w.word === option)
  if (isCorrect) {
    correctAnswers.value++
    stepResults.value.push({ step: 3, score: 100, stars: 3 })
    setCompanion('太棒了！组词也难不倒你！', 'celebrate')
  } else {
    stepResults.value.push({ step: 3, score: 0, stars: 1 })
    setCompanion('没关系，看看正确答案吧！', 'encourage')
  }
}

const praiseMessages = [
  '太棒了！你真厉害！',
  '完美！继续加油哦！',
  '你真是学习小天才！',
  '做得太好了！为你骄傲！',
  '了不起！继续保持！',
]

function getRandomPraise(): string {
  return praiseMessages[Math.floor(Math.random() * praiseMessages.length)]
}

function speakIntro(text: string) {
  setTimeout(() => {
    tts.speak(text, { lang: 'zh-CN', rate: 0.7 })
  }, 600)
}

function speakStepIntro(step: number) {
  if (!character.value) return
  switch (step) {
    case 0:
      speakIntro(`来认识汉字${character.value.character}。它的拼音是${character.value.pinyin}。点击听一听发音按钮。`)
      break
    case 1:
      speakIntro(`每个汉字都有自己的故事。来听听${character.value.character}字是怎么来的。`)
      break
    case 2:
      speakIntro(`现在来写一写${character.value.character}字。在格子里认真写三次哦。`)
      break
    case 3:
      speakIntro(`来学学${character.value.character}字怎么组词造句吧。`)
      break
    case 4:
      speakIntro(`最后一关！看看你是不是真的学会了${character.value.character}字。`)
      break
  }
}

function nextStep() {
  if (currentStep.value < TOTAL_STEPS - 1) {
    currentStep.value++
    selectedOption.value = null
    revealed.value = false

    if (currentStep.value === 0) {
      setCompanion(`来认识汉字"${character.value?.character}"吧！先看看它的样子~`, 'happy')
    } else if (currentStep.value === 1) {
      setCompanion('每个汉字都有自己的故事哦！来听听~', 'think')
    } else if (currentStep.value === 2) {
      setCompanion('动手写一写，记得更牢哦！✍️', 'think')
    } else if (currentStep.value === 3) {
      setCompanion('来学学这个字怎么组词吧！💬', 'happy')
    } else if (currentStep.value === 4) {
      setCompanion('最后一关！看看你是不是真的学会了！🏆', 'encourage')
    }

    speakStepIntro(currentStep.value)
  } else {
    finishSession()
  }
}

function finishSession() {
  sessionCompleted.value = true
  showReward.value = true

  const totalStars = stepResults.value.reduce((sum, r) => sum + r.stars, 0)
  const avgScore = stepResults.value.length > 0
    ? stepResults.value.reduce((sum, r) => sum + r.score, 0) / stepResults.value.length
    : 0

  learningPathStore.completeNode('chinese', id.value, totalStars)
  spacedRepetition.addReviewItem('chinese', id.value)

  const quality = avgScore >= 80 ? 'easy' : avgScore >= 50 ? 'good' : 'hard'
  spacedRepetition.processReview('chinese', id.value, quality)

  userStore.addLearningRecord({
    module: 'chinese',
    topic: character.value?.character || id.value,
    action: 'learn',
    score: Math.round(avgScore),
    starsEarned: totalStars,
    duration: Math.round((Date.now() - (learningPathStore.currentSession?.startTime || Date.now())) / 1000),
  })

  setCompanion('太棒了！你又学会了一个新字！🌟', 'celebrate')

  setTimeout(() => {
    if (avgScore >= 80) {
      tts.speak(`完美！汉字${character.value?.character}你已经完全掌握了！${getRandomPraise()}`, { lang: 'zh-CN', rate: 0.8 })
    } else if (avgScore >= 50) {
      tts.speak(`不错哦！汉字${character.value?.character}学习完成！继续努力！`, { lang: 'zh-CN', rate: 0.8 })
    } else {
      tts.speak(`汉字${character.value?.character}学习完成！多练习几次会更好的，加油！`, { lang: 'zh-CN', rate: 0.8 })
    }
  }, 800)
}

function goBack() {
  if (learningPathStore.currentSession) {
    learningPathStore.abandonSession()
  }
  router.push('/chinese')
}

function goHome() {
  if (learningPathStore.currentSession) {
    learningPathStore.abandonSession()
  }
  router.push('/')
}

function goToNext() {
  const nodes = learningPathStore.getModuleNodes('chinese')
  const currentNode = nodes.find(n => n.itemId === id.value)
  if (currentNode) {
    const nextNode = nodes.find(n => n.order === currentNode.order + 1)
    if (nextNode) {
      resetSession()
      router.replace(`/chinese/${nextNode.itemId}`)
      return
    }
  }
  router.push('/chinese')
}

function resetSession() {
  currentStep.value = 0
  showReward.value = false
  sessionCompleted.value = false
  companionMsg.value = ''
  writingCompleted.value = false
  writingAccuracy.value = 0
  selectedOption.value = null
  revealed.value = false
  correctAnswers.value = 0
  stepResults.value = []
}

watch(id, (newId) => {
  if (!newId) return
  const newItem = chineseData.find(c => c.id === newId)
  if (!newItem) return
  resetSession()
  learningPathStore.startSession('chinese', newId, TOTAL_STEPS)
  setCompanion(`来认识汉字"${newItem.character}"吧！先看看它的样子~`, 'happy')
  speakStepIntro(0)
})

onMounted(() => {
  if (!character.value) {
    router.replace('/chinese')
    return
  }
  learningPathStore.startSession('chinese', id.value, TOTAL_STEPS)
  setCompanion(`来认识汉字"${character.value.character}"吧！先看看它的样子~`, 'happy')
  speakStepIntro(0)
})

onUnmounted(() => {
  tts.stop()
})
</script>

<template>
  <div class="min-h-screen pb-8" style="background-color: #F0FFF4">
    <header class="sticky top-0 z-50 flex items-center gap-3 px-4 py-3 shadow-sm" style="background-color: #F0FFF4">
      <button
        class="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-green-100"
        @click="goBack"
      >
        <ArrowLeft class="h-6 w-6" style="color: #2ED573" />
      </button>
      <h1 class="flex-1 text-center text-lg font-bold" style="color: #2ED573">
        汉字花园 📖
      </h1>
      <div class="flex items-center gap-1.5 rounded-full px-3 py-1" style="background-color: #E8F8E8">
        <Star class="h-5 w-5 fill-yellow-400 text-yellow-400" />
        <span class="text-sm font-bold text-yellow-600">{{ userStore.totalStars }}</span>
      </div>
    </header>

    <div v-if="character && !sessionCompleted" class="px-4 pt-3">
      <SessionProgress
        :current-step="currentStep"
        :total-steps="TOTAL_STEPS"
        :steps="sessionSteps"
        color="#2ED573"
      />

      <CompanionGuide
        :message="companionMsg"
        :emotion="companionEmotion"
        :show="!!companionMsg"
        class="mt-4 mb-4"
      />

      <Transition name="step" mode="out-in">
        <div v-if="currentStep === 0" key="step0" class="flex flex-col items-center gap-5">
          <div class="fun-card flex flex-col items-center gap-5 py-8 w-full">
            <h3 class="text-xl font-bold text-gray-600">看图识字 👀</h3>

            <div
              class="mb-2 flex h-44 w-44 items-center justify-center rounded-3xl shadow-lg"
              style="background: linear-gradient(135deg, #2ED57322, #2ED57308)"
            >
              <span class="font-bold text-gray-800" style="font-size: 140px; line-height: 1">
                {{ character.character }}
              </span>
            </div>

            <p class="text-2xl font-bold" style="color: #2ED573">{{ character.pinyin }}</p>

            <div class="flex h-36 w-48 items-center justify-center rounded-2xl shadow-md" style="background-color: #2ED57318">
              <span class="text-7xl">{{ character.emoji }}</span>
            </div>

            <button
              class="flex items-center gap-2 rounded-full px-6 py-3 text-base font-bold text-white shadow-md transition-all active:scale-95"
              style="background-color: #2ED573"
              @click="playSound"
            >
              <Volume2 class="h-5 w-5" />
              听一听发音
            </button>
          </div>

          <button class="fun-btn-success w-full text-lg" @click="nextStep">
            认识了！下一步 →
          </button>
        </div>

        <div v-else-if="currentStep === 1" key="step1" class="flex flex-col items-center gap-5">
          <div class="fun-card flex flex-col items-center gap-4 py-6 w-full">
            <h3 class="text-xl font-bold text-gray-600">字源故事 📜</h3>

            <div class="text-5xl mb-2">📜</div>

            <div
              class="w-full rounded-2xl bg-white p-5 shadow-md"
              style="border: 3px dashed #2ED573"
            >
              <div class="mb-3 flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="text-2xl">✨</span>
                  <h3 class="text-lg font-bold" style="color: #2ED573">
                    {{ character.character }} 的故事
                  </h3>
                </div>
                <button
                  class="flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-bold transition-all active:scale-95"
                  style="background-color: #2ED57318; color: #2ED573"
                  @click="speakText(character.originStory, 0.8)"
                >
                  <Volume2 class="h-4 w-4" />
                  听故事
                </button>
              </div>
              <p class="leading-relaxed text-gray-700 text-base">
                {{ character.originStory }}
              </p>
            </div>

            <div
              class="flex items-center gap-2 rounded-xl px-4 py-2"
              style="background-color: #2ED57318"
            >
              <span class="text-lg">🔍</span>
              <span class="text-sm font-medium" style="color: #2ED573">
                古人就是根据事物的样子造出了这个字哦！
              </span>
            </div>
          </div>

          <button class="fun-btn-success w-full text-lg" @click="nextStep">
            真有趣！去写字 →
          </button>
        </div>

        <div v-else-if="currentStep === 2" key="step2" class="flex flex-col items-center gap-5">
          <div class="fun-card flex flex-col items-center gap-4 py-6 w-full">
            <h3 class="text-xl font-bold text-gray-600">书写练习 ✍️</h3>

            <HanziStrokeWriter
              :character="character.character"
              color="#2ED573"
              :size="220"
              :required-count="3"
              @complete="onWritingComplete"
            />
          </div>

          <button
            v-if="writingCompleted"
            class="fun-btn-success w-full text-lg"
            @click="nextStep"
          >
            写好了！去组词 →
          </button>
        </div>

        <div v-else-if="currentStep === 3" key="step3" class="flex flex-col items-center gap-5">
          <div class="fun-card flex flex-col items-center gap-5 py-8 w-full">
            <h3 class="text-xl font-bold text-gray-600">组词造句 💬</h3>

            <div class="w-full rounded-2xl bg-white p-5 shadow-md mb-2">
              <div class="mb-3 flex items-center justify-between">
                <h3 class="text-base font-bold text-gray-600">组词</h3>
                <button
                  class="flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-bold transition-all active:scale-95"
                  style="background-color: #2ED57318; color: #2ED573"
                  @click="speakText(character.words.map(w => w.word).join('、'))"
                >
                  <Volume2 class="h-4 w-4" />
                  听读音
                </button>
              </div>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="(w, idx) in character.words"
                  :key="idx"
                  class="rounded-full px-4 py-1.5 text-base font-bold text-white transition-all active:scale-95"
                  :style="{
                    backgroundColor: ['#2ED573', '#FF9F43', '#54A0FF', '#FF6B6B', '#A55EEA'][idx % 5],
                  }"
                  @click="speakText(w.word)"
                >
                  {{ w.word }}
                  <span class="ml-1 text-xs font-normal opacity-80">{{ w.pinyin }}</span>
                </button>
              </div>
            </div>

            <div class="w-full rounded-2xl bg-white p-5 shadow-md mb-2">
              <div class="mb-3 flex items-center justify-between">
                <h3 class="text-base font-bold text-gray-600">造句</h3>
                <button
                  class="flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-bold transition-all active:scale-95"
                  style="background-color: #2ED57318; color: #2ED573"
                  @click="speakText(character.sentence, 0.7)"
                >
                  <Volume2 class="h-4 w-4" />
                  听句子
                </button>
              </div>
              <p class="text-lg leading-relaxed text-gray-700">{{ character.sentence }}</p>
            </div>

            <div class="flex items-center gap-2">
              <p class="text-base font-bold text-gray-500">
                哪个词含有 <span style="color: #2ED573; font-size: 24px">{{ character.character }}</span> ？
              </p>
              <button
                class="flex items-center justify-center rounded-full transition-all active:scale-90"
                style="background-color: #2ED57318; color: #2ED573; width: 32px; height: 32px"
                @click="speakText(`哪个词含有${character.character}`)"
              >
                <Volume2 class="h-4 w-4" />
              </button>
            </div>

            <div class="grid w-full grid-cols-2 gap-3">
              <button
                v-for="option in wordQuizOptions"
                :key="option"
                class="flex items-center justify-center rounded-2xl border-2 py-4 text-xl font-bold transition-all duration-200 active:scale-95"
                :style="{
                  borderColor:
                    revealed && character.words.some(w => w.word === option)
                      ? '#2ED573'
                      : revealed && selectedOption === option && !character.words.some(w => w.word === option)
                        ? '#FF6B6B'
                        : selectedOption === option
                          ? '#2ED573'
                          : '#E0E0E0',
                  backgroundColor:
                    revealed && character.words.some(w => w.word === option)
                      ? '#2ED57318'
                      : revealed && selectedOption === option && !character.words.some(w => w.word === option)
                        ? '#FF6B6B18'
                        : 'white',
                  color:
                    revealed && character.words.some(w => w.word === option)
                      ? '#2ED573'
                      : revealed && selectedOption === option && !character.words.some(w => w.word === option)
                        ? '#FF6B6B'
                        : '#333',
                }"
                :disabled="revealed"
                @click="selectWordOption(option)"
              >
                {{ option }}
              </button>
            </div>
          </div>

          <button
            v-if="revealed"
            class="fun-btn-success w-full text-lg"
            @click="nextStep"
          >
            下一关 →
          </button>
        </div>

        <div v-else-if="currentStep === 4" key="step4" class="flex flex-col items-center gap-5">
          <div class="fun-card flex flex-col items-center gap-5 py-8 w-full">
            <h3 class="text-xl font-bold text-gray-600">巩固挑战 🏆</h3>

            <div class="mb-2 rounded-2xl bg-white p-4 shadow-md text-center">
              <div class="flex items-center justify-center gap-2 mb-2">
                <p class="text-base font-bold text-gray-600">
                  哪个是 <span style="color: #2ED573; font-size: 28px">{{ character.character }}</span> ？
                </p>
                <button
                  class="flex items-center justify-center rounded-full transition-all active:scale-90"
                  style="background-color: #2ED57318; color: #2ED573; width: 32px; height: 32px"
                  @click="speakText(`哪个是${character.character}`)"
                >
                  <Volume2 class="h-4 w-4" />
                </button>
              </div>
              <div class="mx-auto mb-2 flex h-28 w-36 items-center justify-center rounded-xl" style="background-color: #2ED57318">
                <span class="text-5xl">{{ character.emoji }}</span>
              </div>
            </div>

            <div class="grid w-full grid-cols-2 gap-3">
              <button
                v-for="option in quizOptions"
                :key="option"
                class="flex items-center justify-center rounded-2xl border-2 py-5 text-3xl font-bold transition-all duration-200 active:scale-95"
                :style="{
                  borderColor:
                    revealed && option === character.character
                      ? '#2ED573'
                      : revealed && selectedOption === option && option !== character.character
                        ? '#FF6B6B'
                        : selectedOption === option
                          ? '#2ED573'
                          : '#E0E0E0',
                  backgroundColor:
                    revealed && option === character.character
                      ? '#2ED57318'
                      : revealed && selectedOption === option && option !== character.character
                        ? '#FF6B6B18'
                        : 'white',
                  color:
                    revealed && option === character.character
                      ? '#2ED573'
                      : revealed && selectedOption === option && option !== character.character
                        ? '#FF6B6B'
                        : '#333',
                }"
                :disabled="revealed"
                @click="selectOption(option)"
              >
                {{ option }}
              </button>
            </div>

            <div v-if="revealed" class="text-center">
              <p
                class="text-lg font-bold"
                :style="{ color: selectedOption === character.character ? '#2ED573' : '#FF6B6B' }"
              >
                {{ selectedOption === character.character ? '🎉 太棒了！完全掌握！' : '😊 没关系，再看看这个字吧！' }}
              </p>
            </div>
          </div>

          <button
            v-if="revealed"
            class="fun-btn-success w-full text-lg"
            @click="finishSession"
          >
            🌟 完成学习
          </button>
        </div>
      </Transition>
    </div>

    <div v-else-if="sessionCompleted" class="px-4 pt-6">
      <div class="mx-auto max-w-sm rounded-3xl bg-white p-6 text-center shadow-xl border-2" style="border-color: #2ED57330">
        <div class="mb-4 text-6xl animate-bounce">🎊</div>
        <h2 class="mb-2 text-2xl font-bold text-gray-700">学习完成！</h2>
        <p class="mb-4 text-gray-500">
          你已经学会了 <span class="font-bold text-2xl" style="color: #2ED573">{{ character?.character }}</span>
        </p>

        <div class="mb-4 rounded-2xl p-4" style="background-color: #E8F8E8">
          <div class="flex items-center justify-center gap-1 mb-2">
            <Star
              v-for="i in 5"
              :key="i"
              class="h-8 w-8 transition-all"
              :class="i <= Math.min(stepResults.reduce((s, r) => s + r.stars, 0), 5) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'"
            />
          </div>
          <p class="text-sm text-gray-500">
            获得 {{ stepResults.reduce((s, r) => s + r.stars, 0) }} 颗星星
          </p>
        </div>

        <div class="grid grid-cols-5 gap-1 mb-6">
          <div
            v-for="(step, idx) in sessionSteps"
            :key="idx"
            class="flex flex-col items-center gap-1"
          >
            <div
              class="flex h-8 w-8 items-center justify-center rounded-full text-sm"
              :style="{
                backgroundColor: idx < stepResults.length && stepResults[idx]?.score >= 50 ? '#2ED573' : '#E5E7EB',
                color: idx < stepResults.length && stepResults[idx]?.score >= 50 ? 'white' : '#999',
              }"
            >
              {{ idx < stepResults.length && stepResults[idx]?.score >= 50 ? '✓' : step.icon }}
            </div>
            <span class="text-[10px] text-gray-400">{{ step.label }}</span>
          </div>
        </div>

        <div class="space-y-3">
          <button class="fun-btn-success w-full" @click="goToNext">
            学习下一个 →
          </button>
          <button
            class="w-full rounded-2xl border-2 py-3 text-lg font-bold transition-all active:scale-[0.97]"
            style="border-color: #2ED573; color: #2ED573"
            @click="router.push('/chinese')"
          >
            返回汉字花园
          </button>
          <button
            class="w-full rounded-2xl py-3 text-base font-bold text-gray-400 transition-all active:scale-[0.97]"
            @click="goHome"
          >
            🏠 返回首页
          </button>
        </div>
      </div>
    </div>

    <div v-else class="flex flex-col items-center justify-center pt-20">
      <p class="text-6xl mb-4">😢</p>
      <p class="text-lg text-gray-400">找不到这个汉字</p>
      <button
        class="mt-4 rounded-full px-6 py-2 text-sm font-bold text-white"
        style="background-color: #2ED573"
        @click="goBack"
      >
        返回汉字花园
      </button>
    </div>

    <RewardAnimation :show="showReward" :count="stepResults.reduce((s, r) => s + r.stars, 0)" />
  </div>
</template>

<style scoped>
.step-enter-active {
  animation: stepIn 0.4s ease-out;
}
.step-leave-active {
  animation: stepOut 0.2s ease-in;
}
@keyframes stepIn {
  from {
    opacity: 0;
    transform: translateX(40px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
}
@keyframes stepOut {
  from {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateX(-30px) scale(0.95);
  }
}
</style>
