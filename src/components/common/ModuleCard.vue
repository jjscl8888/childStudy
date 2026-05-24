<script setup lang="ts">
import { useRouter } from 'vue-router'
import ProgressBar from './ProgressBar.vue'

const props = defineProps<{
  title: string
  icon: string
  color: string
  progress: number
  to: string
}>()

const router = useRouter()

function navigate() {
  router.push(props.to)
}
</script>

<template>
  <button
    class="group flex w-full flex-col items-center gap-2 rounded-3xl p-5 shadow-md transition-all duration-200 hover:scale-105 hover:shadow-lg active:scale-[0.98]"
    :style="{ backgroundColor: color + '15' }"
    @click="navigate"
  >
    <div
      class="flex h-16 w-16 items-center justify-center rounded-2xl text-3xl transition-transform duration-200 group-hover:scale-110"
      :style="{ backgroundColor: color + '30' }"
    >
      {{ icon }}
    </div>

    <span class="text-base font-bold" :style="{ color }">{{ title }}</span>

    <div class="w-full px-1">
      <ProgressBar :current="progress" :total="100" :color="color" />
    </div>
  </button>
</template>
