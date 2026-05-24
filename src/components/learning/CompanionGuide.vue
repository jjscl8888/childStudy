<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  message: string
  emotion?: 'happy' | 'encourage' | 'think' | 'celebrate'
  show?: boolean
}>()

const visible = ref(false)
const animating = ref(false)

const emotionEmojis: Record<string, string> = {
  happy: '🐵',
  encourage: '💪',
  think: '🤔',
  celebrate: '🎉',
}

const emotionBubbles: Record<string, string[]> = {
  happy: ['太棒了！', '继续加油！', '你真聪明！'],
  encourage: ['再试一次！', '别灰心！', '你可以的！'],
  think: ['想一想...', '仔细看看...', '别着急~'],
  celebrate: ['太厉害了！', '完美！', '满分！🌟'],
}

watch(() => props.message, (val) => {
  if (val) {
    visible.value = true
    animating.value = true
    setTimeout(() => {
      animating.value = false
    }, 600)
  }
})

watch(() => props.show, (val) => {
  if (val !== undefined) {
    visible.value = val
  }
}, { immediate: true })
</script>

<template>
  <Transition name="companion">
    <div
      v-if="visible && message"
      class="companion-bubble flex items-start gap-3 rounded-2xl p-4 shadow-lg"
      :class="{ 'animate-bounce-subtle': animating }"
    >
      <div class="companion-avatar flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-2xl"
        :style="{ backgroundColor: emotion === 'celebrate' ? '#FFD70022' : '#FF9F4322' }"
      >
        {{ emotionEmojis[emotion || 'happy'] }}
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-base font-bold text-gray-700 leading-relaxed">{{ message }}</p>
        <div v-if="emotion && emotionBubbles[emotion]" class="mt-1 flex gap-1 flex-wrap">
          <span
            v-for="(bubble, idx) in emotionBubbles[emotion].slice(0, 2)"
            :key="idx"
            class="text-xs px-2 py-0.5 rounded-full"
            :style="{ backgroundColor: '#FF9F4315', color: '#FF9F43' }"
          >
            {{ bubble }}
          </span>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.companion-bubble {
  background: linear-gradient(135deg, #FFFBF0, #FFF5E0);
  border: 2px solid #FF9F4330;
}

.companion-enter-active {
  animation: companionIn 0.4s ease-out;
}
.companion-leave-active {
  animation: companionOut 0.3s ease-in;
}
@keyframes companionIn {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
@keyframes companionOut {
  from {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateY(-10px) scale(0.95);
  }
}

.animate-bounce-subtle {
  animation: bounceSubtle 0.6s ease-out;
}
@keyframes bounceSubtle {
  0% { transform: translateY(0); }
  30% { transform: translateY(-8px); }
  60% { transform: translateY(2px); }
  100% { transform: translateY(0); }
}
</style>
