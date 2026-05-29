<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick, computed } from 'vue'
import HanziWriter from 'hanzi-writer'
import { useSpeechQueue } from '@/composables/useSpeechQueue'

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
const strokeHint = ref('')
const strokeHintKey = ref(0)
const justCompletedStroke = ref(false)
const strokeNames = ref<string[]>([])

let writer: HanziWriter | null = null

const speech = useSpeechQueue('zh-CN', 0.8)

function classifySegmentDirection(dx: number, dy: number, isCompoundFirst: boolean = false): string {
  const length = Math.sqrt(dx * dx + dy * dy)
  if (length < 50) return '点'

  const deg = Math.atan2(dy, dx) * 180 / Math.PI

  const hMax = isCompoundFirst ? 35 : 20

  if (deg >= -20 && deg <= hMax) return '横'
  if (deg > hMax && deg < 70) return '提'
  if (deg >= 70 && deg <= 110) return '竖'
  if (deg > 110 && deg <= 160) return '撇'
  if (deg > 160 || deg < -160) return '横'
  if (deg >= -160 && deg <= -105) return '撇'
  if (deg > -105 && deg < -70) return '竖'
  if (deg >= -70 && deg <= -20) return '捺'

  return '横'
}

function classifyStroke(medians: [number, number][]): string {
  if (!medians || medians.length < 2) return '点'

  let totalLength = 0
  for (let i = 1; i < medians.length; i++) {
    const dx = medians[i][0] - medians[i - 1][0]
    const dy = medians[i][1] - medians[i - 1][1]
    totalLength += Math.sqrt(dx * dx + dy * dy)
  }

  if (totalLength < 200) return '点'

  const segBounds = [0]
  let cumDirChange = 0
  for (let i = 2; i < medians.length; i++) {
    const prevDx = medians[i - 1][0] - medians[i - 2][0]
    const prevDy = medians[i - 1][1] - medians[i - 2][1]
    const currDx = medians[i][0] - medians[i - 1][0]
    const currDy = medians[i][1] - medians[i - 1][1]
    const prevLen = Math.sqrt(prevDx * prevDx + prevDy * prevDy)
    const currLen = Math.sqrt(currDx * currDx + currDy * currDy)
    if (prevLen > 0 && currLen > 0) {
      const prevAngle = Math.atan2(prevDy, prevDx)
      const currAngle = Math.atan2(currDy, currDx)
      let diff = Math.abs(currAngle - prevAngle)
      if (diff > Math.PI) diff = 2 * Math.PI - diff
      cumDirChange += diff
      if (diff > Math.PI / 3 || cumDirChange > Math.PI / 3) {
        segBounds.push(i - 1)
        cumDirChange = 0
      }
    }
  }
  segBounds.push(medians.length - 1)

  const segments: { dx: number; dy: number; length: number }[] = []
  for (let i = 0; i < segBounds.length - 1; i++) {
    const start = segBounds[i]
    const end = segBounds[i + 1]
    const dx = medians[end][0] - medians[start][0]
    const dy = medians[end][1] - medians[start][1]
    const length = Math.sqrt(dx * dx + dy * dy)
    segments.push({ dx, dy, length })
  }

  let hasHook = false
  let hookSegCount = 0

  if (segments.length >= 2) {
    const lastSeg = segments[segments.length - 1]
    const prevSeg = segments[segments.length - 2]
    if (lastSeg.length > 0 && prevSeg.length > 0 && lastSeg.length < totalLength * 0.25) {
      const lastAngle = Math.atan2(lastSeg.dy, lastSeg.dx)
      const prevAngle = Math.atan2(prevSeg.dy, prevSeg.dx)
      let angleDiff = Math.abs(lastAngle - prevAngle)
      if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff
      if (angleDiff > Math.PI / 3) {
        hasHook = true
        hookSegCount = 1
      }
    }
  }

  if (!hasHook && segments.length >= 3) {
    const lastTwoDx = segments[segments.length - 1].dx + segments[segments.length - 2].dx
    const lastTwoDy = segments[segments.length - 1].dy + segments[segments.length - 2].dy
    const lastTwoLen = segments[segments.length - 1].length + segments[segments.length - 2].length
    const thirdLast = segments[segments.length - 3]
    if (lastTwoLen > 0 && lastTwoLen < totalLength * 0.25 && thirdLast.length > 0) {
      const lastTwoAngle = Math.atan2(lastTwoDy, lastTwoDx)
      const prevAngle = Math.atan2(thirdLast.dy, thirdLast.dx)
      let angleDiff = Math.abs(lastTwoAngle - prevAngle)
      if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff
      if (angleDiff > Math.PI / 3) {
        hasHook = true
        hookSegCount = 2
      }
    }
  }

  const segsForMerge = segments.slice(0, segments.length - hookSegCount)

  const minSegLen = totalLength * 0.18
  const mergedSegs: { dx: number; dy: number; length: number }[] = []
  for (const seg of segsForMerge) {
    if (mergedSegs.length === 0) {
      mergedSegs.push({ dx: seg.dx, dy: seg.dy, length: seg.length })
    } else if (seg.length < minSegLen) {
      const last = mergedSegs[mergedSegs.length - 1]
      last.dx += seg.dx
      last.dy += seg.dy
      last.length = Math.sqrt(last.dx * last.dx + last.dy * last.dy)
    } else if (mergedSegs[mergedSegs.length - 1].length < minSegLen) {
      const last = mergedSegs[mergedSegs.length - 1]
      last.dx += seg.dx
      last.dy += seg.dy
      last.length = Math.sqrt(last.dx * last.dx + last.dy * last.dy)
    } else {
      mergedSegs.push({ dx: seg.dx, dy: seg.dy, length: seg.length })
    }
  }

  if (mergedSegs.length === 1 && !hasHook) {
    return classifySegmentDirection(mergedSegs[0].dx, mergedSegs[0].dy)
  }

  const parts: string[] = []
  for (let i = 0; i < mergedSegs.length; i++) {
    const seg = mergedSegs[i]
    const isCompoundFirst = i === 0 && (mergedSegs.length > 1 || hasHook)
    const dir = classifySegmentDirection(seg.dx, seg.dy, isCompoundFirst)
    if (i === 0) {
      parts.push(dir)
    } else {
      if (dir === '点') {
        parts.push(dir)
      } else if (dir === '撇') {
        const deg = Math.atan2(seg.dy, seg.dx) * 180 / Math.PI
        if (deg < -120) {
          parts.push('撇')
        } else {
          parts.push('折')
        }
      } else {
        parts.push('折')
      }
    }
  }

  if (hasHook) {
    parts.push('钩')
  }

  return parts.join('') || '折'
}

function getStrokeName(idx: number): string {
  return strokeNames.value[idx] || `${idx + 1}`
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function setHint(text: string) {
  strokeHint.value = text
  strokeHintKey.value++
  justCompletedStroke.value = true
  setTimeout(() => { justCompletedStroke.value = false }, 800)
}

function speakHint(text: string) {
  setHint(text)
  speech.speak(text)
}

function getPhaseLabel() {
  if (phase.value === 'demo') return '👀 先看笔画顺序'
  return `✍️ 第 ${currentAttempt.value}/${requiredCount.value} 次练习`
}

function getAttemptLabels() {
  return Array.from({ length: requiredCount.value }, (_, i) => ({
    index: i + 1,
    completed: i < attemptResults.value.length,
    current: i === currentAttempt.value - 1 && !allCompleted.value,
  }))
}

function createWriter(quizMode: boolean = false) {
  if (!targetRef.value) return

  targetRef.value.innerHTML = ''
  writerReady.value = false
  loadError.value = false
  writer = null
  strokeNames.value = []

  writer = HanziWriter.create(targetRef.value, props.character, {
    width: size.value,
    height: size.value,
    padding: 5,
    showOutline: true,
    strokeAnimationSpeed: 1,
    delayBetweenStrokes: 300,
    strokeColor: quizMode ? hexToRgba(color.value, 0.18) : color.value,
    outlineColor: quizMode ? hexToRgba(color.value, 0.12) : hexToRgba(color.value, 0.19),
    drawingColor: '#333333',
    drawingWidth: 6,
    highlightColor: color.value,
    radicalColor: hexToRgba(color.value, 0.50),
    showHintAfterMisses: quizMode ? 2 : undefined,
    showCharacter: true,
    onLoadCharDataSuccess: function (data: any) {
      totalStrokes.value = data.strokes.length
      if (data.medians) {
        for (let i = 0; i < data.medians.length; i++) {
          strokeNames.value.push(classifyStroke(data.medians[i]))
        }
      }
      writerReady.value = true
      if (quizMode) {
        speech.speak(`请沿着浅色笔画描摹！第1笔是${getStrokeName(0)}！`)
      }
    },
    onLoadCharDataError: function () {
      loadError.value = true
      totalStrokes.value = Math.max(props.character.length * 2, 3)
    },
  })
}

function playDemo() {
  if (!writer || !writerReady.value) return
  speech.stop()
  isAnimating.value = true
  currentStrokeNum.value = 0
  writer.hideCharacter()

  speech.speakNow(`"${props.character}"字，一共${totalStrokes.value}笔，请仔细看每一笔的顺序！`)

  let strokeIndex = 0
  const originalOnComplete = () => {
    isAnimating.value = false
    demoPlayed.value = true
    speech.speak(`演示结束，你看清楚了吗？点击"开始练习"来试一试吧！`)
  }

  writer.animateCharacter({
    onComplete: originalOnComplete,
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

function doStartQuiz() {
  if (!writer) return
  currentStrokeNum.value = 0
  strokeMistakes.value = 0
  isQuizzing.value = true
  justCompletedStroke.value = false

  writer.quiz({
    onMistake: function (strokeData: any) {
      strokeMistakes.value++
      currentStrokeNum.value = strokeData.strokeNum
      speakHint(`不对哦，再试一次！这是第${strokeData.strokeNum + 1}笔，${getStrokeName(strokeData.strokeNum)}！`)
    },
    onCorrectStroke: function (strokeData: any) {
      currentStrokeNum.value = strokeData.strokeNum + 1

      if (strokeData.strokeNum === totalStrokes.value - 1) {
        speech.speak('太棒了！这个字写完啦！')
        speech.speak(`${props.character}，写得真漂亮！`)
      } else {
        const nextIdx = strokeData.strokeNum + 1
        const name = getStrokeName(nextIdx)
        speech.speak(`第${strokeData.strokeNum + 1}笔写得好！接着写第${nextIdx + 1}笔，${name}！`)
      }
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
  speech.stop()
  phase.value = 'demo'
  isQuizzing.value = false
  writer?.cancelQuiz?.()
  nextTick(() => {
    createWriter(false)
  })
}

function resetAll() {
  speech.stop()
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
  nextTick(() => { resetAll() })
})

onMounted(() => {
  nextTick(() => { createWriter(false) })
})

onUnmounted(() => {
  writer = null
  speech.stop()
})
</script>

<template>
  <div class="hanzi-stroke-writer flex flex-col items-center gap-4">
    <div class="text-center">
      <span class="text-sm font-bold" :style="{ color }">
        {{ getPhaseLabel() }}
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
          v-for="label in getAttemptLabels()"
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

      <div v-if="isQuizzing" class="w-full max-w-[280px] flex flex-col items-center gap-3 rounded-2xl p-4" :style="{ backgroundColor: color + '12' }">
        <div class="flex items-center justify-between w-full mb-1">
          <span class="text-xs font-bold" :style="{ color }">
            进度：{{ Math.min(currentStrokeNum, totalStrokes) }} / {{ totalStrokes }} 笔
          </span>
          <div class="h-2 w-20 rounded-full bg-gray-200 overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-300"
              :style="{
                width: (Math.min(currentStrokeNum, totalStrokes) / totalStrokes) * 100 + '%',
                backgroundColor: color,
              }"
            />
          </div>
        </div>

        <div class="flex items-center justify-center gap-1.5 my-1">
          <div
            v-for="i in totalStrokes"
            :key="i"
            class="w-3 h-3 rounded-full transition-all duration-300 border"
            :style="{
              backgroundColor: i <= currentStrokeNum ? color : 'transparent',
              borderColor: i === currentStrokeNum + 1 ? color : (i < currentStrokeNum ? color : '#D1D5DB'),
              transform: i === currentStrokeNum + 1 ? 'scale(1.4)' : 'scale(1)',
              borderWidth: i <= currentStrokeNum ? 0 : 1.5,
            }"
          />
        </div>

        <Transition name="hint-pop" mode="out-in">
          <div
            :key="strokeHintKey"
            class="text-center text-sm font-bold px-4 py-2 rounded-xl transition-colors duration-300"
            :class="justCompletedStroke ? 'bg-green-100 text-green-600' : 'bg-orange-50 text-orange-500'"
          >
            {{ strokeHint }}
          </div>
        </Transition>

        <div class="flex items-center gap-1 text-[11px] text-gray-400 mt-1">
          <span>💡</span>
          <span>沿着浅色笔画描摹，写错2次会自动提示</span>
        </div>
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
.hint-pop-enter-active {
  animation: hintPopIn 0.35s ease-out;
}
.hint-pop-leave-active {
  animation: hintPopOut 0.25s ease-in;
}
@keyframes hintPopIn {
  from {
    opacity: 0;
    transform: translateY(-8px) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
@keyframes hintPopOut {
  from {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateY(-8px) scale(0.95);
  }
}
</style>
