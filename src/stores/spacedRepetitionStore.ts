import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useUserStore } from './userStore'
import { query, run } from '@/db/database'

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

interface ReviewRow {
  id: string
  module_id: string
  item_id: string
  level: number
  next_review: number
  last_review: number | null
  review_count: number
  ease_factor: number
  created_at: number
}

function rowToReviewItem(row: ReviewRow): ReviewItem {
  return {
    id: row.id,
    moduleId: row.module_id,
    itemId: row.item_id,
    level: row.level,
    nextReview: row.next_review,
    lastReview: row.last_review,
    reviewCount: row.review_count,
    easeFactor: row.ease_factor,
    createdAt: row.created_at,
  }
}

const INTERVALS = [1, 2, 4, 7, 15, 30]

export const useSpacedRepetitionStore = defineStore('spacedRepetition', () => {
  const userStore = useUserStore()

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
    if (!userStore.currentUser) {
      reviewItems.value = []
      return
    }

    const rows = query<ReviewRow>(
      'SELECT * FROM review_items WHERE user_id = ?',
      [userStore.currentUser.id]
    )
    reviewItems.value = rows.map(rowToReviewItem)
  }

  function addReviewItem(moduleId: string, itemId: string) {
    if (!userStore.currentUser) return
    const userId = userStore.currentUser.id

    const existing = reviewItems.value.find(
      r => r.moduleId === moduleId && r.itemId === itemId
    )
    if (existing) return

    const now = Date.now()
    const nextReview = new Date(now)
    nextReview.setDate(nextReview.getDate() + INTERVALS[0])

    const item: ReviewItem = {
      id: `${userId}-${moduleId}-${itemId}`,
      moduleId,
      itemId,
      level: 0,
      nextReview: nextReview.getTime(),
      lastReview: null,
      reviewCount: 0,
      easeFactor: 2.5,
      createdAt: now,
    }

    reviewItems.value.push(item)
    run(
      'INSERT INTO review_items (id, user_id, module_id, item_id, level, next_review, last_review, review_count, ease_factor, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [item.id, userId, item.moduleId, item.itemId, item.level, item.nextReview, item.lastReview, item.reviewCount, item.easeFactor, item.createdAt]
    )
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

    run(
      'UPDATE review_items SET level=?, next_review=?, last_review=?, review_count=?, ease_factor=? WHERE id=?',
      [item.level, item.nextReview, item.lastReview, item.reviewCount, item.easeFactor, item.id]
    )
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
      const id = reviewItems.value[index].id
      reviewItems.value.splice(index, 1)
      run('DELETE FROM review_items WHERE id = ?', [id])
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
    saveToStorage: loadFromStorage,
  }
})
