<script setup lang="ts">
import { ref, computed } from 'vue'
import TopBar from '@/components/layout/TopBar.vue'
import { exploreData } from '@/data/exploreData'
import type { ExploreTopic } from '@/data/exploreData'
import { useUserStore } from '@/stores/userStore'
import { useContentStore } from '@/stores/contentStore'

const userStore = useUserStore()
const contentStore = useContentStore()

const allExploreData = computed(() => {
  return [...exploreData, ...contentStore.customContent.explore]
})

const categories = computed(() => {
  const cats = new Set<string>()
  const catNames = new Set<string>()
  for (const t of allExploreData.value) {
    cats.add(t.category)
    catNames.add(t.categoryName)
  }
  return [
    { key: 'all', label: '全部' },
    ...Array.from(catNames).map(name => {
      const item = allExploreData.value.find(t => t.categoryName === name)
      return { key: item?.category ?? name, label: name }
    }),
  ]
})

const activeCategory = ref('all')
const expandedTopic = ref<ExploreTopic | null>(null)
const readTopics = ref<Set<string>>(new Set())

const filteredTopics = computed(() => {
  if (activeCategory.value === 'all') return allExploreData.value
  return allExploreData.value.filter(t => t.category === activeCategory.value)
})

function setCategory(key: string) {
  activeCategory.value = key
}

function openTopic(topic: ExploreTopic) {
  expandedTopic.value = topic
  if (!readTopics.value.has(topic.id)) {
    readTopics.value.add(topic.id)
    userStore.addLearningRecord({
      module: 'explore',
      topic: topic.title,
      action: 'learn',
      score: null,
      starsEarned: 1,
      duration: 60,
    })
  }
}

function closeTopic() {
  expandedTopic.value = null
}
</script>

<template>
  <div class="explore-page min-h-screen pb-6" style="background-color: #F5F0FF">
    <TopBar title="探索天地 🌟" />

    <div class="px-4 pt-4">
      <div class="mb-4 flex gap-2 overflow-x-auto pb-1">
        <button
          v-for="cat in categories"
          :key="cat.key"
          class="shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition-all active:scale-[0.96]"
          :style="{
            backgroundColor: activeCategory === cat.key ? '#A55EEA' : '#EDE4F7',
            color: activeCategory === cat.key ? 'white' : '#A55EEA',
          }"
          @click="setCategory(cat.key)"
        >
          {{ cat.label }}
        </button>
      </div>

      <div class="space-y-4">
        <button
          v-for="topic in filteredTopics"
          :key="topic.id"
          class="w-full overflow-hidden rounded-2xl bg-white shadow-sm transition-all active:scale-[0.98]"
          @click="openTopic(topic)"
        >
          <div class="relative h-36 w-full overflow-hidden">
            <img
              :src="topic.imageUrl"
              :alt="topic.title"
              class="h-full w-full object-cover"
              loading="lazy"
            />
            <div
              class="absolute left-3 top-3 flex h-10 w-10 items-center justify-center rounded-xl text-xl"
              :style="{ backgroundColor: topic.color + 'CC' }"
            >
              {{ topic.icon }}
            </div>
            <div
              v-if="readTopics.has(topic.id)"
              class="absolute right-3 top-3 rounded-full bg-green-400 px-2 py-0.5 text-xs font-bold text-white"
            >
              ✓ 已学
            </div>
          </div>

          <div class="p-4 text-left">
            <div class="mb-1 flex items-center gap-2">
              <span
                class="rounded-full px-2 py-0.5 text-xs font-semibold text-white"
                :style="{ backgroundColor: topic.color }"
              >
                {{ topic.categoryName }}
              </span>
              <h3 class="text-lg font-bold text-gray-700">{{ topic.title }}</h3>
            </div>
            <p class="line-clamp-2 text-sm text-gray-400">{{ topic.content }}</p>
            <div class="mt-2 flex items-center gap-1 text-xs" style="color: #A55EEA">
              <span>💡</span>
              <span class="font-semibold">趣味小知识：</span>
              <span class="line-clamp-1 text-gray-400">{{ topic.funFact }}</span>
            </div>
          </div>
        </button>
      </div>

      <div v-if="filteredTopics.length === 0" class="py-12 text-center">
        <p class="text-4xl">🔍</p>
        <p class="mt-2 text-gray-400">暂无该分类的内容</p>
      </div>
    </div>

    <Teleport to="body">
      <Transition name="modal-fade">
        <div
          v-if="expandedTopic"
          class="fixed inset-0 z-[90] flex items-end justify-center"
          @click.self="closeTopic"
        >
          <div class="absolute inset-0 bg-black/40" @click="closeTopic" />
          <div
            class="relative z-10 max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white shadow-xl"
          >
            <div class="sticky top-0 z-10 flex items-center justify-between rounded-t-3xl bg-white px-5 pt-4 pb-2">
              <div class="flex items-center gap-2">
                <span class="text-2xl">{{ expandedTopic.icon }}</span>
                <h2 class="text-xl font-bold text-gray-700">{{ expandedTopic.title }}</h2>
              </div>
              <button
                class="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-gray-100"
                @click="closeTopic"
              >
                ✕
              </button>
            </div>

            <div class="px-5 pb-6">
              <div class="mb-4 overflow-hidden rounded-2xl">
                <img
                  :src="expandedTopic.imageUrl"
                  :alt="expandedTopic.title"
                  class="h-48 w-full object-cover"
                  loading="lazy"
                />
              </div>

              <span
                class="mb-3 inline-block rounded-full px-3 py-1 text-xs font-semibold text-white"
                :style="{ backgroundColor: expandedTopic.color }"
              >
                {{ expandedTopic.categoryName }}
              </span>

              <p class="mb-4 text-base leading-relaxed text-gray-600">
                {{ expandedTopic.content }}
              </p>

              <div class="rounded-2xl p-4" style="background-color: #F5F0FF">
                <div class="mb-2 flex items-center gap-2">
                  <span class="text-lg">💡</span>
                  <span class="font-bold" style="color: #A55EEA">趣味小知识</span>
                </div>
                <p class="text-sm leading-relaxed text-gray-500">
                  {{ expandedTopic.funFact }}
                </p>
              </div>

              <button
                class="mt-5 w-full rounded-2xl py-3 text-lg font-bold text-white transition-all active:scale-[0.97]"
                style="background-color: #A55EEA"
                @click="closeTopic"
              >
                我知道了 👍
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.modal-fade-enter-active {
  transition: all 0.3s ease-out;
}
.modal-fade-leave-active {
  transition: all 0.2s ease-in;
}
.modal-fade-enter-from {
  opacity: 0;
}
.modal-fade-leave-to {
  opacity: 0;
}
.modal-fade-enter-from .relative {
  transform: translateY(100%);
}
.modal-fade-leave-to .relative {
  transform: translateY(100%);
}
</style>
