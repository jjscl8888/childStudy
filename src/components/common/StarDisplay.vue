<script setup lang="ts">
import { ref, watch } from 'vue'
import { Star } from 'lucide-vue-next'

const props = defineProps<{
  count: number
}>()

const bouncing = ref(false)

watch(
  () => props.count,
  () => {
    bouncing.value = true
    setTimeout(() => {
      bouncing.value = false
    }, 400)
  },
)
</script>

<template>
  <div class="inline-flex items-center gap-1.5">
    <Star
      class="h-6 w-6 fill-yellow-400 text-yellow-400 transition-transform"
      :class="bouncing ? 'animate-bounce' : ''"
    />
    <span
      class="text-lg font-bold text-yellow-600 transition-transform"
      :class="bouncing ? 'animate-bounce' : ''"
    >
      {{ count }}
    </span>
  </div>
</template>
