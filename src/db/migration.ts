import { getDatabase, persistDatabase } from './database'

const MIGRATION_KEY = 'funlearn_migrated_to_sqlite'

function isMigrated(): boolean {
  return localStorage.getItem(MIGRATION_KEY) === 'true'
}

function markMigrated() {
  localStorage.setItem(MIGRATION_KEY, 'true')
}

export async function migrateFromLocalStorage(): Promise<void> {
  if (isMigrated()) return

  const db = getDatabase()

  const usersData = localStorage.getItem('funlearn_users')
  if (usersData) {
    try {
      const users = JSON.parse(usersData)
      const stmt = db.prepare(
        'INSERT OR REPLACE INTO users (id, name, avatar, stars, level, streak, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
      for (const u of users) {
        stmt.run([u.id, u.name, u.avatar, u.stars, u.level, u.streak, u.createdAt])
      }
      stmt.free()
    } catch (e) {
      console.error('Failed to migrate users:', e)
    }
  }

  const currentUserId = localStorage.getItem('funlearn_current_user')
  if (currentUserId) {
    try {
      db.run('INSERT OR REPLACE INTO current_user (id, user_id) VALUES (1, ?)', [currentUserId])
    } catch (e) {
      console.error('Failed to migrate current_user:', e)
    }
  }

  const recordsData = localStorage.getItem('funlearn_records')
  if (recordsData) {
    try {
      const records = JSON.parse(recordsData)
      const stmt = db.prepare(
        'INSERT OR REPLACE INTO learning_records (id, module, topic, action, score, stars_earned, duration, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      )
      for (const r of records) {
        stmt.run([r.id, r.module, r.topic, r.action, r.score, r.starsEarned, r.duration, r.createdAt])
      }
      stmt.free()
    } catch (e) {
      console.error('Failed to migrate learning_records:', e)
    }
  }

  const achievementsData = localStorage.getItem('funlearn_achievements')
  if (achievementsData) {
    try {
      const achievements = JSON.parse(achievementsData)
      const stmt = db.prepare(
        'INSERT OR REPLACE INTO achievements (id, code, name, description, icon, category, unlocked, unlocked_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      )
      for (const a of achievements) {
        stmt.run([a.id, a.code, a.name, a.description, a.icon, a.category, a.unlocked ? 1 : 0, a.unlockedAt ?? null])
      }
      stmt.free()
    } catch (e) {
      console.error('Failed to migrate achievements:', e)
    }
  }

  const minutesData = localStorage.getItem('funlearn_today_minutes')
  if (minutesData) {
    try {
      const parsed = JSON.parse(minutesData)
      db.run('INSERT OR REPLACE INTO today_minutes (id, date, minutes) VALUES (1, ?, ?)', [parsed.date, parsed.minutes])
    } catch (e) {
      console.error('Failed to migrate today_minutes:', e)
    }
  }

  const customData = localStorage.getItem('funlearn_custom_content')
  if (customData) {
    try {
      const custom = JSON.parse(customData)
      const stmt = db.prepare(
        'INSERT OR REPLACE INTO custom_content (id, module, data) VALUES (?, ?, ?)'
      )
      for (const module of ['pinyin', 'chinese', 'english', 'explore']) {
        const items = custom[module] || []
        for (const item of items) {
          stmt.run([item.id, module, JSON.stringify(item)])
        }
      }
      stmt.free()
    } catch (e) {
      console.error('Failed to migrate custom_content:', e)
    }
  }

  const reviewData = localStorage.getItem('funlearn_review_items')
  if (reviewData) {
    try {
      const items = JSON.parse(reviewData)
      const stmt = db.prepare(
        'INSERT OR REPLACE INTO review_items (id, module_id, item_id, level, next_review, last_review, review_count, ease_factor, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      )
      for (const item of items) {
        stmt.run([
          item.id, item.moduleId, item.itemId, item.level,
          item.nextReview, item.lastReview, item.reviewCount,
          item.easeFactor, item.createdAt,
        ])
      }
      stmt.free()
    } catch (e) {
      console.error('Failed to migrate review_items:', e)
    }
  }

  const pathData = localStorage.getItem('funlearn_learning_path')
  if (pathData) {
    try {
      const parsed = JSON.parse(pathData)
      const nodes = parsed.pathNodes || []
      const stmt = db.prepare(
        'INSERT OR REPLACE INTO path_nodes (id, module_id, item_id, order_num, status, stars, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
      for (const node of nodes) {
        stmt.run([node.id, node.moduleId, node.itemId, node.order, node.status, node.stars, node.completedAt ?? null])
      }
      stmt.free()
    } catch (e) {
      console.error('Failed to migrate path_nodes:', e)
    }
  }

  const parentSettingsData = localStorage.getItem('funlearn_parent_settings')
  if (parentSettingsData) {
    try {
      const parsed = JSON.parse(parentSettingsData)
      db.run(
        'INSERT OR REPLACE INTO parent_settings (id, daily_time_limit, session_time_limit, enabled_modules, password) VALUES (1, ?, ?, ?, ?)',
        [
          parsed.dailyTimeLimit ?? 30,
          parsed.sessionTimeLimit ?? 10,
          JSON.stringify(parsed.enabledModules ?? {}),
          localStorage.getItem('funlearn_parent_password') || '123456',
        ]
      )
    } catch (e) {
      console.error('Failed to migrate parent_settings:', e)
    }
  }

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith('funlearn_purchased_')) {
      try {
        const userId = key.replace('funlearn_purchased_', '')
        const items: string[] = JSON.parse(localStorage.getItem(key) || '[]')
        const stmt = db.prepare('INSERT OR IGNORE INTO shop_purchases (user_id, item_id) VALUES (?, ?)')
        for (const itemId of items) {
          stmt.run([userId, itemId])
        }
        stmt.free()
      } catch (e) {
        console.error('Failed to migrate shop_purchases:', e)
      }
    }
  }

  await persistDatabase()
  markMigrated()
}
