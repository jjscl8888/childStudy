<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Volume2, Mic, Star, ArrowLeft } from 'lucide-vue-next'
import { pinyinData } from '@/data/pinyinData'
import { useUserStore } from '@/stores/userStore'
import { useLearningPathStore } from '@/stores/learningPathStore'
import { useSpacedRepetitionStore } from '@/stores/spacedRepetitionStore'
import { useSpeechRecognition } from '@/composables/useSpeechRecognition'
import { useTextToSpeech } from '@/composables/useTextToSpeech'
import SessionProgress from '@/components/learning/SessionProgress.vue'
import WritingPad from '@/components/learning/WritingPad.vue'
import StrokeDemo from '@/components/learning/StrokeDemo.vue'
import CompanionGuide from '@/components/learning/CompanionGuide.vue'
import RewardAnimation from '@/components/common/RewardAnimation.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const learningPathStore = useLearningPathStore()
const spacedRepetition = useSpacedRepetitionStore()

const id = computed(() => route.params.id as string)
const item = computed(() => pinyinData.find(p => p.id === id.value))

const { isListening, transcript: speechTranscript, error: speechError, isSupported: speechSupported, lastAudioUrl, isPlaying: isPlayingRecording, start: startListening, stop: stopListening, playLastRecording, calculateScore } = useSpeechRecognition({ lang: 'zh-CN', maxDuration: 8000 })
const tts = useTextToSpeech('zh-CN', 0.6)

const TOTAL_STEPS = 5
const currentStep = ref(0)
const showReward = ref(false)
const sessionCompleted = ref(false)
const companionMsg = ref('')
const companionEmotion = ref<'happy' | 'encourage' | 'think' | 'celebrate'>('happy')

const speaking = ref(false)
const micActive = ref(false)
const pronunciationScore = ref(0)
const hasScored = ref(false)
const readTranscript = ref('')
const writingCompleted = ref(false)
const writingAccuracy = ref(0)

const selectedOption = ref<string | null>(null)
const revealed = ref(false)
const correctAnswers = ref(0)

const stepResults = ref<{ step: number; score: number; stars: number }[]>([])

const sessionSteps = [
  { label: '听音认形', icon: '🎵' },
  { label: '跟读练习', icon: '🎤' },
  { label: '书写练习', icon: '✍️' },
  { label: '巩固游戏', icon: '🎯' },
  { label: '复习挑战', icon: '🏆' },
]

const quizOptions = computed(() => {
  if (!item.value) return []
  const correct = item.value.pinyin
  const others = pinyinData
    .filter(p => p.pinyin !== correct)
    .map(p => p.pinyin)
  const shuffled = [...others].sort(() => Math.random() - 0.5).slice(0, 3)
  return [correct, ...shuffled].sort(() => Math.random() - 0.5)
})

const reviewQuizOptions = computed(() => {
  if (!item.value) return []
  const correct = item.value.example
  const others = pinyinData
    .filter(p => p.example !== correct)
    .map(p => p.example)
  const shuffled = [...others].sort(() => Math.random() - 0.5).slice(0, 3)
  return [correct, ...shuffled].sort(() => Math.random() - 0.5)
})

function setCompanion(msg: string, emotion: 'happy' | 'encourage' | 'think' | 'celebrate' = 'happy') {
  companionMsg.value = msg
  companionEmotion.value = emotion
}

function playSound() {
  if (item.value) {
    tts.speak(item.value.pinyin, { lang: 'zh-CN', rate: 0.6 })
    speaking.value = true
    setTimeout(() => {
      speaking.value = false
    }, 1500)
  }
}

async function startRecording() {
  if (isListening.value) {
    stopListening()
    return
  }

  hasScored.value = false
  readTranscript.value = ''
  speechError.value = null
  micActive.value = true

  try {
    const result = await startListening()
    readTranscript.value = result.transcript
    micActive.value = false
    const { score, stars } = calculateScore(item.value?.pinyin || '', result.transcript)
    pronunciationScore.value = stars
    hasScored.value = true
    stepResults.value.push({ step: 1, score, stars })
    if (stars >= 3) {
      setCompanion('发音太标准了！你真是个小天才！🌟', 'celebrate')
    } else if (stars >= 2) {
      setCompanion('读得不错哦！继续加油！👍', 'happy')
    } else {
      setCompanion('没关系，多听几遍就会了！💪', 'encourage')
    }
  } catch (e: any) {
    micActive.value = false
    hasScored.value = true
    pronunciationScore.value = 1
    readTranscript.value = ''
    stepResults.value.push({ step: 1, score: 20, stars: 1 })
    setCompanion(speechError.value || '没有听清，再试一次吧！💪', 'encourage')
  }
}

function onWritingComplete(accuracy: number) {
  writingCompleted.value = true
  writingAccuracy.value = accuracy
  const stars = accuracy >= 80 ? 3 : accuracy >= 50 ? 2 : 1
  stepResults.value.push({ step: 2, score: accuracy, stars })
  if (accuracy >= 80) {
    setCompanion('写得真漂亮！像小书法家一样！✨', 'celebrate')
  } else {
    setCompanion('写得不错！多练几次会更好哦！', 'encourage')
  }
}

function selectOption(option: string) {
  if (revealed.value) return
  selectedOption.value = option
  revealed.value = true
  const isCorrect = option === item.value?.pinyin
  if (isCorrect) {
    correctAnswers.value++
    stepResults.value.push({ step: 3, score: 100, stars: 3 })
    setCompanion('答对了！你真棒！🎉', 'celebrate')
  } else {
    stepResults.value.push({ step: 3, score: 0, stars: 1 })
    setCompanion('没关系，正确答案在这里！仔细记住哦~', 'encourage')
  }
}

function selectReviewOption(option: string) {
  if (revealed.value && currentStep.value === 4) return
  selectedOption.value = option
  revealed.value = true
  const isCorrect = option === item.value?.example
  if (isCorrect) {
    correctAnswers.value++
    stepResults.value.push({ step: 4, score: 100, stars: 3 })
    setCompanion('完美！你已经完全掌握了！🏆', 'celebrate')
  } else {
    stepResults.value.push({ step: 4, score: 0, stars: 1 })
    setCompanion('别着急，我们再复习一下！', 'encourage')
  }
}

function nextStep() {
  if (currentStep.value < TOTAL_STEPS - 1) {
    currentStep.value++
    selectedOption.value = null
    revealed.value = false

    if (currentStep.value === 0) {
      setCompanion(`来认识拼音 "${item.value?.pinyin}" 吧！先听一听它的声音~`, 'happy')
    } else if (currentStep.value === 1) {
      setCompanion('现在试试自己读一读！点击麦克风开始~', 'encourage')
    } else if (currentStep.value === 2) {
      setCompanion('动手写一写，记得更牢哦！✍️', 'think')
    } else if (currentStep.value === 3) {
      setCompanion('来玩个小游戏巩固一下吧！🎯', 'happy')
    } else if (currentStep.value === 4) {
      setCompanion('最后一关！复习挑战等你来！🏆', 'encourage')
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

  learningPathStore.completeNode('pinyin', id.value, totalStars)
  spacedRepetition.addReviewItem('pinyin', id.value)

  const quality = avgScore >= 80 ? 'easy' : avgScore >= 50 ? 'good' : 'hard'
  spacedRepetition.processReview('pinyin', id.value, quality)

  userStore.addLearningRecord({
    module: 'pinyin',
    topic: item.value?.pinyin || id.value,
    action: 'learn',
    score: Math.round(avgScore),
    starsEarned: totalStars,
    duration: Math.round((Date.now() - (learningPathStore.currentSession?.startTime || Date.now())) / 1000),
  })

  setCompanion('太棒了！你完成了所有学习步骤！🌟', 'celebrate')

  setTimeout(() => {
    if (avgScore >= 80) {
      tts.speak(`完美！拼音${item.value?.pinyin}你已经完全掌握了！${getRandomPraise()}`, { lang: 'zh-CN', rate: 0.8 })
    } else if (avgScore >= 50) {
      tts.speak(`不错哦！拼音${item.value?.pinyin}学习完成！继续努力！`, { lang: 'zh-CN', rate: 0.8 })
    } else {
      tts.speak(`拼音${item.value?.pinyin}学习完成！多练习几次会更好的，加油！`, { lang: 'zh-CN', rate: 0.8 })
    }
  }, 800)
}

function goBack() {
  if (learningPathStore.currentSession) {
    learningPathStore.abandonSession()
  }
  router.push('/pinyin')
}

function goHome() {
  if (learningPathStore.currentSession) {
    learningPathStore.abandonSession()
  }
  router.push('/')
}

function goToNext() {
  const nodes = learningPathStore.getModuleNodes('pinyin')
  const currentNode = nodes.find(n => n.itemId === id.value)
  if (currentNode) {
    const nextNode = nodes.find(n => n.order === currentNode.order + 1)
    if (nextNode) {
      resetSession()
      router.replace(`/pinyin/${nextNode.itemId}`)
      return
    }
  }
  router.push('/pinyin')
}

function resetSession() {
  currentStep.value = 0
  showReward.value = false
  sessionCompleted.value = false
  companionMsg.value = ''
  speaking.value = false
  micActive.value = false
  pronunciationScore.value = 0
  hasScored.value = false
  readTranscript.value = ''
  writingCompleted.value = false
  writingAccuracy.value = 0
  selectedOption.value = null
  revealed.value = false
  correctAnswers.value = 0
  stepResults.value = []
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
  if (!item.value) return
  switch (step) {
    case 0:
      speakIntro(`来认识拼音${item.value.pinyin}。点击听发音按钮，听一听它的声音。`)
      break
    case 1:
      speakIntro(`现在来跟读练习。点击大麦克风，大声读出${item.value.pinyin}。`)
      break
    case 2:
      speakIntro(`动手写一写${item.value.pinyin}，记得更牢哦。在格子里写三次。`)
      break
    case 3:
      speakIntro(`来玩个小游戏。找出哪个是${item.value.pinyin}。`)
      break
    case 4:
      speakIntro(`最后一关复习挑战！${item.value.pinyin}对应哪个词呢？`)
      break
  }
}

watch(id, (newId) => {
  if (!newId) return
  const newItem = pinyinData.find(p => p.id === newId)
  if (!newItem) return
  resetSession()
  learningPathStore.startSession('pinyin', newId, TOTAL_STEPS)
  setCompanion(`来认识拼音 "${newItem.pinyin}" 吧！先听一听它的声音~`, 'happy')
  speakStepIntro(0)
})

onMounted(() => {
  if (!item.value) {
    router.replace('/pinyin')
    return
  }
  learningPathStore.startSession('pinyin', id.value, TOTAL_STEPS)
  setCompanion(`来认识拼音 "${item.value.pinyin}" 吧！先听一听它的声音~`, 'happy')
  speakStepIntro(0)
})

onUnmounted(() => {
  tts.stop()
  stopListening()
})
</script>

<template>
  <div class="min-h-screen pb-8" style="background-color: #FFF9E6">
    <header class="sticky top-0 z-50 flex items-center gap-3 px-4 py-3 shadow-sm" style="background-color: #FFF9E6">
      <button
        class="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-orange-100"
        @click="goBack"
      >
        <ArrowLeft class="h-6 w-6" style="color: #FF9F43" />
      </button>
      <h1 class="flex-1 text-center text-lg font-bold" style="color: #FF9F43">
        拼音王国 📝
      </h1>
      <div class="flex items-center gap-1.5 rounded-full px-3 py-1" style="background-color: #FFF3D6">
        <Star class="h-5 w-5 fill-yellow-400 text-yellow-400" />
        <span class="text-sm font-bold text-yellow-600">{{ userStore.totalStars }}</span>
      </div>
    </header>

    <div v-if="item && !sessionCompleted" class="px-4 pt-3">
      <SessionProgress
        :current-step="currentStep"
        :total-steps="TOTAL_STEPS"
        :steps="sessionSteps"
        color="#FF9F43"
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
            <h3 class="text-xl font-bold text-gray-600">听音认形 🎵</h3>

            <span
              class="text-[120px] font-bold leading-none"
              style="color: #FF9F43; text-shadow: 0 4px 8px rgba(255,159,67,0.2)"
            >
              {{ item.pinyin }}
            </span>

            <div class="flex flex-col items-center gap-2">
              <div class="flex h-32 w-32 items-center justify-center rounded-2xl shadow-md" style="background-color: #FF9F4318">
                <span class="text-7xl">{{ item.emoji }}</span>
              </div>
              <span class="text-2xl font-bold text-gray-700">{{ item.example }}</span>
              <span class="text-base text-gray-400">{{ item.examplePinyin }}</span>
            </div>

            <button
              class="fun-btn-primary flex items-center gap-2"
              :class="{ 'animate-wiggle': speaking }"
              @click="playSound"
            >
              <Volume2 class="h-6 w-6" />
              {{ speaking ? '播放中...' : '听发音' }}
            </button>
          </div>

          <button class="fun-btn-primary w-full text-lg" @click="nextStep">
            我听到了！下一步 →
          </button>
        </div>

        <div v-else-if="currentStep === 1" key="step1" class="flex flex-col items-center gap-5">
          <div class="fun-card flex flex-col items-center gap-5 py-8 w-full">
            <h3 class="text-xl font-bold text-gray-600">跟读练习 🎤</h3>

            <span
              class="text-[80px] font-bold leading-none"
              style="color: #FF9F43"
            >
              {{ item.pinyin }}
            </span>

            <button
              class="flex h-24 w-24 items-center justify-center rounded-full shadow-lg transition-all duration-200 active:scale-95"
              :class="{ 'animate-pulse': isListening }"
              :style="{
                backgroundColor: isListening ? '#FF6B6B' : hasScored ? '#2ED573' : '#FF9F43',
                boxShadow: isListening
                  ? '0 0 0 8px rgba(255,107,107,0.2), 0 4px 0 rgba(0,0,0,0.15)'
                  : '0 4px 0 rgba(0,0,0,0.15)',
              }"
              @click="startRecording"
            >
              <Mic class="h-10 w-10 text-white" />
            </button>
            <span class="text-sm text-gray-400">
              {{ isListening ? '🔴 正在录音，请大声读...' : hasScored ? '点击可重新录音' : '点击麦克风跟读' }}
            </span>

            <div v-if="isListening" class="flex items-center gap-2 mt-1">
              <div class="recording-wave">
                <span v-for="i in 5" :key="i" class="wave-bar" :style="{ animationDelay: `${i * 0.1}s` }"></span>
              </div>
            </div>

            <div v-if="hasScored" class="flex flex-col items-center gap-2">
              <p class="text-base font-bold text-gray-600">发音评分</p>
              <div class="flex gap-1">
                <Star
                  v-for="i in 3"
                  :key="i"
                  class="h-10 w-10 transition-all duration-300"
                  :class="i <= pronunciationScore ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'"
                />
              </div>
              <p v-if="readTranscript" class="text-sm text-gray-500">
                你说的是: <span class="font-bold" style="color: #FF9F43">{{ readTranscript }}</span>
              </p>
              <p class="text-sm font-semibold" :style="{ color: pronunciationScore >= 2 ? '#2ED573' : '#FF9F43' }">
                {{ pronunciationScore >= 3 ? '太棒了！🌟' : pronunciationScore >= 2 ? '不错哦！👍' : '再试试！💪' }}
              </p>
            </div>

            <p v-if="!speechSupported" class="text-xs text-orange-400 mt-1">
              ⚠️ 当前浏览器不支持语音识别，请使用Chrome浏览器获得最佳体验
            </p>

            <button
              v-if="lastAudioUrl"
              class="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition-all active:scale-95"
              :style="{ backgroundColor: isPlayingRecording ? '#FF6B6B18' : '#FF9F4318', color: isPlayingRecording ? '#FF6B6B' : '#FF9F43' }"
              @click="playLastRecording"
            >
              {{ isPlayingRecording ? '⏹ 停止播放' : '🔊 听自己的录音' }}
            </button>
          </div>

          <button
            v-if="hasScored"
            class="fun-btn-primary w-full text-lg"
            @click="nextStep"
          >
            继续练习 →
          </button>
        </div>

        <div v-else-if="currentStep === 2" key="step2" class="flex flex-col items-center gap-5">
          <div class="fun-card flex flex-col items-center gap-4 py-6 w-full">
            <h3 class="text-xl font-bold text-gray-600">书写练习 ✍️</h3>

            <StrokeDemo
              :character="item.pinyin"
              type="pinyin"
              color="#FF9F43"
              :size="180"
            />

            <WritingPad
              :character="item.pinyin"
              type="pinyin"
              color="#FF9F43"
              :width="260"
              :height="260"
              :required-count="3"
              @complete="onWritingComplete"
            />
          </div>

          <button
            v-if="writingCompleted"
            class="fun-btn-primary w-full text-lg"
            @click="nextStep"
          >
            写好了！去玩游戏 →
          </button>
        </div>

        <div v-else-if="currentStep === 3" key="step3" class="flex flex-col items-center gap-5">
          <div class="fun-card flex flex-col items-center gap-5 py-8 w-full">
            <h3 class="text-xl font-bold text-gray-600">巩固游戏 🎯</h3>

            <div class="flex items-center gap-2">
              <p class="text-lg font-bold text-gray-700">
                哪个是 <span style="color: #FF9F43; font-size: 28px">{{ item.pinyin }}</span> ？
              </p>
              <button
                class="flex items-center justify-center rounded-full transition-all active:scale-90"
                style="background-color: #FF9F4318; color: #FF9F43; width: 32px; height: 32px"
                @click="tts.speak(`哪个是${item.pinyin}`, { lang: 'zh-CN', rate: 0.7 })"
              >
                <Volume2 class="h-4 w-4" />
              </button>
            </div>

            <div class="grid w-full max-w-sm grid-cols-2 gap-3">
              <button
                v-for="option in quizOptions"
                :key="option"
                class="flex min-h-[72px] items-center justify-center rounded-2xl border-2 text-3xl font-bold transition-all duration-200 active:scale-95"
                :class="
                  revealed && option === item.pinyin
                    ? 'border-success bg-success/10 text-success'
                    : revealed && selectedOption === option && option !== item.pinyin
                      ? 'border-accent bg-accent/10 text-accent'
                      : selectedOption === option
                        ? 'border-primary bg-primary text-white'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-orange-200'
                "
                @click="selectOption(option)"
              >
                {{ option }}
              </button>
            </div>

            <div v-if="revealed" class="text-center">
              <p v-if="selectedOption === item.pinyin" class="text-lg font-bold text-success">
                🎉 答对了！真棒！
              </p>
              <p v-else class="text-lg font-bold text-accent">
                😅 正确答案是 {{ item.pinyin }}，记住啦！
              </p>
            </div>
          </div>

          <button
            v-if="revealed"
            class="fun-btn-primary w-full text-lg"
            @click="nextStep"
          >
            {{ currentStep < TOTAL_STEPS - 1 ? '下一关 →' : '完成学习 🌟' }}
          </button>
        </div>

        <div v-else-if="currentStep === 4" key="step4" class="flex flex-col items-center gap-5">
          <div class="fun-card flex flex-col items-center gap-5 py-8 w-full">
            <h3 class="text-xl font-bold text-gray-600">复习挑战 🏆</h3>

            <div class="flex flex-col items-center gap-2 mb-2">
              <div class="flex items-center gap-2">
                <span class="text-5xl font-bold" style="color: #FF9F43">{{ item.pinyin }}</span>
                <button
                  class="flex items-center justify-center rounded-full transition-all active:scale-90"
                  style="background-color: #FF9F4318; color: #FF9F43; width: 32px; height: 32px"
                  @click="tts.speak(`${item.pinyin}，这个拼音对应哪个词`, { lang: 'zh-CN', rate: 0.7 })"
                >
                  <Volume2 class="h-4 w-4" />
                </button>
              </div>
              <span class="text-sm text-gray-400">这个拼音对应哪个词？</span>
            </div>

            <div class="grid w-full max-w-sm grid-cols-2 gap-3">
              <button
                v-for="option in reviewQuizOptions"
                :key="option"
                class="flex min-h-[64px] items-center justify-center rounded-2xl border-2 text-xl font-bold transition-all duration-200 active:scale-95 px-3"
                :class="
                  revealed && option === item.example
                    ? 'border-success bg-success/10 text-success'
                    : revealed && selectedOption === option && option !== item.example
                      ? 'border-accent bg-accent/10 text-accent'
                      : selectedOption === option
                        ? 'border-primary bg-primary text-white'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-orange-200'
                "
                @click="selectReviewOption(option)"
              >
                {{ option }}
              </button>
            </div>

            <div v-if="revealed" class="text-center">
              <p v-if="selectedOption === item.example" class="text-lg font-bold text-success">
                🎉 完全掌握！太厉害了！
              </p>
              <p v-else class="text-lg font-bold text-accent">
                😊 正确答案是"{{ item.example }}"，下次一定行！
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
      <div class="mx-auto max-w-sm rounded-3xl bg-white p-6 text-center shadow-xl border-2" style="border-color: #FF9F4330">
        <div class="mb-4 text-6xl animate-bounce">🎊</div>
        <h2 class="mb-2 text-2xl font-bold text-gray-700">学习完成！</h2>
        <p class="mb-4 text-gray-500">
          你已经学会了 <span class="font-bold text-2xl" style="color: #FF9F43">{{ item?.pinyin }}</span>
        </p>

        <div class="mb-4 rounded-2xl p-4" style="background-color: #FFF3D6">
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
          <button class="fun-btn-primary w-full" @click="goToNext">
            学习下一个 →
          </button>
          <button
            class="w-full rounded-2xl border-2 py-3 text-lg font-bold transition-all active:scale-[0.97]"
            style="border-color: #FF9F43; color: #FF9F43"
            @click="router.push('/pinyin')"
          >
            返回拼音列表
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

    <div v-if="!item" class="flex flex-col items-center justify-center py-20">
      <p class="text-lg text-gray-400">找不到该拼音 😢</p>
      <button class="fun-btn-primary mt-4" @click="goHome">返回</button>
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

.recording-wave {
  display: flex;
  align-items: center;
  gap: 3px;
  height: 30px;
}
.wave-bar {
  width: 4px;
  background-color: #FF6B6B;
  border-radius: 2px;
  animation: waveAnim 0.8s ease-in-out infinite;
}
@keyframes waveAnim {
  0%, 100% { height: 6px; }
  50% { height: 24px; }
}
</style>
