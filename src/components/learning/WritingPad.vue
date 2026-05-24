<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick, computed } from 'vue'

const props = defineProps<{
  character: string
  type: 'chinese' | 'pinyin' | 'english'
  color?: string
  width?: number
  height?: number
  requiredCount?: number
}>()

const emit = defineEmits<{
  (e: 'complete', accuracy: number): void
  (e: 'attemptComplete', attempt: number, accuracy: number): void
}>()

const color = computed(() => props.color || (props.type === 'chinese' ? '#2ED573' : '#FF9F43'))
const requiredCount = computed(() => props.requiredCount || 3)

const canvasRef = ref<HTMLCanvasElement | null>(null)
const isDrawing = ref(false)
const currentAttempt = ref(1)
const attemptResults = ref<{ accuracy: number; stars: number }[]>([])
const hasDrawn = ref(false)
const ctx = ref<CanvasRenderingContext2D | null>(null)
const lastPoint = ref<{ x: number; y: number } | null>(null)
const canvasWidth = ref(props.width || 260)
const canvasHeight = ref(props.height || 260)
const strokePaths = ref<{ x: number; y: number }[][]>([])
const currentPath = ref<{ x: number; y: number }[]>([])
const guideOpacity = ref(0.15)
const allCompleted = ref(false)

const isChinese = computed(() => props.type === 'chinese')

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
  context.strokeStyle = '#E5E7EB'
  context.lineWidth = 1

  if (isChinese.value) {
    context.setLineDash([5, 5])
    context.beginPath()
    context.moveTo(w / 2, 0)
    context.lineTo(w / 2, h)
    context.stroke()
    context.beginPath()
    context.moveTo(0, h / 2)
    context.lineTo(w, h / 2)
    context.stroke()
    context.setLineDash([4, 6])
    context.globalAlpha = 0.5
    context.beginPath()
    context.moveTo(0, 0)
    context.lineTo(w, h)
    context.stroke()
    context.beginPath()
    context.moveTo(w, 0)
    context.lineTo(0, h)
    context.stroke()
  } else {
    context.setLineDash([])
    context.strokeStyle = color.value
    context.globalAlpha = 0.5
    context.lineWidth = 1.5
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
  }

  context.setLineDash([])
  context.restore()
}

function drawGuide() {
  if (!ctx.value) return
  const context = ctx.value
  const centerX = canvasWidth.value / 2
  const centerY = isChinese.value
    ? canvasHeight.value / 2
    : canvasHeight.value * 0.55

  context.save()
  context.globalAlpha = guideOpacity.value

  if (isChinese.value) {
    context.font = `bold ${Math.min(canvasWidth.value, canvasHeight.value) * 0.65}px serif`
  } else {
    context.font = `bold ${Math.min(canvasWidth.value, canvasHeight.value) * 0.4}px sans-serif`
  }

  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillStyle = color.value
  context.fillText(props.character, centerX, centerY)
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
  guideOpacity.value = 0.06

  const point = getPoint(e)
  lastPoint.value = point
  currentPath.value = [point]

  if (!ctx.value) return
  ctx.value.beginPath()
  ctx.value.moveTo(point.x, point.y)
  ctx.value.strokeStyle = '#333333'
  ctx.value.lineWidth = isChinese.value ? 5 : 4
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
  ctx.value.lineWidth = isChinese.value ? 5 : 4
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

function submitAttempt() {
  if (!hasDrawn.value) return

  const strokeCount = strokePaths.value.length
  const expectedStrokes = isChinese.value
    ? Math.max(props.character.length * 2, 3)
    : props.character.length
  const accuracy = Math.min(strokeCount / expectedStrokes, 1) * 100
  const finalAccuracy = Math.max(accuracy, 50)
  const stars = finalAccuracy >= 80 ? 3 : finalAccuracy >= 50 ? 2 : 1

  attemptResults.value.push({ accuracy: finalAccuracy, stars })
  emit('attemptComplete', currentAttempt.value, finalAccuracy)

  if (currentAttempt.value < requiredCount.value) {
    currentAttempt.value++
    clearCanvas()
  } else {
    allCompleted.value = true
    const avgAccuracy = attemptResults.value.reduce((sum, r) => sum + r.accuracy, 0) / attemptResults.value.length
    emit('complete', avgAccuracy)
  }
}

function resetAll() {
  currentAttempt.value = 1
  attemptResults.value = []
  allCompleted.value = false
  clearCanvas()
}

watch(() => props.character, () => {
  nextTick(() => {
    resetAll()
  })
})

onMounted(() => {
  nextTick(() => {
    initCanvas()
  })
  window.addEventListener('resize', initCanvas)
})

onUnmounted(() => {
  window.removeEventListener('resize', initCanvas)
})
</script>

<template>
  <div class="writing-pad flex flex-col items-center">
    <div class="mb-3 flex items-center gap-2">
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
      <span class="text-xs text-gray-400 ml-1">
        第 {{ currentAttempt }}/{{ requiredCount }} 次
      </span>
    </div>

    <div
      class="relative rounded-2xl border-3 bg-white shadow-inner overflow-hidden"
      :style="{ width: canvasWidth + 'px', height: canvasHeight + 'px', borderColor: color + '40' }"
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

    <div class="mt-3 flex items-center gap-3">
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
        @click="submitAttempt"
      >
        {{ currentAttempt < requiredCount ? '✓ 写好了，下一遍' : '✓ 完成书写' }}
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

    <div v-if="attemptResults.length > 0" class="mt-3 flex items-center gap-4">
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
</template>

<style scoped>
.border-3 {
  border-width: 3px;
}
</style>
