<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick, computed } from 'vue'

const props = defineProps<{
  text: string
  type: 'pinyin' | 'english'
  color?: string
  size?: number
  requiredCount?: number
}>()

const emit = defineEmits<{
  (e: 'complete', accuracy: number): void
  (e: 'attemptComplete', attempt: number, accuracy: number): void
}>()

const color = computed(() => props.color || (props.type === 'english' ? '#54A0FF' : '#FF9F43'))
const canvasSize = computed(() => props.size || 220)
const requiredCount = computed(() => props.requiredCount || 2)

const letters = computed(() => props.text.split(''))

type Phase = 'demo' | 'practice'
const phase = ref<Phase>('demo')
const currentLetterIndex = ref(0)
const currentAttempt = ref(1)
const attemptResults = ref<{ accuracy: number; stars: number }[]>([])
const allCompleted = ref(false)
const demoPlayed = ref(false)
const isAnimating = ref(false)

const canvasRef = ref<HTMLCanvasElement | null>(null)
const isDrawing = ref(false)
const hasDrawn = ref(false)
const ctx = ref<CanvasRenderingContext2D | null>(null)
const lastPoint = ref<{ x: number; y: number } | null>(null)
const canvasWidth = ref(canvasSize.value)
const canvasHeight = ref(canvasSize.value)
const strokePaths = ref<{ x: number; y: number }[][]>([])
const currentPath = ref<{ x: number; y: number }[]>([])
const guideOpacity = ref(0.2)

const currentLetter = computed(() => letters.value[currentLetterIndex.value] || '')

const letterProgress = computed(() => `${currentLetterIndex.value + 1}/${letters.value.length}`)

const attemptLabels = computed(() => {
  return Array.from({ length: requiredCount.value }, (_, i) => ({
    index: i + 1,
    completed: i < attemptResults.value.length,
    current: i === currentAttempt.value - 1 && !allCompleted.value,
    accuracy: attemptResults.value[i]?.accuracy || 0,
    stars: attemptResults.value[i]?.stars || 0,
  }))
})

function initCanvas() {
  if (!canvasRef.value) return
  const canvas = canvasRef.value
  const dpr = window.devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()

  canvasWidth.value = rect.width
  canvasHeight.value = rect.height

  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr

  const context = canvas.getContext('2d')
  if (!context) return

  context.scale(dpr, dpr)
  ctx.value = context

  drawGrid()
  drawGuide()
}

function drawGrid() {
  if (!ctx.value) return
  const context = ctx.value
  const w = canvasWidth.value
  const h = canvasHeight.value

  context.save()
  context.strokeStyle = color.value
  context.lineWidth = 1.5
  context.globalAlpha = 0.5
  context.setLineDash([])

  context.beginPath()
  context.moveTo(0, h * 0.75)
  context.lineTo(w, h * 0.75)
  context.stroke()

  context.setLineDash([4, 4])
  context.lineWidth = 0.8
  context.globalAlpha = 0.3
  context.beginPath()
  context.moveTo(0, h * 0.5)
  context.lineTo(w, h * 0.5)
  context.stroke()
  context.beginPath()
  context.moveTo(0, h * 0.25)
  context.lineTo(w, h * 0.25)
  context.stroke()

  context.setLineDash([])
  context.restore()
}

function drawGuide() {
  if (!ctx.value || !currentLetter.value) return
  const context = ctx.value
  const centerX = canvasWidth.value / 2
  const centerY = canvasHeight.value * 0.55

  context.save()
  context.globalAlpha = guideOpacity.value
  context.font = `bold ${Math.min(canvasWidth.value, canvasHeight.value) * 0.55}px sans-serif`
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillStyle = color.value
  context.fillText(currentLetter.value, centerX, centerY)
  context.restore()
}

function clearCanvas() {
  if (!ctx.value) return
  ctx.value.clearRect(0, 0, canvasWidth.value, canvasHeight.value)
  drawGrid()
  drawGuide()
  strokePaths.value = []
  currentPath.value = []
  hasDrawn.value = false
  guideOpacity.value = 0.2
}

function getPoint(e: MouseEvent | TouchEvent): { x: number; y: number } {
  const canvas = canvasRef.value!
  const rect = canvas.getBoundingClientRect()
  let clientX: number, clientY: number

  if ('touches' in e) {
    clientX = e.touches[0].clientX
    clientY = e.touches[0].clientY
  } else {
    clientX = e.clientX
    clientY = e.clientY
  }

  return { x: clientX - rect.left, y: clientY - rect.top }
}

function startDraw(e: MouseEvent | TouchEvent) {
  e.preventDefault()
  isDrawing.value = true
  hasDrawn.value = true
  guideOpacity.value = 0.08

  const point = getPoint(e)
  lastPoint.value = point
  currentPath.value = [point]

  if (!ctx.value) return
  ctx.value.beginPath()
  ctx.value.moveTo(point.x, point.y)
  ctx.value.strokeStyle = '#333333'
  ctx.value.lineWidth = 4
  ctx.value.lineCap = 'round'
  ctx.value.lineJoin = 'round'
}

function draw(e: MouseEvent | TouchEvent) {
  e.preventDefault()
  if (!isDrawing.value || !ctx.value || !lastPoint.value) return

  const point = getPoint(e)
  currentPath.value.push(point)

  ctx.value.beginPath()
  ctx.value.moveTo(lastPoint.value.x, lastPoint.value.y)
  ctx.value.lineTo(point.x, point.y)
  ctx.value.strokeStyle = '#333333'
  ctx.value.lineWidth = 4
  ctx.value.lineCap = 'round'
  ctx.value.lineJoin = 'round'
  ctx.value.stroke()

  lastPoint.value = point
}

function endDraw(e?: MouseEvent | TouchEvent) {
  if (e) e.preventDefault()
  if (!isDrawing.value) return
  isDrawing.value = false

  if (currentPath.value.length > 2) {
    strokePaths.value.push([...currentPath.value])
  }

  currentPath.value = []
  lastPoint.value = null
}

function submitLetter() {
  if (!hasDrawn.value) return

  if (currentLetterIndex.value < letters.value.length - 1) {
    currentLetterIndex.value++
    nextTick(() => {
      clearCanvas()
    })
  } else {
    finishAttempt()
  }
}

function finishAttempt() {
  const strokeCount = strokePaths.value.length
  const expectedStrokes = letters.value.length
  const accuracy = Math.min(strokeCount / expectedStrokes, 1) * 100
  const finalAccuracy = Math.max(accuracy, 50)
  const stars = finalAccuracy >= 80 ? 3 : finalAccuracy >= 50 ? 2 : 1

  attemptResults.value.push({ accuracy: finalAccuracy, stars })
  emit('attemptComplete', currentAttempt.value, finalAccuracy)

  if (currentAttempt.value < requiredCount.value) {
    currentAttempt.value++
    currentLetterIndex.value = 0
    nextTick(() => {
      clearCanvas()
    })
  } else {
    allCompleted.value = true
    const avgAccuracy = attemptResults.value.reduce((sum, r) => sum + r.accuracy, 0) / attemptResults.value.length
    emit('complete', avgAccuracy)
  }
}

function playDemo() {
  isAnimating.value = true
  currentLetterIndex.value = 0
  demoPlayed.value = false

  let idx = 0
  const interval = setInterval(() => {
    if (idx >= letters.value.length) {
      clearInterval(interval)
      isAnimating.value = false
      demoPlayed.value = true
      return
    }
    currentLetterIndex.value = idx
    idx++
  }, 600)
}

function startPractice() {
  phase.value = 'practice'
  currentLetterIndex.value = 0
  nextTick(() => {
    initCanvas()
  })
}

function goBackToDemo() {
  phase.value = 'demo'
  currentLetterIndex.value = 0
  demoPlayed.value = false
}

function resetAll() {
  currentAttempt.value = 1
  attemptResults.value = []
  allCompleted.value = false
  currentLetterIndex.value = 0
  demoPlayed.value = false
  isAnimating.value = false
  hasDrawn.value = false
  strokePaths.value = []
  currentPath.value = []
  phase.value = 'demo'
}

watch(() => props.text, () => {
  nextTick(() => {
    resetAll()
  })
})

onMounted(() => {
  window.addEventListener('resize', initCanvas)
})

onUnmounted(() => {
  window.removeEventListener('resize', initCanvas)
})
</script>

<template>
  <div class="letter-writer flex flex-col items-center gap-4">
    <div class="text-center">
      <span class="text-sm font-bold" :style="{ color }">
        {{ phase === 'demo' ? '👀 先看字母顺序' : `✍️ 第 ${currentAttempt}/${requiredCount} 次练习` }}
      </span>
    </div>

    <div v-if="phase === 'demo'" class="flex flex-col items-center gap-3">
      <div
        class="relative rounded-2xl border-3 bg-white shadow-inner overflow-hidden flex items-center justify-center"
        :style="{ width: canvasSize + 'px', height: canvasSize + 'px', borderColor: color + '40' }"
      >
        <svg
          class="absolute inset-0 w-full h-full"
          :viewBox="`0 0 ${canvasSize} ${canvasSize}`"
        >
          <line x1="0" :y1="canvasSize * 0.75" :x2="canvasSize" :y2="canvasSize * 0.75" :stroke="color" stroke-width="1.5" opacity="0.5" />
          <line x1="0" :y1="canvasSize * 0.5" :x2="canvasSize" :y2="canvasSize * 0.5" :stroke="color" stroke-width="0.8" stroke-dasharray="4,4" opacity="0.3" />
          <line x1="0" :y1="canvasSize * 0.25" :x2="canvasSize" :y2="canvasSize * 0.25" :stroke="color" stroke-width="0.8" stroke-dasharray="4,4" opacity="0.2" />
        </svg>

        <div class="relative z-10 flex items-end justify-center gap-1" :style="{ lineHeight: canvasSize * 0.75 + 'px' }">
          <span
            v-for="(letter, idx) in letters"
            :key="idx"
            class="font-bold transition-all duration-300"
            :style="{
              fontSize: canvasSize * 0.4 + 'px',
              color: color,
              opacity: idx <= currentLetterIndex ? 1 : 0.15,
              transform: idx === currentLetterIndex && isAnimating ? 'scale(1.2)' : 'scale(1)',
            }"
          >
            {{ letter }}
          </span>
        </div>
      </div>

      <div v-if="isAnimating" class="flex items-center gap-2">
        <span class="text-xs font-bold" :style="{ color }">
          第 {{ currentLetterIndex + 1 }} 个字母 / 共 {{ letters.length }} 个
        </span>
        <div class="h-2 w-24 rounded-full bg-gray-100 overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-300"
            :style="{
              width: ((currentLetterIndex + 1) / letters.length) * 100 + '%',
              backgroundColor: color,
            }"
          />
        </div>
      </div>

      <div class="flex items-center gap-3">
        <button
          class="flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-bold transition-all active:scale-95"
          :style="{ backgroundColor: color + '18', color }"
          @click="playDemo"
        >
          {{ isAnimating ? '⏸ 播放中...' : demoPlayed ? '🔄 再看一遍' : '▶️ 看顺序' }}
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
    </div>

    <div v-else class="flex flex-col items-center gap-3">
      <div class="mb-2 flex items-center gap-2">
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

      <div class="flex items-center gap-1 mb-2">
        <span
          v-for="(letter, idx) in letters"
          :key="idx"
          class="flex items-center justify-center rounded-lg text-sm font-bold transition-all duration-300"
          :style="{
            width: '32px',
            height: '32px',
            backgroundColor: idx < currentLetterIndex ? '#2ED573' : idx === currentLetterIndex ? color : '#F3F4F6',
            color: idx < currentLetterIndex ? 'white' : idx === currentLetterIndex ? 'white' : '#9CA3AF',
            transform: idx === currentLetterIndex ? 'scale(1.15)' : 'scale(1)',
          }"
        >
          {{ idx < currentLetterIndex ? '✓' : letter }}
        </span>
      </div>

      <div
        class="relative rounded-2xl border-3 bg-white shadow-inner overflow-hidden"
        :style="{ width: canvasSize + 'px', height: canvasSize + 'px', borderColor: color + '40' }"
      >
        <canvas
          ref="canvasRef"
          class="absolute inset-0 w-full h-full touch-none cursor-crosshair"
          @mousedown="startDraw"
          @mousemove="draw"
          @mouseup="endDraw"
          @mouseleave="endDraw"
          @touchstart="startDraw"
          @touchmove="draw"
          @touchend="endDraw"
        />
      </div>

      <div class="flex items-center gap-2">
        <span class="text-xs font-bold" :style="{ color }">
          写第 {{ letterProgress }} 个字母：{{ currentLetter }}
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
          class="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition-all active:scale-95"
          :style="{ backgroundColor: color + '18', color }"
          @click="clearCanvas"
        >
          🔄 重写
        </button>

        <button
          v-if="hasDrawn && !allCompleted"
          class="flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-bold text-white transition-all active:scale-95"
          :style="{ backgroundColor: color }"
          @click="submitLetter"
        >
          {{ currentLetterIndex < letters.length - 1 ? '✓ 下一个字母' : '✓ 完成书写' }}
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
