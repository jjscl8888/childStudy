<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Star, CheckCircle, Volume2 } from 'lucide-vue-next'
import { useUserStore } from '@/stores/userStore'
import { useContentStore } from '@/stores/contentStore'
import { useTextToSpeech } from '@/composables/useTextToSpeech'
import { englishData } from '@/data/englishData'

const router = useRouter()
const userStore = useUserStore()
const contentStore = useContentStore()
const tts = useTextToSpeech('en-US', 0.7)

const activeCategory = ref('全部')

const categories = computed(() => {
  const cats = new Set<string>()
  for (const w of allEnglishData.value) {
    cats.add(w.categoryName)
  }
  return [
    { key: '全部', label: '全部' },
    ...Array.from(cats).map(c => ({ key: c, label: c })),
  ]
})

const allEnglishData = computed(() => {
  return [...englishData, ...contentStore.customContent.english]
})

const filteredWords = computed(() => {
  if (activeCategory.value === '全部') return allEnglishData.value
  return allEnglishData.value.filter((w) => w.categoryName === activeCategory.value)
})

const learnedIds = computed(() => {
  const records = (userStore as any).learningRecords as any[] | undefined
  if (!records) return new Set<string>()
  return new Set(
    records
      .filter((r: any) => r.module === 'english' && r.action === 'learn')
      .map((r: any) => r.topic),
  )
})

function isLearned(wordId: string): boolean {
  return learnedIds.value.has(wordId)
}

function goBack() {
  router.push('/')
}

function goToDetail(id: string) {
  router.push(`/english/${id}`)
}

function playWord(event: Event, word: string) {
  event.stopPropagation()
  tts.speak(word, { lang: 'en-US', rate: 0.7 })
}
</script>

<template>
  <div class="min-h-screen pb-6" style="background-color: #EBF5FF">
    <header
      class="sticky top-0 z-50 flex items-center justify-between px-4 py-3 shadow-md"
      style="background-color: #EBF5FF"
    >
      <button
        class="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-blue-100"
        @click="goBack"
      >
        <ArrowLeft class="h-6 w-6" style="color: #54A0FF" />
      </button>
      <h1 class="flex-1 text-center text-lg font-bold" style="color: #54A0FF">
        英语世界 🌍
      </h1>
      <div class="flex items-center gap-2">
        <div
          class="flex items-center gap-1 rounded-full px-3 py-1"
          style="background-color: #D6EAFF"
        >
          <Star class="h-5 w-5 fill-yellow-400 text-yellow-400" />
          <span class="text-sm font-bold text-yellow-600">{{ userStore.totalStars }}</span>
        </div>
      </div>
    </header>

    <div class="px-4 pt-3">
      <div class="mb-4 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <button
          v-for="cat in categories"
          :key="cat.key"
          class="shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200"
          :class="
            activeCategory === cat.key
              ? 'text-white shadow-md'
              : 'bg-white text-gray-500 hover:bg-blue-50'
          "
          :style="activeCategory === cat.key ? { backgroundColor: '#54A0FF' } : {}"
          @click="activeCategory = cat.key"
        >
          {{ cat.label }}
        </button>
      </div>

      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <button
          v-for="word in filteredWords"
          :key="word.id"
          class="relative flex flex-col items-center rounded-2xl bg-white p-3 shadow-sm transition-all duration-200 active:scale-[0.97] hover:shadow-md"
          @click="goToDetail(word.id)"
        >
          <div
            v-if="isLearned(word.id)"
            class="absolute right-2 top-2"
          >
            <CheckCircle class="h-5 w-5 fill-green-400 text-white" />
          </div>

          <div
            class="mb-2 flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl"
            style="background-color: #54A0FF15"
          >
            <span class="text-4xl">{{ word.emoji }}</span>
          </div>

          <span class="text-lg font-bold" style="color: #2E86DE">{{ word.word }}</span>
          <span class="text-xs text-gray-400">{{ word.phonetic }}</span>
          <div class="flex items-center gap-2 mt-1">
            <span class="text-sm font-medium text-gray-600">{{ word.chinese }}</span>
            <button
              class="flex h-6 w-6 items-center justify-center rounded-full transition-all active:scale-90"
              style="background-color: #54A0FF18"
              @click="playWord($event, word.word)"
            >
              <Volume2 class="h-3.5 w-3.5" style="color: #54A0FF" />
            </button>
          </div>
        </button>
      </div>

      <div
        v-if="filteredWords.length === 0"
        class="flex flex-col items-center py-16 text-gray-400"
      >
        <span class="text-5xl mb-3">🔍</span>
        <span class="text-base">暂无该分类的单词</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
