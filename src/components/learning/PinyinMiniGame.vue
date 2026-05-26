<script setup lang="ts">
import { ref, computed, onUnmounted, watch } from 'vue'
import { pinyinData } from '@/data/pinyinData'
import type { PinyinItem } from '@/data/pinyinData'

const props = defineProps<{
  item: PinyinItem
  color: string
}>()

const emit = defineEmits<{
  complete: [score: number, stars: number]
}>()

type GamePhase = 'intro' | 'bubble' | 'match' | 'speed' | 'done'
type BubbleState = 'idle' | 'popping' | 'wrong' | 'gone'

interface Bubble {
  id: number
  text: string
  isTarget: boolean
  x: number
  y: number
  size: number
  speed: number
  state: BubbleState
  wobble: number
  wobbleSpeed: number
}

interface SpeedRound {
  text: string
  isTarget: boolean
}

const phase = ref<GamePhase>('intro')
const score = ref(0)
const maxScore = ref(100)

const bubbleRound = ref(0)
const totalBubbleRounds = 3
const bubbles = ref<Bubble[]>([])
const bubbleHits = ref(0)
let bubbleAnimFrame: number | null = null

const matchRound = ref(0)
const totalMatchRounds = 3
const matchOptions = ref<{ text: string; isCorrect: boolean }[]>([])
const matchSelected = ref<string | null>(null)
const matchRevealed = ref(false)
const matchCorrect = ref(0)

const speedRounds = ref<SpeedRound[]>([])
const speedIndex = ref(0)
const speedHits = ref(0)
const speedFalseAlarms = ref(0)
const speedShowChar = ref(false)
const speedFeedback = ref<'hit' | 'miss' | 'false' | null>(null)
let speedTimer: ReturnType<typeof setTimeout> | null = null

const distractors = computed(() => {
  return pinyinData
    .filter(p => p.id !== props.item.id)
    .sort(() => Math.random() - 0.5)
})

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function startGame() {
  phase.value = 'bubble'
  score.value = 0
  startBubbleRound()
}

function startBubbleRound() {
  bubbleHits.value = 0
  const others = distractors.value.slice(0, 5).map(p => p.pinyin)
  const allTexts = shuffle([props.item.pinyin, ...others])
  bubbles.value = allTexts.map((text, i) => ({
    id: i,
    text,
    isTarget: text === props.item.pinyin,
    x: 15 + Math.random() * 70,
    y: 90 + Math.random() * 10,
    size: 52 + Math.random() * 16,
    speed: 0.15 + Math.random() * 0.2,
    state: 'idle' as BubbleState,
    wobble: Math.random() * Math.PI * 2,
    wobbleSpeed: 0.02 + Math.random() * 0.03,
  }))
  animateBubbles()
}

function animateBubbles() {
  if (bubbleAnimFrame) cancelAnimationFrame(bubbleAnimFrame)
  const tick = () => {
    let allGone = true
    for (const b of bubbles.value) {
      if (b.state === 'gone') continue
      allGone = false
      b.y -= b.speed
      b.wobble += b.wobbleSpeed
      b.x += Math.sin(b.wobble) * 0.3
      if (b.y < -15) {
        b.y = 105
        b.x = 15 + Math.random() * 70
      }
    }
    if (!allGone) {
      bubbleAnimFrame = requestAnimationFrame(tick)
    }
  }
  bubbleAnimFrame = requestAnimationFrame(tick)
}

function tapBubble(bubble: Bubble) {
  if (bubble.state !== 'idle') return
  if (bubble.isTarget) {
    bubble.state = 'popping'
    bubbleHits.value++
    score.value += 10
    setTimeout(() => { bubble.state = 'gone' }, 400)
    if (bubbleHits.value >= 1) {
      setTimeout(() => {
        bubbleRound.value++
        if (bubbleAnimFrame) cancelAnimationFrame(bubbleAnimFrame)
        if (bubbleRound.value >= totalBubbleRounds) {
          phase.value = 'match'
          startMatchRound()
        } else {
          startBubbleRound()
        }
      }, 600)
    }
  } else {
    bubble.state = 'wrong'
    score.value = Math.max(0, score.value - 3)
    setTimeout(() => { bubble.state = 'idle' }, 500)
  }
}

function startMatchRound() {
  matchSelected.value = null
  matchRevealed.value = false
  const others = distractors.value.slice(matchRound.value * 3, matchRound.value * 3 + 3)
  const options = shuffle([
    { text: props.item.example, isCorrect: true },
    ...others.map(p => ({ text: p.example, isCorrect: false })),
  ])
  matchOptions.value = options
}

function selectMatch(option: { text: string; isCorrect: boolean }) {
  if (matchRevealed.value) return
  matchSelected.value = option.text
  matchRevealed.value = true
  if (option.isCorrect) {
    matchCorrect.value++
    score.value += 15
  }
  setTimeout(() => {
    matchRound.value++
    if (matchRound.value >= totalMatchRounds) {
      phase.value = 'speed'
      startSpeedRound()
    } else {
      startMatchRound()
    }
  }, 1200)
}

function startSpeedRound() {
  speedIndex.value = 0
  speedHits.value = 0
  speedFalseAlarms.value = 0
  speedShowChar.value = false
  speedFeedback.value = null

  const rounds: SpeedRound[] = []
  for (let i = 0; i < 3; i++) {
    rounds.push({ text: props.item.pinyin, isTarget: true })
  }
  const dItems = distractors.value.slice(0, 7).map(p => p.pinyin)
  for (const t of dItems) {
    rounds.push({ text: t, isTarget: false })
  }
  speedRounds.value = shuffle(rounds)
  showNextSpeedChar()
}

function showNextSpeedChar() {
  if (speedIndex.value >= speedRounds.value.length) {
    finishSpeedRound()
    return
  }
  speedShowChar.value = true
  speedFeedback.value = null
  speedTimer = setTimeout(() => {
    speedShowChar.value = false
    speedIndex.value++
    setTimeout(() => showNextSpeedChar(), 300)
  }, 1500)
}

function tapSpeedChar() {
  if (!speedShowChar.value) return
  const current = speedRounds.value[speedIndex.value]
  if (!current) return

  if (current.isTarget) {
    speedHits.value++
    score.value += 8
    speedFeedback.value = 'hit'
  } else {
    speedFalseAlarms.value++
    score.value = Math.max(0, score.value - 5)
    speedFeedback.value = 'false'
  }

  if (speedTimer) clearTimeout(speedTimer)
  speedShowChar.value = false
  speedIndex.value++
  setTimeout(() => showNextSpeedChar(), 500)
}

function finishSpeedRound() {
  phase.value = 'done'
  const finalScore = Math.min(score.value, maxScore.value)
  const stars = finalScore >= 80 ? 3 : finalScore >= 50 ? 2 : 1
  emit('complete', finalScore, stars)
}

function restartGame() {
  phase.value = 'intro'
  score.value = 0
  bubbleRound.value = 0
  matchRound.value = 0
  matchCorrect.value = 0
  if (bubbleAnimFrame) cancelAnimationFrame(bubbleAnimFrame)
  if (speedTimer) clearTimeout(speedTimer)
}

watch(() => props.item.id, () => {
  restartGame()
})

onUnmounted(() => {
  if (bubbleAnimFrame) cancelAnimationFrame(bubbleAnimFrame)
  if (speedTimer) clearTimeout(speedTimer)
})
</script>

<template>
  <div class="pinyin-mini-game">
    <div v-if="phase === 'intro'" class="flex flex-col items-center gap-5 py-4">
      <div class="text-5xl animate-bounce">🎮</div>
      <h3 class="text-xl font-bold text-gray-600">趣味互动</h3>
      <p class="text-sm text-gray-500 text-center px-4">
        通过三个小游戏来加深对
        <span class="text-2xl font-bold" :style="{ color }">{{ item.pinyin }}</span>
        的印象吧！
      </p>
      <div class="grid grid-cols-3 gap-3 w-full px-2">
        <div class="flex flex-col items-center gap-1 rounded-2xl p-3" style="background-color: #EBF5FF">
          <span class="text-2xl">🫧</span>
          <span class="text-xs font-bold text-gray-500">泡泡消消乐</span>
        </div>
        <div class="flex flex-col items-center gap-1 rounded-2xl p-3" style="background-color: #FFF3D6">
          <span class="text-2xl">🔗</span>
          <span class="text-xs font-bold text-gray-500">词语配对</span>
        </div>
        <div class="flex flex-col items-center gap-1 rounded-2xl p-3" style="background-color: #F0FFF0">
          <span class="text-2xl">⚡</span>
          <span class="text-xs font-bold text-gray-500">快速点击</span>
        </div>
      </div>
      <button
        class="w-full rounded-2xl py-3 text-lg font-bold text-white shadow-md transition-all active:scale-95"
        :style="{ backgroundColor: color }"
        @click="startGame"
      >
        开始游戏 🎮
      </button>
    </div>

    <div v-else-if="phase === 'bubble'" class="flex flex-col items-center gap-3">
      <div class="flex items-center justify-between w-full px-2">
        <div class="flex items-center gap-2">
          <span class="text-lg">🫧</span>
          <span class="text-sm font-bold text-gray-600">泡泡消消乐</span>
        </div>
        <div class="flex items-center gap-1">
          <span
            v-for="i in totalBubbleRounds"
            :key="i"
            class="inline-block h-2.5 w-2.5 rounded-full transition-all"
            :style="{
              backgroundColor: i <= bubbleRound ? color : '#E5E7EB',
              transform: i === bubbleRound + 1 ? 'scale(1.3)' : 'scale(1)',
            }"
          />
        </div>
      </div>

      <div class="flex items-center gap-2 rounded-full px-4 py-1.5" :style="{ backgroundColor: color + '18' }">
        <span class="text-sm font-bold" :style="{ color }">找到并点击</span>
        <span class="text-2xl font-bold" :style="{ color }">{{ item.pinyin }}</span>
        <span class="text-sm font-bold" :style="{ color }">泡泡</span>
      </div>

      <div class="relative w-full overflow-hidden rounded-2xl" style="height: 320px; background: linear-gradient(180deg, #FFF9E6 0%, #FFF3D6 100%)">
        <div class="absolute top-2 left-0 right-0 flex justify-center">
          <div class="flex items-center gap-1 rounded-full bg-white/80 px-3 py-1 shadow-sm">
            <span class="text-xs font-bold text-gray-500">得分: {{ score }}</span>
          </div>
        </div>
        <button
          v-for="bubble in bubbles"
          :key="bubble.id"
          class="absolute flex items-center justify-center rounded-full transition-all duration-300 shadow-lg"
          :style="{
            left: bubble.x + '%',
            top: bubble.y + '%',
            width: bubble.size + 'px',
            height: bubble.size + 'px',
            transform: `translate(-50%, -50%) scale(${bubble.state === 'popping' ? 1.4 : bubble.state === 'wrong' ? 0.9 : 1})`,
            opacity: bubble.state === 'gone' ? 0 : bubble.state === 'popping' ? 0.6 : 1,
            background: bubble.state === 'popping'
              ? `radial-gradient(circle, ${color}44, ${color}22)`
              : bubble.state === 'wrong'
                ? 'radial-gradient(circle, #FF6B6B44, #FF6B6B22)'
                : `radial-gradient(circle, white, ${color}18)`,
            border: `3px solid ${bubble.state === 'wrong' ? '#FF6B6B' : color + '66'}`,
            cursor: bubble.state === 'idle' ? 'pointer' : 'default',
            animation: bubble.state === 'popping' ? 'popEffect 0.4s ease-out' : bubble.state === 'wrong' ? 'shakeEffect 0.4s ease-out' : 'none',
          }"
          :disabled="bubble.state !== 'idle'"
          @click="tapBubble(bubble)"
        >
          <span
            class="font-bold"
            :style="{
              fontSize: (bubble.size * 0.4) + 'px',
              color: bubble.state === 'wrong' ? '#FF6B6B' : color,
            }"
          >
            {{ bubble.text }}
          </span>
        </button>
      </div>
    </div>

    <div v-else-if="phase === 'match'" class="flex flex-col items-center gap-4 py-2">
      <div class="flex items-center justify-between w-full px-2">
        <div class="flex items-center gap-2">
          <span class="text-lg">🔗</span>
          <span class="text-sm font-bold text-gray-600">词语配对</span>
        </div>
        <div class="flex items-center gap-1">
          <span
            v-for="i in totalMatchRounds"
            :key="i"
            class="inline-block h-2.5 w-2.5 rounded-full transition-all"
            :style="{
              backgroundColor: i <= matchRound ? color : '#E5E7EB',
              transform: i === matchRound + 1 ? 'scale(1.3)' : 'scale(1)',
            }"
          />
        </div>
      </div>

      <div class="flex flex-col items-center gap-3 w-full">
        <div
          class="flex h-24 w-24 items-center justify-center rounded-3xl shadow-lg"
          :style="{ backgroundColor: color + '18' }"
        >
          <span class="text-5xl font-bold" :style="{ color }">{{ item.pinyin }}</span>
        </div>
        <p class="text-sm font-bold text-gray-500">选择对应的词语</p>

        <div class="grid grid-cols-2 gap-3 w-full">
          <button
            v-for="option in matchOptions"
            :key="option.text"
            class="flex items-center justify-center rounded-2xl border-2 py-4 text-xl font-bold transition-all duration-200 active:scale-95"
            :style="{
              borderColor: matchRevealed && option.isCorrect
                ? color
                : matchRevealed && matchSelected === option.text && !option.isCorrect
                  ? '#FF6B6B'
                  : matchSelected === option.text
                    ? color
                    : '#E0E0E0',
              backgroundColor: matchRevealed && option.isCorrect
                ? color + '18'
                : matchRevealed && matchSelected === option.text && !option.isCorrect
                  ? '#FF6B6B18'
                  : 'white',
              color: matchRevealed && option.isCorrect
                ? color
                : matchRevealed && matchSelected === option.text && !option.isCorrect
                  ? '#FF6B6B'
                  : '#333',
            }"
            :disabled="matchRevealed"
            @click="selectMatch(option)"
          >
            {{ option.text }}
          </button>
        </div>

        <div v-if="matchRevealed" class="text-center">
          <p class="text-base font-bold" :style="{ color: matchSelected === item.example ? color : '#FF6B6B' }">
            {{ matchSelected === item.example ? '✅ 正确！' : '😊 没关系，继续加油！' }}
          </p>
        </div>
      </div>
    </div>

    <div v-else-if="phase === 'speed'" class="flex flex-col items-center gap-4 py-2">
      <div class="flex items-center justify-between w-full px-2">
        <div class="flex items-center gap-2">
          <span class="text-lg">⚡</span>
          <span class="text-sm font-bold text-gray-600">快速点击</span>
        </div>
        <span class="text-xs font-bold text-gray-400">{{ speedIndex }}/{{ speedRounds.length }}</span>
      </div>

      <div class="flex items-center gap-2 rounded-full px-4 py-1.5" :style="{ backgroundColor: color + '18' }">
        <span class="text-sm font-bold" :style="{ color }">看到</span>
        <span class="text-xl font-bold" :style="{ color }">{{ item.pinyin }}</span>
        <span class="text-sm font-bold" :style="{ color }">就快快点击！</span>
      </div>

      <div
        class="relative flex h-56 w-full items-center justify-center rounded-2xl overflow-hidden"
        style="background: linear-gradient(135deg, #FFF9E6, #FFF3D6)"
      >
        <Transition name="speed-char" mode="out-in">
          <div
            v-if="speedShowChar && speedIndex < speedRounds.length"
            :key="speedIndex"
            class="flex flex-col items-center gap-2"
            @click="tapSpeedChar"
          >
            <span
              class="text-7xl font-bold cursor-pointer transition-transform active:scale-90"
              :style="{
                color: speedRounds[speedIndex]?.isTarget ? color : '#666',
                animation: speedRounds[speedIndex]?.isTarget ? 'pulseTarget 0.5s ease-in-out infinite' : 'none',
              }"
            >
              {{ speedRounds[speedIndex]?.text }}
            </span>
          </div>
          <div v-else class="flex flex-col items-center gap-2">
            <span class="text-4xl">👀</span>
            <span class="text-sm text-gray-400">准备...</span>
          </div>
        </Transition>

        <div
          v-if="speedFeedback"
          class="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <span
            class="text-3xl font-bold animate-bounce"
            :style="{ color: speedFeedback === 'hit' ? color : '#FF6B6B' }"
          >
            {{ speedFeedback === 'hit' ? '✓' : '✗' }}
          </span>
        </div>
      </div>

      <div class="flex items-center gap-4 text-sm">
        <div class="flex items-center gap-1">
          <span class="text-green-500">✓</span>
          <span class="font-bold text-gray-600">{{ speedHits }}</span>
        </div>
        <div class="flex items-center gap-1">
          <span class="text-red-400">✗</span>
          <span class="font-bold text-gray-600">{{ speedFalseAlarms }}</span>
        </div>
      </div>
    </div>

    <div v-else-if="phase === 'done'" class="flex flex-col items-center gap-5 py-4">
      <div class="text-5xl">🎉</div>
      <h3 class="text-xl font-bold text-gray-600">互动完成！</h3>

      <div
        class="w-full rounded-2xl p-5 text-center"
        :style="{ backgroundColor: color + '12' }"
      >
        <div class="flex items-center justify-center gap-1 mb-2">
          <span
            v-for="i in 3"
            :key="i"
            class="text-3xl transition-all"
            :style="{ opacity: i <= (score >= 80 ? 3 : score >= 50 ? 2 : 1) ? 1 : 0.2 }"
          >
            ⭐
          </span>
        </div>
        <p class="text-2xl font-bold" :style="{ color }">{{ score }} 分</p>
        <p class="text-sm text-gray-500 mt-1">
          {{ score >= 80 ? '太厉害了！完美掌握！' : score >= 50 ? '不错哦！继续加油！' : '再练练会更好的！' }}
        </p>
      </div>

      <button
        class="w-full rounded-2xl border-2 py-3 text-base font-bold transition-all active:scale-95"
        :style="{ borderColor: color, color }"
        @click="restartGame"
      >
        🔄 再玩一次
      </button>
    </div>
  </div>
</template>

<style scoped>
@keyframes popEffect {
  0% { transform: translate(-50%, -50%) scale(1); }
  50% { transform: translate(-50%, -50%) scale(1.5); }
  100% { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
}
@keyframes shakeEffect {
  0%, 100% { transform: translate(-50%, -50%) scale(0.9); }
  25% { transform: translate(calc(-50% + 4px), -50%) scale(0.9); }
  75% { transform: translate(calc(-50% - 4px), -50%) scale(0.9); }
}
@keyframes pulseTarget {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}
.speed-char-enter-active { animation: speedIn 0.3s ease-out; }
.speed-char-leave-active { animation: speedOut 0.2s ease-in; }
@keyframes speedIn { from { opacity: 0; transform: scale(0.5); } to { opacity: 1; transform: scale(1); } }
@keyframes speedOut { from { opacity: 1; transform: scale(1); } to { opacity: 0; transform: scale(0.8); } }
</style>
