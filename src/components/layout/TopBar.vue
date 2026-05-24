<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ArrowLeft, Star } from 'lucide-vue-next'
import { useUserStore } from '@/stores/userStore'

defineProps<{
  title: string
}>()

const router = useRouter()
const userStore = useUserStore()

function goBack() {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/')
  }
}
</script>

<template>
  <header
    class="sticky top-0 z-50 flex items-center justify-between px-4 py-3 shadow-md"
    style="background-color: #FFF9E6"
  >
    <button
      class="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-orange-100"
      @click="goBack"
    >
      <ArrowLeft class="h-6 w-6" style="color: #FF9F43" />
    </button>

    <h1 class="flex-1 text-center text-lg font-bold" style="color: #FF9F43">
      {{ title }}
    </h1>

    <div class="flex items-center gap-3">
      <div class="flex items-center gap-1 rounded-full px-3 py-1" style="background-color: #FFF3D6">
        <Star class="h-5 w-5 fill-yellow-400 text-yellow-400" />
        <span class="text-sm font-bold text-yellow-600">{{ userStore.totalStars }}</span>
      </div>

      <div
        class="flex h-9 w-9 items-center justify-center rounded-full border-2 text-xl"
        style="border-color: #FF9F43; background-color: #FFF3D6"
      >
        {{ userStore.currentUser?.avatar ?? '?' }}
      </div>
    </div>
  </header>
</template>
