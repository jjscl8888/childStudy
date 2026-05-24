<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'

const props = defineProps<{
  character: string
  type: 'chinese' | 'pinyin' | 'english'
  color?: string
  size?: number
}>()

const emit = defineEmits<{
  (e: 'complete'): void
}>()

const currentStroke = ref(0)
const isPlaying = ref(false)
const isPaused = ref(false)
const hasPlayed = ref(false)

const color = computed(() => props.color || (props.type === 'chinese' ? '#2ED573' : '#FF9F43'))
const size = computed(() => props.size || 200)

const totalStrokes = computed(() => {
  if (props.type === 'chinese') {
    return Math.max(props.character.length * 2, 3)
  }
  return props.character.length
})

const strokeLabel = computed(() => {
  if (props.type === 'chinese') {
    return `第 ${currentStroke.value + 1} 笔`
  }
  return `第 ${currentStroke.value + 1} 笔 / 共 ${totalStrokes.value} 笔`
})

let timerId: ReturnType<typeof setTimeout> | null = null

function play() {
  if (isPlaying.value) {
    pause()
    return
  }

  isPlaying.value = true
  isPaused.value = false
  currentStroke.value = 0
  advanceStroke()
}

function pause() {
  isPlaying.value = false
  isPaused.value = true
  if (timerId) {
    clearTimeout(timerId)
    timerId = null
  }
}

function advanceStroke() {
  if (!isPlaying.value) return

  if (currentStroke.value >= totalStrokes.value) {
    isPlaying.value = false
    hasPlayed.value = true
    emit('complete')
    return
  }

  currentStroke.value++
  timerId = setTimeout(() => {
    advanceStroke()
  }, 800)
}

function replay() {
  currentStroke.value = 0
  hasPlayed.value = false
  isPlaying.value = false
  isPaused.value = false
  if (timerId) {
    clearTimeout(timerId)
    timerId = null
  }
  setTimeout(() => play(), 200)
}

function getVisibleText(): string {
  if (props.type === 'chinese') {
    return props.character
  }
  return props.character.substring(0, currentStroke.value)
}

onUnmounted(() => {
  if (timerId) {
    clearTimeout(timerId)
  }
})
</script>

<template>
  <div class="stroke-demo flex flex-col items-center gap-3">
    <div class="text-center mb-1">
      <span class="text-sm font-bold" :style="{ color }">
        {{ isPlaying ? '👀 看仔细，跟着写！' : hasPlayed ? '✅ 演示完成，开始写吧！' : '👇 点击"看演示"学写字' }}
      </span>
    </div>

    <div
      class="relative rounded-2xl border-3 bg-white shadow-inner overflow-hidden"
      :style="{ width: size + 'px', height: size + 'px', borderColor: color + '40' }"
    >
      <svg
        v-if="type === 'chinese'"
        class="absolute inset-0 w-full h-full"
        :viewBox="`0 0 ${size} ${size}`"
      >
        <line :x1="size / 2" y1="0" :x2="size / 2" :y2="size" :stroke="color" stroke-width="0.5" stroke-dasharray="4,4" opacity="0.3" />
        <line x1="0" :y1="size / 2" :x2="size" :y2="size / 2" :stroke="color" stroke-width="0.5" stroke-dasharray="4,4" opacity="0.3" />
        <line x1="0" y1="0" :x2="size" :y2="size" :stroke="color" stroke-width="0.5" stroke-dasharray="4,4" opacity="0.15" />
        <line :x1="size" y1="0" :x2="0" :y2="size" :stroke="color" stroke-width="0.5" stroke-dasharray="4,4" opacity="0.15" />
      </svg>

      <svg
        v-else
        class="absolute inset-0 w-full h-full"
        :viewBox="`0 0 ${size} ${size}`"
      >
        <line x1="0" :y1="size * 0.75" :x2="size" :y2="size * 0.75" :stroke="color" stroke-width="1.5" opacity="0.5" />
        <line x1="0" :y1="size * 0.5" :x2="size" :y2="size * 0.5" :stroke="color" stroke-width="0.5" stroke-dasharray="4,4" opacity="0.3" />
        <line x1="0" :y1="size * 0.25" :x2="size" :y2="size * 0.25" :stroke="color" stroke-width="0.5" stroke-dasharray="4,4" opacity="0.2" />
      </svg>

      <div class="absolute inset-0 flex items-center justify-center">
        <span
          v-if="type === 'chinese'"
          class="font-bold transition-all duration-500"
          :style="{
            fontSize: size * 0.65 + 'px',
            color: color,
            opacity: isPlaying ? 0.9 : 0.3,
            clipPath: isPlaying || hasPlayed
              ? `inset(0 0 ${Math.max(0, 100 - (currentStroke / totalStrokes) * 100)}% 0)`
              : 'inset(0 0 0 0)',
          }"
        >
          {{ character }}
        </span>

        <span
          v-else
          class="font-bold transition-all duration-300"
          :style="{
            fontSize: size * 0.45 + 'px',
            color: color,
            opacity: isPlaying ? 0.9 : 0.3,
            lineHeight: size * 0.75 + 'px',
          }"
        >
          {{ isPlaying || hasPlayed ? getVisibleText() : character }}
        </span>
      </div>

      <div
        v-if="isPlaying"
        class="absolute left-0 right-0 h-1 transition-all duration-700"
        :style="{
          bottom: (currentStroke / totalStrokes) * 100 + '%',
          backgroundColor: color,
          opacity: 0.6,
        }"
      />
    </div>

    <div class="flex items-center gap-3">
      <button
        class="flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-bold transition-all active:scale-95"
        :style="{ backgroundColor: color + '18', color }"
        @click="play"
      >
        {{ isPlaying ? '⏸ 暂停' : hasPlayed ? '🔄 再看一遍' : '▶️ 看演示' }}
      </button>

      <span v-if="isPlaying" class="text-xs font-bold" :style="{ color }">
        {{ strokeLabel }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.border-3 {
  border-width: 3px;
}
</style>
