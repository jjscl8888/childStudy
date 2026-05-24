<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  text: string
  correct: boolean
  selected: boolean
  revealed: boolean
}>()

const emit = defineEmits<{
  select: []
}>()

const letterIndex = computed(() => {
  const idx = parseInt(props.text.charAt(0)) || 0
  return idx
})

const letter = computed(() => {
  const letters = ['A', 'B', 'C', 'D']
  return letters[letterIndex.value] || 'A'
})

const bgClass = computed(() => {
  if (props.revealed && props.correct) return 'bg-[#2ED573] text-white border-[#2ED573]'
  if (props.revealed && props.selected && !props.correct) return 'bg-[#FF6B6B] text-white border-[#FF6B6B]'
  if (props.selected) return 'bg-[#FF9F43] text-white border-[#FF9F43]'
  return 'bg-white text-gray-700 border-gray-200 hover:border-[#FF9F43] hover:bg-orange-50'
})
</script>

<template>
  <button
    class="flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-3.5 text-left text-lg font-semibold transition-all duration-200 active:scale-[0.97]"
    :class="bgClass"
    :disabled="revealed"
    @click="emit('select')"
  >
    <span
      class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base font-bold"
      :class="
        revealed && correct
          ? 'bg-white/30'
          : revealed && selected && !correct
            ? 'bg-white/30'
            : selected
              ? 'bg-white/30'
              : 'bg-orange-100 text-[#FF9F43]'
      "
    >
      {{ letter }}
    </span>
    <span>{{ text }}</span>
  </button>
</template>
