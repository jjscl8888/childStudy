import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface ReviewItem {
  id: string
  moduleId: string
  itemId: string
  level: number
  nextReview: number
  lastReview: number | null
  reviewCount: number
  easeFactor: number
  createdAt: number
}

const STORAGE_KEY = 'funlearn_review_items'

const INTERVALS = [1, 2, 4, 7, 15, 30]

export const useSpacedRepetitionStore = defineStore('spacedRepetition', () => {
  const reviewItems = ref<ReviewItem[]>([])

  const todayReviews = computed(() => {
    const now = Date.now()
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    return reviewItems.value.filter(item => item.nextReview <= todayEnd.getTime() && item.nextReview <= now + 86400000)
  })

  const overdueReviews = computed(() => {
    const now = Date.now()
    return reviewItems.value.filter(item => item.nextReview <= now)
  })

  const reviewCount = computed(() => overdueReviews.value.length)

  function loadFromStorage() {
    const data = localStorage.getItem(STORAGE_KEY)
    if (data) {
      try {
        reviewItems.value = JSON.parse(data)
      } catch {
        reviewItems.value = []
      }
    }
  }

  function saveToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reviewItems.value))
  }

  function addReviewItem(moduleId: string, itemId: string) {
    const existing = reviewItems.value.find(
      r => r.moduleId === moduleId && r.itemId === itemId
    )
    if (existing) return

    const now = Date.now()
    const nextReview = new Date(now)
    nextReview.setDate(nextReview.getDate() + INTERVALS[0])

    reviewItems.value.push({
      id: `${moduleId}-${itemId}`,
      moduleId,
      itemId,
      level: 0,
      nextReview: nextReview.getTime(),
      lastReview: null,
      reviewCount: 0,
      easeFactor: 2.5,
      createdAt: now,
    })
    saveToStorage()
  }

  function processReview(moduleId: string, itemId: string, quality: 'easy' | 'good' | 'hard') {
    const item = reviewItems.value.find(
      r => r.moduleId === moduleId && r.itemId === itemId
    )
    if (!item) return

    const now = Date.now()
    item.lastReview = now
    item.reviewCount++

    if (quality === 'easy') {
      item.level = Math.min(item.level + 1, INTERVALS.length - 1)
      item.easeFactor = Math.min(item.easeFactor + 0.15, 3.0)
    } else if (quality === 'good') {
      // level stays the same, but interval progresses
    } else {
      item.level = Math.max(item.level - 1, 0)
      item.easeFactor = Math.max(item.easeFactor - 0.2, 1.3)
    }

    const intervalDays = quality === 'hard' ? 1 : INTERVALS[item.level]
    const adjustedDays = Math.round(intervalDays * (item.easeFactor / 2.5))
    const nextReview = new Date(now)
    nextReview.setDate(nextReview.getDate() + Math.max(adjustedDays, 1))
    item.nextReview = nextReview.getTime()

    saveToStorage()
  }

  function getReviewItem(moduleId: string, itemId: string): ReviewItem | undefined {
    return reviewItems.value.find(r => r.moduleId === moduleId && r.itemId === itemId)
  }

  function isDueForReview(moduleId: string, itemId: string): boolean {
    const item = getReviewItem(moduleId, itemId)
    if (!item) return false
    return item.nextReview <= Date.now()
  }

  function getModuleReviews(moduleId: string): ReviewItem[] {
    return reviewItems.value.filter(r => r.moduleId === moduleId)
  }

  function removeReviewItem(moduleId: string, itemId: string) {
    const index = reviewItems.value.findIndex(
      r => r.moduleId === moduleId && r.itemId === itemId
    )
    if (index !== -1) {
      reviewItems.value.splice(index, 1)
      saveToStorage()
    }
  }

  loadFromStorage()

  return {
    reviewItems,
    todayReviews,
    overdueReviews,
    reviewCount,
    addReviewItem,
    processReview,
    getReviewItem,
    isDueForReview,
    getModuleReviews,
    removeReviewItem,
    saveToStorage,
  }
})
