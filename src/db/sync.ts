import { query, run } from './database'
import { useAuthStore } from '@/stores/authStore'

function getApiBase(): string {
  return import.meta.env.VITE_API_BASE_URL || ''
}

interface SyncData {
  learningRecords: any[]
  achievements: any[]
  reviewItems: any[]
  pathNodes: any[]
  voiceSettings: any | null
}

export async function uploadToCloud(): Promise<boolean> {
  const authStore = useAuthStore()
  if (!authStore.isLoggedIn) return false

  try {
    const learningRecords = query('SELECT module, topic, action, score, stars_earned as starsEarned, duration, created_at as createdAt FROM learning_records WHERE user_id = ?', [authStore.currentUser?.id])
    const achievements = query('SELECT code, name, description, icon, category, unlocked, unlocked_at as unlockedAt FROM achievements WHERE user_id = ?', [authStore.currentUser?.id])
    const reviewItems = query('SELECT module_id as moduleId, item_id as itemId, level, next_review as nextReview, last_review as lastReview, review_count as reviewCount, ease_factor as easeFactor, created_at as createdAt FROM review_items WHERE user_id = ?', [authStore.currentUser?.id])
    const pathNodes = query('SELECT module_id as moduleId, item_id as itemId, order_num as "order", status, stars, completed_at as completedAt FROM path_nodes WHERE user_id = ? ORDER BY module_id, order_num', [authStore.currentUser?.id])
    const voiceSettingsRow = query('SELECT rate, pitch, gender, tone, engine, role, edge_tts_voice as edgeTtsVoice, edge_tts_rate as edgeTtsRate, edge_tts_pitch as edgeTtsPitch, edge_tts_volume as edgeTtsVolume, edge_tts_locale_filter as edgeTtsLocaleFilter, edge_tts_gender_filter as edgeTtsGenderFilter FROM voice_settings WHERE id = 1')

    const apiBase = getApiBase()
    const response = await fetch(`${apiBase}/api/sync/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authStore.getAuthHeaders(),
      },
      body: JSON.stringify({
        learningRecords,
        achievements,
        reviewItems,
        pathNodes,
        voiceSettings: voiceSettingsRow[0] || null,
      }),
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({ error: 'Upload failed' }))
      throw new Error(data.error || 'Upload failed')
    }

    return true
  } catch (error) {
    console.error('Cloud sync upload failed:', error)
    return false
  }
}

export async function downloadFromCloud(): Promise<boolean> {
  const authStore = useAuthStore()
  if (!authStore.isLoggedIn) return false

  try {
    const apiBase = getApiBase()
    const response = await fetch(`${apiBase}/api/sync/download`, {
      headers: authStore.getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error('Download failed')
    }

    const { data } = await response.json()
    await mergeCloudData(data)
    return true
  } catch (error) {
    console.error('Cloud sync download failed:', error)
    return false
  }
}

async function mergeCloudData(data: SyncData): Promise<void> {
  const authStore = useAuthStore()
  const userId = authStore.currentUser?.id || ''

  if (data.learningRecords && data.learningRecords.length > 0) {
    for (const record of data.learningRecords) {
      const existing = query('SELECT id FROM learning_records WHERE user_id = ? AND module = ? AND topic = ? AND action = ? AND created_at = ?',
        [userId, record.module, record.topic, record.action, record.createdAt])
      if (existing.length === 0) {
        run(
          'INSERT INTO learning_records (id, user_id, module, topic, action, score, stars_earned, duration, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [Date.now().toString() + Math.random().toString(36).slice(2), userId, record.module, record.topic, record.action, record.score, record.starsEarned, record.duration, record.createdAt]
        )
      }
    }
  }

  if (data.achievements && data.achievements.length > 0) {
    for (const ach of data.achievements) {
      const existing = query('SELECT id, unlocked FROM achievements WHERE user_id = ? AND code = ?', [userId, ach.code])
      if (existing.length === 0) {
        run(
          'INSERT INTO achievements (id, user_id, code, name, description, icon, category, unlocked, unlocked_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [Date.now().toString() + Math.random().toString(36).slice(2), userId, ach.code, ach.name, ach.description, ach.icon, ach.category, ach.unlocked ? 1 : 0, ach.unlockedAt || null]
        )
      } else if (ach.unlocked && !existing[0].unlocked) {
        run('UPDATE achievements SET unlocked = 1, unlocked_at = ? WHERE user_id = ? AND code = ?', [ach.unlockedAt || new Date().toISOString(), userId, ach.code])
      }
    }
  }

  if (data.reviewItems && data.reviewItems.length > 0) {
    for (const item of data.reviewItems) {
      const existing = query('SELECT id FROM review_items WHERE user_id = ? AND module_id = ? AND item_id = ?', [userId, item.moduleId, item.itemId])
      if (existing.length === 0) {
        run(
          'INSERT INTO review_items (id, user_id, module_id, item_id, level, next_review, last_review, review_count, ease_factor, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [Date.now().toString() + Math.random().toString(36).slice(2), userId, item.moduleId, item.itemId, item.level, item.nextReview, item.lastReview, item.reviewCount, item.easeFactor, item.createdAt]
        )
      } else {
        run(
          'UPDATE review_items SET level = ?, next_review = ?, last_review = ?, review_count = ?, ease_factor = ? WHERE user_id = ? AND module_id = ? AND item_id = ?',
          [item.level, item.nextReview, item.lastReview, item.reviewCount, item.easeFactor, userId, item.moduleId, item.itemId]
        )
      }
    }
  }

  if (data.pathNodes && data.pathNodes.length > 0) {
    for (const node of data.pathNodes) {
      const existing = query('SELECT id FROM path_nodes WHERE user_id = ? AND module_id = ? AND item_id = ?', [userId, node.moduleId, node.itemId])
      if (existing.length === 0) {
        run(
          'INSERT INTO path_nodes (id, user_id, module_id, item_id, order_num, status, stars, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [Date.now().toString() + Math.random().toString(36).slice(2), userId, node.moduleId, node.itemId, node.order, node.status, node.stars, node.completedAt || null]
        )
      } else {
        if (node.status === 'completed') {
          run('UPDATE path_nodes SET status = ?, stars = ?, completed_at = ? WHERE user_id = ? AND module_id = ? AND item_id = ?',
            [node.status, node.stars, node.completedAt, userId, node.moduleId, node.itemId])
        }
      }
    }
  }

  if (data.voiceSettings) {
    const vs = data.voiceSettings
    run(
      `INSERT OR REPLACE INTO voice_settings (id, user_id, rate, pitch, gender, tone, engine, role, edge_tts_voice, edge_tts_rate, edge_tts_pitch, edge_tts_volume, edge_tts_locale_filter, edge_tts_gender_filter)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, vs.rate, vs.pitch, vs.gender, vs.tone, vs.engine, vs.role, vs.edgeTtsVoice, vs.edgeTtsRate, vs.edgeTtsPitch, vs.edgeTtsVolume, vs.edgeTtsLocaleFilter, vs.edgeTtsGenderFilter]
    )
  }
}
