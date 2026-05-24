<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick, computed } from 'vue'
import HanziWriter from 'hanzi-writer'

const props = defineProps<{
  character: string
  color?: string
  size?: number
  requiredCount?: number
}>()

const emit = defineEmits<{
  (e: 'complete', accuracy: number): void
  (e: 'attemptComplete', attempt: number, accuracy: number): void
}>()

const color = computed(() => props.color || '#2ED573')
const size = computed(() => props.size || 260)
const requiredCount = computed(() => props.requiredCount || 3)

const targetRef = ref<HTMLDivElement | null>(null)

type Phase = 'demo' | 'practice'
const phase = ref<Phase>('demo')
const currentAttempt = ref(1)
const attemptResults = ref<{ accuracy: number; stars: number }[]>([])
const allCompleted = ref(false)

const isAnimating = ref(false)
const isQuizzing = ref(false)
const currentStrokeNum = ref(0)
const totalStrokes = ref(0)
const strokeMistakes = ref(0)
const demoPlayed = ref(false)
const writerReady = ref(false)
const loadError = ref(false)

let writer: HanziWriter | null = null

const attemptLabels = computed(() => {
  return Array.from({ length: requiredCount.value }, (_, i) => ({
    index: i + 1,
    completed: i < attemptResults.value.length,
    current: i === currentAttempt.value - 1 && !allCompleted.value,
    accuracy: attemptResults.value[i]?.accuracy || 0,
    stars: attemptResults.value[i]?.stars || 0,
  }))
})

const phaseLabel = computed(() => {
  if (phase.value === 'demo') return '👀 先看笔画顺序'
  return `✍️ 第 ${currentAttempt.value}/${requiredCount.value} 次练习`
})

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function createWriter(quizMode: boolean = false) {
  if (!targetRef.value) return

  targetRef.value.innerHTML = ''
  writerReady.value = false
  loadError.value = false
  writer = null

  writer = HanziWriter.create(targetRef.value, props.character, {
    width: size.value,
    height: size.value,
    padding: 5,
    showOutline: true,
    strokeAnimationSpeed: 1,
    delayBetweenStrokes: 300,
    strokeColor: quizMode ? hexToRgba(color.value, 0.13) : color.value,
    outlineColor: hexToRgba(color.value, 0.19),
    drawingColor: quizMode ? '#333333' : color.value,
    drawingWidth: 6,
    highlightColor: hexToRgba(color.value, 0.38),
    radicalColor: hexToRgba(color.value, 0.50),
    showHintAfterMisses: quizMode ? 2 : undefined,
    showCharacter: !quizMode,
    onLoadCharDataSuccess: function (data: any) {
      totalStrokes.value = data.strokes.length
      writerReady.value = true
    },
    onLoadCharDataError: function () {
      loadError.value = true
      totalStrokes.value = Math.max(props.character.length * 2, 3)
    },
  })
}

function playDemo() {
  if (!writer || !writerReady.value) return
  isAnimating.value = true
  currentStrokeNum.value = 0
  writer.animateCharacter({
    onComplete: function () {
      isAnimating.value = false
      demoPlayed.value = true
    },
  })
}

function startPractice() {
  phase.value = 'practice'
  nextTick(() => {
    createWriter(true)
    waitForReadyAndStartQuiz()
  })
}

function waitForReadyAndStartQuiz() {
  if (writerReady.value) {
    doStartQuiz()
    return
  }
  const unwatch = watch(writerReady, (ready) => {
    if (ready) {
      unwatch()
      doStartQuiz()
    }
  })
}

function startQuiz() {
  waitForReadyAndStartQuiz()
}

function doStartQuiz() {
  if (!writer) return
  currentStrokeNum.value = 0
  strokeMistakes.value = 0
  isQuizzing.value = true

  writer.quiz({
    onMistake: function (strokeData: any) {
      strokeMistakes.value++
      currentStrokeNum.value = strokeData.strokeNum
    },
    onCorrectStroke: function (strokeData: any) {
      currentStrokeNum.value = strokeData.strokeNum + 1
    },
    onComplete: function (summaryData: any) {
      isQuizzing.value = false
      const totalMistakes = summaryData.totalMistakes
      const accuracy = Math.max(50, Math.min(100, 100 - totalMistakes * 10))
      const stars = accuracy >= 80 ? 3 : accuracy >= 50 ? 2 : 1

      attemptResults.value.push({ accuracy, stars })
      emit('attemptComplete', currentAttempt.value, accuracy)

      if (currentAttempt.value < requiredCount.value) {
        currentAttempt.value++
        nextTick(() => {
          createWriter(true)
          waitForReadyAndStartQuiz()
        })
      } else {
        allCompleted.value = true
        const avgAccuracy = attemptResults.value.reduce((sum, r) => sum + r.accuracy, 0) / attemptResults.value.length
        emit('complete', avgAccuracy)
      }
    },
  })
}

function goBackToDemo() {
  phase.value = 'demo'
  isQuizzing.value = false
  nextTick(() => {
    createWriter(false)
  })
}

function resetAll() {
  currentAttempt.value = 1
  attemptResults.value = []
  allCompleted.value = false
  currentStrokeNum.value = 0
  strokeMistakes.value = 0
  demoPlayed.value = false
  isAnimating.value = false
  isQuizzing.value = false
  writerReady.value = false
  phase.value = 'demo'
  nextTick(() => {
    createWriter(false)
  })
}

watch(() => props.character, () => {
  nextTick(() => {
    resetAll()
  })
})

onMounted(() => {
  nextTick(() => {
    createWriter(false)
  })
})

onUnmounted(() => {
  writer = null
})
</script>

<template>
  <div class="hanzi-stroke-writer flex flex-col items-center gap-4">
    <div class="text-center">
      <span class="text-sm font-bold" :style="{ color }">
        {{ phaseLabel }}
      </span>
    </div>

    <div
      class="relative rounded-2xl border-3 bg-white shadow-inner overflow-hidden"
      :style="{ width: size + 'px', height: size + 'px', borderColor: color + '40' }"
    >
      <div ref="targetRef" :style="{ width: size + 'px', height: size + 'px' }"></div>
    </div>

    <div v-if="loadError" class="text-xs text-red-400">
      ⚠️ 笔画数据加载失败，请检查网络连接
    </div>

    <div v-if="!writerReady && !loadError" class="text-xs text-gray-400">
      加载笔画数据中...
    </div>

    <div v-if="phase === 'demo'" class="flex flex-col items-center gap-3">
      <div class="flex items-center gap-3">
        <button
          class="flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-bold transition-all active:scale-95"
          :style="{ backgroundColor: color + '18', color }"
          :disabled="!writerReady"
          @click="playDemo"
        >
          {{ isAnimating ? '⏸ 播放中...' : demoPlayed ? '🔄 再看一遍' : '▶️ 看笔画' }}
        </button>

        <button
          v-if="demoPlayed"
          class="flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-bold text-white transition-all active:scale-95"
          :style="{ backgroundColor: color }"
          @click="startPractice"
        >
          ✍️ 开始练习
        </button>
      </div>

      <div v-if="totalStrokes > 0" class="text-xs text-gray-400">
        共 {{ totalStrokes }} 笔
      </div>
    </div>

    <div v-else class="flex flex-col items-center gap-3">
      <div class="flex items-center gap-2">
        <div
          v-for="label in attemptLabels"
          :key="label.index"
          class="flex items-center justify-center rounded-full text-xs font-bold transition-all duration-300"
          :style="{
            width: '28px',
            height: '28px',
            backgroundColor: label.completed ? '#2ED573' : label.current ? color : '#F3F4F6',
            color: label.completed ? 'white' : label.current ? 'white' : '#9CA3AF',
            boxShadow: label.current ? `0 0 0 3px ${color}33` : 'none',
            transform: label.current ? 'scale(1.15)' : 'scale(1)',
          }"
        >
          {{ label.completed ? '✓' : label.index }}
        </div>
      </div>

      <div v-if="isQuizzing" class="flex flex-col items-center gap-2">
        <span class="text-xs font-bold" :style="{ color }">
          第 {{ currentStrokeNum }} 笔 / 共 {{ totalStrokes }} 笔
        </span>
        <div class="h-2 w-24 rounded-full bg-gray-100 overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-300"
            :style="{
              width: (currentStrokeNum / totalStrokes) * 100 + '%',
              backgroundColor: color,
            }"
          />
        </div>
        <span class="text-[11px] text-gray-400 animate-pulse">
          👆 用手指沿着笔画描摹哦！
        </span>
      </div>

      <div class="flex items-center gap-3">
        <button
          class="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition-all active:scale-95"
          :style="{ backgroundColor: color + '18', color }"
          @click="goBackToDemo"
        >
          👀 再看演示
        </button>

        <button
          v-if="allCompleted"
          class="flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-bold text-white transition-all active:scale-95"
          style="background-color: #2ED573"
          @click="resetAll"
        >
          🔄 再练一遍
        </button>
      </div>

      <div v-if="attemptResults.length > 0" class="flex items-center gap-4">
        <div
          v-for="(result, idx) in attemptResults"
          :key="idx"
          class="flex flex-col items-center gap-0.5"
        >
          <span class="text-[10px] text-gray-400">第{{ idx + 1 }}次</span>
          <div class="flex gap-0.5">
            <span
              v-for="i in 3"
              :key="i"
              class="text-xs"
              :style="{ color: i <= result.stars ? '#FFD700' : '#E5E7EB' }"
            >
              ★
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.border-3 {
  border-width: 3px;
}
</style>
