<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Volume2, Mic, Star } from 'lucide-vue-next'
import { useUserStore } from '@/stores/userStore'
import { useLearningPathStore } from '@/stores/learningPathStore'
import { useSpacedRepetitionStore } from '@/stores/spacedRepetitionStore'
import { englishData } from '@/data/englishData'
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
const word = computed(() => englishData.find(w => w.id === id.value))

const { isListening, transcript, error: speechError, isSupported, lastAudioUrl, isPlaying: isPlayingRecording, start: startListening, stop: stopListening, playLastRecording, calculateScore } = useSpeechRecognition({ lang: 'en-US', maxDuration: 8000 })
const tts = useTextToSpeech('en-US', 0.7)

const TOTAL_STEPS = 5
const currentStep = ref(0)
const showReward = ref(false)
const sessionCompleted = ref(false)
const companionMsg = ref('')
const companionEmotion = ref<'happy' | 'encourage' | 'think' | 'celebrate'>('happy')

const hasReadResult = ref(false)
const readStars = ref(0)
const readScore = ref(0)
const readTranscript = ref('')

const selectedOption = ref<string | null>(null)
const revealed = ref(false)
const stepResults = ref<{ step: number; score: number; stars: number }[]>([])

const sessionSteps = [
  { label: '听音认字', icon: '🎵' },
  { label: '跟读练习', icon: '🎤' },
  { label: '书写练习', icon: '✍️' },
  { label: '巩固游戏', icon: '🎯' },
  { label: '复习挑战', icon: '🏆' },
]

const quizOptions = computed(() => {
  if (!word.value) return []
  const correct = word.value.word
  const others = englishData
    .filter(w => w.word !== correct)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
    .map(w => w.word)
  return [correct, ...others].sort(() => Math.random() - 0.5)
})

const meaningQuizOptions = computed(() => {
  if (!word.value) return []
  const correct = word.value.chinese
  const others = englishData
    .filter(w => w.chinese !== correct)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
    .map(w => w.chinese)
  return [correct, ...others].sort(() => Math.random() - 0.5)
})

const writingCompleted = ref(false)
const writingAccuracy = ref(0)

function setCompanion(msg: string, emotion: 'happy' | 'encourage' | 'think' | 'celebrate' = 'happy') {
  companionMsg.value = msg
  companionEmotion.value = emotion
}

function speak() {
  if (!word.value) return
  tts.speak(word.value.word, { lang: 'en-US', rate: 0.7 })
}

function speakSentence() {
  if (!word.value) return
  tts.speak(word.value.exampleSentence, { lang: 'en-US', rate: 0.8 })
}

async function handleReadAloud() {
  if (isListening.value) {
    stopListening()
    return
  }

  hasReadResult.value = false
  readTranscript.value = ''
  speechError.value = null

  try {
    const result = await startListening()
    readTranscript.value = result.transcript
    const { score, stars } = calculateScore(word.value?.word || '', result.transcript)
    readScore.value = score
    readStars.value = stars
    hasReadResult.value = true
    stepResults.value.push({ step: 1, score, stars })

    if (stars >= 3) {
      setCompanion('发音太标准了！你真是个英语小达人！🌟', 'celebrate')
    } else if (stars >= 2) {
      setCompanion('读得不错哦！继续加油！👍', 'happy')
    } else {
      setCompanion('没关系，多听几遍就会了！💪', 'encourage')
    }
  } catch (e: any) {
    hasReadResult.value = true
    readStars.value = 1
    readScore.value = 20
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
    setCompanion('写得真漂亮！太厉害了！✨', 'celebrate')
  } else {
    setCompanion('写得不错！多练几次会更好哦！', 'encourage')
  }
}

function selectOption(option: string) {
  if (revealed.value) return
  selectedOption.value = option
  revealed.value = true
  const isCorrect = option === word.value?.word
  if (isCorrect) {
    stepResults.value.push({ step: 3, score: 100, stars: 3 })
    setCompanion('答对了！你真棒！🎉', 'celebrate')
  } else {
    stepResults.value.push({ step: 3, score: 0, stars: 1 })
    setCompanion(`正确答案是 "${word.value?.word}"，记住啦！`, 'encourage')
  }
}

function selectMeaningOption(option: string) {
  if (revealed.value && currentStep.value === 4) return
  selectedOption.value = option
  revealed.value = true
  const isCorrect = option === word.value?.chinese
  if (isCorrect) {
    stepResults.value.push({ step: 4, score: 100, stars: 3 })
    setCompanion('完美！你已经完全掌握了！🏆', 'celebrate')
  } else {
    stepResults.value.push({ step: 4, score: 0, stars: 1 })
    setCompanion(`正确意思是"${word.value?.chinese}"，再看看吧！`, 'encourage')
  }
}

const praiseMessages = [
  '太棒了！你真厉害！',
  'Perfect! 继续加油哦！',
  '你真是英语小天才！',
  '做得太好了！为你骄傲！',
  'Amazing! 继续保持！',
]

function getRandomPraise(): string {
  return praiseMessages[Math.floor(Math.random() * praiseMessages.length)]
}

function speakIntro(text: string, lang: string = 'zh-CN') {
  setTimeout(() => {
    tts.speak(text, { lang, rate: 0.7 })
  }, 600)
}

function speakStepIntro(step: number) {
  if (!word.value) return
  switch (step) {
    case 0:
      speakIntro(`来认识英语单词${word.value.chinese}。它的英文是${word.value.word}。点击听发音按钮。`, 'zh-CN')
      break
    case 1:
      speakIntro(`现在来跟读练习。点击大麦克风，大声读出${word.value.word}。`, 'zh-CN')
      break
    case 2:
      speakIntro(`动手拼一拼${word.value.word}，在格子里写三次哦。`, 'zh-CN')
      break
    case 3:
      speakIntro(`来玩个小游戏。找出${word.value.chinese}的英文是哪个。`, 'zh-CN')
      break
    case 4:
      speakIntro(`最后一关！看看你是不是真的掌握了${word.value.word}。`, 'zh-CN')
      break
  }
}

function nextStep() {
  if (currentStep.value < TOTAL_STEPS - 1) {
    currentStep.value++
    selectedOption.value = null
    revealed.value = false

    if (currentStep.value === 0) {
      setCompanion(`来认识单词 "${word.value?.word}" 吧！先听一听~`, 'happy')
    } else if (currentStep.value === 1) {
      setCompanion('现在试试自己读一读！点击麦克风开始~', 'encourage')
    } else if (currentStep.value === 2) {
      setCompanion('动手拼一拼，记得更牢哦！✍️', 'think')
    } else if (currentStep.value === 3) {
      setCompanion('来玩个小游戏巩固一下吧！🎯', 'happy')
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

  learningPathStore.completeNode('english', id.value, totalStars)
  spacedRepetition.addReviewItem('english', id.value)

  const quality = avgScore >= 80 ? 'easy' : avgScore >= 50 ? 'good' : 'hard'
  spacedRepetition.processReview('english', id.value, quality)

  userStore.addLearningRecord({
    module: 'english',
    topic: word.value?.word || id.value,
    action: 'learn',
    score: Math.round(avgScore),
    starsEarned: totalStars,
    duration: Math.round((Date.now() - (learningPathStore.currentSession?.startTime || Date.now())) / 1000),
  })

  setCompanion('太棒了！你又学会了一个新单词！🌟', 'celebrate')

  setTimeout(() => {
    if (avgScore >= 80) {
      tts.speak(`Perfect! 单词${word.value?.word}你已经完全掌握了！${getRandomPraise()}`, { lang: 'zh-CN', rate: 0.8 })
    } else if (avgScore >= 50) {
      tts.speak(`不错哦！单词${word.value?.word}学习完成！继续努力！`, { lang: 'zh-CN', rate: 0.8 })
    } else {
      tts.speak(`单词${word.value?.word}学习完成！多练习几次会更好的，加油！`, { lang: 'zh-CN', rate: 0.8 })
    }
  }, 800)
}

function resetSession() {
  currentStep.value = 0
  showReward.value = false
  sessionCompleted.value = false
  companionMsg.value = ''
  hasReadResult.value = false
  readStars.value = 0
  readScore.value = 0
  readTranscript.value = ''
  writingCompleted.value = false
  writingAccuracy.value = 0
  selectedOption.value = null
  revealed.value = false
  stepResults.value = []
}

function goBack() {
  if (learningPathStore.currentSession) {
    learningPathStore.abandonSession()
  }
  router.push('/english')
}

function goHome() {
  if (learningPathStore.currentSession) {
    learningPathStore.abandonSession()
  }
  router.push('/')
}

function goToNext() {
  const nodes = learningPathStore.getModuleNodes('english')
  const currentNode = nodes.find(n => n.itemId === id.value)
  if (currentNode) {
    const nextNode = nodes.find(n => n.order === currentNode.order + 1)
    if (nextNode) {
      resetSession()
      router.replace(`/english/${nextNode.itemId}`)
      return
    }
  }
  router.push('/english')
}

watch(id, (newId) => {
  if (!newId) return
  const newItem = englishData.find(w => w.id === newId)
  if (!newItem) return
  resetSession()
  learningPathStore.startSession('english', newId, TOTAL_STEPS)
  setCompanion(`来认识单词 "${newItem.word}" 吧！先听一听~`, 'happy')
  speakStepIntro(0)
})

onMounted(() => {
  if (!word.value) {
    router.replace('/english')
    return
  }
  learningPathStore.initModulePath('english', englishData)
  learningPathStore.startSession('english', id.value, TOTAL_STEPS)
  setCompanion(`来认识单词 "${word.value.word}" 吧！先听一听~`, 'happy')
  speakStepIntro(0)
})

onUnmounted(() => {
  tts.stop()
  stopListening()
})
</script>

<template>
  <div class="min-h-screen pb-8" style="background-color: #EBF5FF">
    <header class="sticky top-0 z-50 flex items-center gap-3 px-4 py-3 shadow-sm" style="background-color: #EBF5FF">
      <button
        class="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-blue-100"
        @click="goBack"
      >
        <ArrowLeft class="h-6 w-6" style="color: #54A0FF" />
      </button>
      <h1 class="flex-1 text-center text-lg font-bold" style="color: #54A0FF">
        英语世界 🌍
      </h1>
      <div class="flex items-center gap-1.5 rounded-full px-3 py-1" style="background-color: #D6EAFF">
        <Star class="h-5 w-5 fill-yellow-400 text-yellow-400" />
        <span class="text-sm font-bold text-yellow-600">{{ userStore.totalStars }}</span>
      </div>
    </header>

    <div v-if="word && !sessionCompleted" class="px-4 pt-3">
      <SessionProgress
        :current-step="currentStep"
        :total-steps="TOTAL_STEPS"
        :steps="sessionSteps"
        color="#54A0FF"
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
            <h3 class="text-xl font-bold text-gray-600">听音认字 🎵</h3>

            <div class="flex h-40 w-40 items-center justify-center overflow-hidden rounded-3xl shadow-lg" style="background-color: #54A0FF18">
              <img v-if="word.imageUrl" :src="word.imageUrl" :alt="word.word" class="h-36 w-36 object-contain" />
              <span v-else class="text-7xl">📖</span>
            </div>

            <span class="font-bold text-gray-800" style="font-size: 56px; line-height: 1.1; color: #2E86DE">
              {{ word.word }}
            </span>
            <p class="text-xl text-gray-400">{{ word.phonetic }}</p>
            <p class="text-2xl font-bold text-gray-600">{{ word.chinese }}</p>

            <button
              class="flex items-center gap-2 rounded-full px-6 py-3 text-base font-bold text-white shadow-md transition-all active:scale-95"
              style="background-color: #54A0FF"
              @click="speak"
            >
              <Volume2 class="h-5 w-5" />
              听发音
            </button>

            <button
              class="flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition-all active:scale-95"
              style="background-color: #54A0FF18; color: #54A0FF"
              @click="speakSentence"
            >
              <Volume2 class="h-4 w-4" />
              听例句
            </button>

            <div class="w-full rounded-2xl bg-white p-4 shadow-sm">
              <p class="text-center text-base text-gray-500">
                <span class="font-semibold" style="color: #2E86DE">{{ word.word }}</span>
                — {{ word.exampleSentence }}
              </p>
            </div>
          </div>

          <button class="w-full rounded-2xl py-3 text-lg font-bold text-white shadow-md transition-all active:scale-[0.97]" style="background-color: #54A0FF" @click="nextStep">
            我听到了！下一步 →
          </button>
        </div>

        <div v-else-if="currentStep === 1" key="step1" class="flex flex-col items-center gap-5">
          <div class="fun-card flex flex-col items-center gap-5 py-8 w-full">
            <h3 class="text-xl font-bold text-gray-600">跟读练习 🎤</h3>

            <span class="font-bold" style="font-size: 48px; line-height: 1.1; color: #2E86DE">
              {{ word.word }}
            </span>
            <p class="text-lg text-gray-400">{{ word.phonetic }}</p>

            <button
              class="flex h-28 w-28 items-center justify-center rounded-full shadow-xl transition-all duration-200 active:scale-90"
              :class="{ 'animate-pulse': isListening }"
              :style="{
                backgroundColor: isListening ? '#FF6B6B' : hasReadResult ? '#2ED573' : '#54A0FF',
                boxShadow: isListening ? '0 0 0 8px rgba(255,107,107,0.2), 0 4px 0 rgba(0,0,0,0.15)' : '0 4px 0 rgba(0,0,0,0.15)',
              }"
              @click="handleReadAloud"
            >
              <Mic class="h-14 w-14 text-white" />
            </button>

            <span class="text-base text-gray-400">
              {{ isListening ? '🔴 正在录音，请大声读...' : hasReadResult ? '点击可重新录音' : '点击麦克风跟读' }}
            </span>

            <div v-if="isListening" class="flex items-center gap-2 mt-2">
              <div class="recording-wave">
                <span v-for="i in 5" :key="i" class="wave-bar" :style="{ animationDelay: `${i * 0.1}s` }"></span>
              </div>
            </div>

            <div v-if="hasReadResult" class="flex flex-col items-center gap-2 mt-2">
              <div class="flex items-center gap-2">
                <Star
                  v-for="i in 3"
                  :key="i"
                  class="h-10 w-10 transition-all duration-300"
                  :class="i <= readStars ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'"
                />
              </div>
              <p v-if="readTranscript" class="text-sm text-gray-500">
                你说的是: <span class="font-bold" style="color: #54A0FF">{{ readTranscript }}</span>
              </p>
              <p class="text-sm font-semibold" :style="{ color: readStars >= 2 ? '#2ED573' : '#FF9F43' }">
                {{ readStars >= 3 ? '太棒了！🌟' : readStars >= 2 ? '不错哦！👍' : '继续加油！💪' }}
              </p>
            </div>

            <p v-if="!isSupported" class="text-xs text-orange-400 mt-1">
              ⚠️ 当前浏览器不支持语音识别，请使用Chrome浏览器获得最佳体验
            </p>

            <button
              v-if="lastAudioUrl"
              class="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition-all active:scale-95"
              :style="{ backgroundColor: isPlayingRecording ? '#FF6B6B18' : '#54A0FF18', color: isPlayingRecording ? '#FF6B6B' : '#54A0FF' }"
              @click="playLastRecording"
            >
              {{ isPlayingRecording ? '⏹ 停止播放' : '🔊 听自己的录音' }}
            </button>
          </div>

          <button
            v-if="hasReadResult"
            class="w-full rounded-2xl py-3 text-lg font-bold text-white shadow-md transition-all active:scale-[0.97]"
            style="background-color: #54A0FF"
            @click="nextStep"
          >
            继续练习 →
          </button>
        </div>

        <div v-else-if="currentStep === 2" key="step2" class="flex flex-col items-center gap-5">
          <div class="fun-card flex flex-col items-center gap-4 py-6 w-full">
            <h3 class="text-xl font-bold text-gray-600">书写练习 ✍️</h3>

            <StrokeDemo
              :character="word.word"
              type="english"
              color="#54A0FF"
              :size="180"
            />

            <WritingPad
              :character="word.word"
              type="english"
              color="#54A0FF"
              :width="300"
              :height="200"
              :required-count="3"
              @complete="onWritingComplete"
            />
          </div>

          <button
            v-if="writingCompleted"
            class="w-full rounded-2xl py-3 text-lg font-bold text-white shadow-md transition-all active:scale-[0.97]"
            style="background-color: #54A0FF"
            @click="nextStep"
          >
            写好了！去玩游戏 →
          </button>
        </div>

        <div v-else-if="currentStep === 3" key="step3" class="flex flex-col items-center gap-5">
          <div class="fun-card flex flex-col items-center gap-5 py-8 w-full">
            <h3 class="text-xl font-bold text-gray-600">巩固游戏 🎯</h3>

            <div class="flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl shadow-md" style="background-color: #54A0FF18">
              <img v-if="word.imageUrl" :src="word.imageUrl" :alt="word.word" class="h-24 w-24 object-contain" />
              <span v-else class="text-5xl">📖</span>
            </div>

            <p class="text-lg font-bold text-gray-700">
              哪个是 <span style="color: #2E86DE; font-size: 28px">{{ word.chinese }}</span> 的英文？
            </p>

            <div class="grid w-full max-w-sm grid-cols-2 gap-3">
              <button
                v-for="option in quizOptions"
                :key="option"
                class="flex items-center justify-center rounded-2xl border-2 py-4 text-xl font-bold transition-all duration-200 active:scale-95"
                :style="{
                  borderColor: revealed && option === word.word ? '#2ED573' : revealed && selectedOption === option && option !== word.word ? '#FF6B6B' : selectedOption === option ? '#54A0FF' : '#E0E0E0',
                  backgroundColor: revealed && option === word.word ? '#2ED57318' : revealed && selectedOption === option && option !== word.word ? '#FF6B6B18' : 'white',
                  color: revealed && option === word.word ? '#2ED573' : revealed && selectedOption === option && option !== word.word ? '#FF6B6B' : '#333',
                }"
                :disabled="revealed"
                @click="selectOption(option)"
              >
                {{ option }}
              </button>
            </div>

            <div v-if="revealed" class="text-center">
              <p class="text-lg font-bold" :style="{ color: selectedOption === word.word ? '#2ED573' : '#FF6B6B' }">
                {{ selectedOption === word.word ? '🎉 答对了！真棒！' : '😊 正确答案是 ' + word.word + '，记住啦！' }}
              </p>
            </div>
          </div>

          <button
            v-if="revealed"
            class="w-full rounded-2xl py-3 text-lg font-bold text-white shadow-md transition-all active:scale-[0.97]"
            style="background-color: #54A0FF"
            @click="nextStep"
          >
            下一关 →
          </button>
        </div>

        <div v-else-if="currentStep === 4" key="step4" class="flex flex-col items-center gap-5">
          <div class="fun-card flex flex-col items-center gap-5 py-8 w-full">
            <h3 class="text-xl font-bold text-gray-600">复习挑战 🏆</h3>

            <span class="font-bold" style="font-size: 48px; line-height: 1.1; color: #2E86DE">
              {{ word.word }}
            </span>
            <p class="text-sm text-gray-400">这个单词是什么意思？</p>

            <div class="grid w-full max-w-sm grid-cols-2 gap-3">
              <button
                v-for="option in meaningQuizOptions"
                :key="option"
                class="flex items-center justify-center rounded-2xl border-2 py-4 text-xl font-bold transition-all duration-200 active:scale-95"
                :style="{
                  borderColor: revealed && option === word.chinese ? '#2ED573' : revealed && selectedOption === option && option !== word.chinese ? '#FF6B6B' : selectedOption === option ? '#54A0FF' : '#E0E0E0',
                  backgroundColor: revealed && option === word.chinese ? '#2ED57318' : revealed && selectedOption === option && option !== word.chinese ? '#FF6B6B18' : 'white',
                  color: revealed && option === word.chinese ? '#2ED573' : revealed && selectedOption === option && option !== word.chinese ? '#FF6B6B' : '#333',
                }"
                :disabled="revealed"
                @click="selectMeaningOption(option)"
              >
                {{ option }}
              </button>
            </div>

            <div v-if="revealed" class="text-center">
              <p class="text-lg font-bold" :style="{ color: selectedOption === word.chinese ? '#2ED573' : '#FF6B6B' }">
                {{ selectedOption === word.chinese ? '🎉 完全掌握！太厉害了！' : '😊 正确意思是"' + word.chinese + '"，下次一定行！' }}
              </p>
            </div>
          </div>

          <button
            v-if="revealed"
            class="w-full rounded-2xl py-3 text-lg font-bold text-white shadow-md transition-all active:scale-[0.97]"
            style="background-color: #2ED573"
            @click="finishSession"
          >
            🌟 完成学习
          </button>
        </div>
      </Transition>
    </div>

    <div v-else-if="sessionCompleted" class="px-4 pt-6">
      <div class="mx-auto max-w-sm rounded-3xl bg-white p-6 text-center shadow-xl border-2" style="border-color: #54A0FF30">
        <div class="mb-4 text-6xl animate-bounce">🎊</div>
        <h2 class="mb-2 text-2xl font-bold text-gray-700">学习完成！</h2>
        <p class="mb-4 text-gray-500">
          你已经学会了 <span class="font-bold text-2xl" style="color: #2E86DE">{{ word?.word }}</span>
        </p>

        <div class="mb-4 rounded-2xl p-4" style="background-color: #D6EAFF">
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
          <button
            class="w-full rounded-2xl py-3 text-lg font-bold text-white shadow-md transition-all active:scale-[0.97]"
            style="background-color: #54A0FF"
            @click="goToNext"
          >
            学习下一个 →
          </button>
          <button
            class="w-full rounded-2xl border-2 py-3 text-lg font-bold transition-all active:scale-[0.97]"
            style="border-color: #54A0FF; color: #54A0FF"
            @click="router.push('/english')"
          >
            返回英语列表
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

    <div v-else class="flex flex-col items-center justify-center py-20">
      <p class="text-6xl mb-4">😢</p>
      <p class="text-lg text-gray-400">找不到这个单词</p>
      <button
        class="mt-4 rounded-full px-6 py-2 text-sm font-bold text-white"
        style="background-color: #54A0FF"
        @click="goHome"
      >
        返回首页
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

.border-3 {
  border-width: 3px;
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
