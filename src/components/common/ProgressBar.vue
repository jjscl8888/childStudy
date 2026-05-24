<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    current: number
    total: number
    color?: string
  }>(),
  {
    color: '#FF9F43',
  },
)

const percentage = computed(() => {
  if (props.total === 0) return 0
  return Math.min(Math.round((props.current / props.total) * 100), 100)
})
</script>

<template>
  <div class="w-full">
    <div class="mb-1 flex items-center justify-between">
      <span class="text-sm font-semibold" :style="{ color }">{{ current }}/{{ total }}</span>
      <span class="text-xs font-medium text-gray-400">{{ percentage }}%</span>
    </div>
    <div class="h-4 w-full overflow-hidden rounded-full bg-gray-100">
      <div
        class="h-full rounded-full transition-all duration-500 ease-out"
        :style="{
          width: percentage + '%',
          backgroundColor: color,
        }"
      />
    </div>
  </div>
</template>
