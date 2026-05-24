import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { query, queryOne, run, getDatabase, schedulePersist } from '@/db/database'

export interface UserProfile {
  id: string
  name: string
  avatar: string
  stars: number
  level: number
  streak: number
  createdAt: string
}

export interface LearningRecord {
  id: string
  module: string
  topic: string
  action: string
  score: number | null
  starsEarned: number
  duration: number
  createdAt: string
}

export interface Achievement {
  id: string
  code: string
  name: string
  description: string
  icon: string
  category: string
  unlocked: boolean
  unlockedAt?: string
}

interface UserRow {
  id: string
  name: string
  avatar: string
  stars: number
  level: number
  streak: number
  created_at: string
}

interface RecordRow {
  id: string
  module: string
  topic: string
  action: string
  score: number | null
  stars_earned: number
  duration: number
  created_at: string
}

interface AchievementRow {
  id: string
  code: string
  name: string
  description: string
  icon: string
  category: string
  unlocked: number
  unlocked_at: string | null
}

interface TodayMinutesRow {
  date: string
  minutes: number
}

interface CurrentUserRow {
  user_id: string
}

function rowToUser(row: UserRow): UserProfile {
  return {
    id: row.id,
    name: row.name,
    avatar: row.avatar,
    stars: row.stars,
    level: row.level,
    streak: row.streak,
    createdAt: row.created_at,
  }
}

function rowToRecord(row: RecordRow): LearningRecord {
  return {
    id: row.id,
    module: row.module,
    topic: row.topic,
    action: row.action,
    score: row.score,
    starsEarned: row.stars_earned,
    duration: row.duration,
    createdAt: row.created_at,
  }
}

function rowToAchievement(row: AchievementRow): Achievement {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    icon: row.icon,
    category: row.category,
    unlocked: row.unlocked === 1,
    unlockedAt: row.unlocked_at ?? undefined,
  }
}

export const useUserStore = defineStore('user', () => {
  const currentUser = ref<UserProfile | null>(null)
  const users = ref<UserProfile[]>([])
  const learningRecords = ref<LearningRecord[]>([])
  const achievements = ref<Achievement[]>([])
  const todayMinutes = ref(0)
  const sessionStartTime = ref<number | null>(null)

  const totalStars = computed(() => currentUser.value?.stars ?? 0)
  const currentLevel = computed(() => currentUser.value?.level ?? 1)
  const currentStreak = computed(() => currentUser.value?.streak ?? 0)

  function loadFromStorage() {
    const userRows = query<UserRow>('SELECT * FROM users')
    users.value = userRows.map(rowToUser)

    const currentRow = queryOne<CurrentUserRow>('SELECT user_id FROM current_user WHERE id = 1')
    if (currentRow) {
      currentUser.value = users.value.find(u => u.id === currentRow.user_id) ?? null
    }

    loadUserData()
  }

  function loadUserData() {
    if (!currentUser.value) {
      learningRecords.value = []
      achievements.value = []
      todayMinutes.value = 0
      return
    }

    const userId = currentUser.value.id

    const recordRows = query<RecordRow>(
      'SELECT * FROM learning_records WHERE user_id = ? ORDER BY created_at',
      [userId]
    )
    learningRecords.value = recordRows.map(rowToRecord)

    const achRows = query<AchievementRow>(
      'SELECT * FROM achievements WHERE user_id = ?',
      [userId]
    )
    achievements.value = achRows.map(rowToAchievement)

    const minsRow = queryOne<TodayMinutesRow>(
      'SELECT date, minutes FROM today_minutes WHERE user_id = ?',
      [userId]
    )
    if (minsRow) {
      const today = new Date().toDateString()
      if (minsRow.date === today) {
        todayMinutes.value = minsRow.minutes
      } else {
        todayMinutes.value = 0
      }
    } else {
      todayMinutes.value = 0
    }
  }

  function saveToStorage() {
    if (currentUser.value) {
      run('UPDATE users SET name=?, avatar=?, stars=?, level=?, streak=? WHERE id=?', [
        currentUser.value.name, currentUser.value.avatar,
        currentUser.value.stars, currentUser.value.level,
        currentUser.value.streak, currentUser.value.id,
      ])
      run('INSERT OR REPLACE INTO current_user (id, user_id) VALUES (1, ?)', [currentUser.value.id])

      const today = new Date().toDateString()
      run('INSERT OR REPLACE INTO today_minutes (id, user_id, date, minutes) VALUES (1, ?, ?, ?)', [
        currentUser.value.id, today, todayMinutes.value,
      ])
    }
  }

  function createUser(name: string, avatar: string) {
    const user: UserProfile = {
      id: Date.now().toString(),
      name,
      avatar,
      stars: 0,
      level: 1,
      streak: 0,
      createdAt: new Date().toISOString(),
    }
    run(
      'INSERT INTO users (id, name, avatar, stars, level, streak, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [user.id, user.name, user.avatar, user.stars, user.level, user.streak, user.createdAt]
    )
    users.value.push(user)
    currentUser.value = user
    run('INSERT OR REPLACE INTO current_user (id, user_id) VALUES (1, ?)', [user.id])
    initAchievements(user.id)
    loadUserData()
    return user
  }

  function switchUser(userId: string) {
    currentUser.value = users.value.find(u => u.id === userId) ?? null
    if (currentUser.value) {
      run('INSERT OR REPLACE INTO current_user (id, user_id) VALUES (1, ?)', [currentUser.value.id])
    }
    loadUserData()
  }

  function selectUser(userId: string) {
    currentUser.value = users.value.find(u => u.id === userId) ?? null
    if (currentUser.value) {
      run('INSERT OR REPLACE INTO current_user (id, user_id) VALUES (1, ?)', [currentUser.value.id])
    }
    loadUserData()
  }

  function addStars(count: number) {
    if (!currentUser.value) return
    currentUser.value.stars += count
    const newLevel = Math.floor(currentUser.value.stars / 50) + 1
    if (newLevel > currentUser.value.level) {
      currentUser.value.level = newLevel
    }
    saveToStorage()
  }

  function addLearningRecord(record: Omit<LearningRecord, 'id' | 'createdAt'>) {
    if (!currentUser.value) return
    const newRecord: LearningRecord = {
      ...record,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    }
    run(
      'INSERT INTO learning_records (id, user_id, module, topic, action, score, stars_earned, duration, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [newRecord.id, currentUser.value.id, newRecord.module, newRecord.topic, newRecord.action, newRecord.score, newRecord.starsEarned, newRecord.duration, newRecord.createdAt]
    )
    learningRecords.value.push(newRecord)
    if (record.starsEarned > 0) {
      addStars(record.starsEarned)
    }
    checkAchievements()
  }

  function startSession() {
    sessionStartTime.value = Date.now()
  }

  function updateSessionTime() {
    if (!sessionStartTime.value) return
    const elapsed = (Date.now() - sessionStartTime.value) / 60000
    todayMinutes.value += elapsed
    sessionStartTime.value = Date.now()
    saveToStorage()
  }

  function initAchievements(userId: string) {
    const defaultAchievements: Achievement[] = [
      { id: `${userId}-1`, code: 'first_learn', name: '初学者', description: '完成第一次学习', icon: '🌟', category: 'general', unlocked: false },
      { id: `${userId}-2`, code: 'pinyin_master', name: '拼音小能手', description: '学习10个拼音', icon: '📝', category: 'pinyin', unlocked: false },
      { id: `${userId}-3`, code: 'chinese_star', name: '识字之星', description: '学习10个汉字', icon: '📖', category: 'chinese', unlocked: false },
      { id: `${userId}-4`, code: 'english_hero', name: '英语小英雄', description: '学习10个英语单词', icon: '🌍', category: 'english', unlocked: false },
      { id: `${userId}-5`, code: 'math_genius', name: '数学小天才', description: '完成10道数学题', icon: '🔢', category: 'math', unlocked: false },
      { id: `${userId}-6`, code: 'streak_7', name: '坚持之星', description: '连续学习7天', icon: '🔥', category: 'general', unlocked: false },
      { id: `${userId}-7`, code: 'star_100', name: '星星收集家', description: '累计获得100颗星星', icon: '⭐', category: 'general', unlocked: false },
      { id: `${userId}-8`, code: 'perfect_quiz', name: '满分达人', description: '一次测验全部答对', icon: '🏆', category: 'general', unlocked: false },
    ]
    achievements.value = defaultAchievements

    run('DELETE FROM achievements WHERE user_id = ?', [userId])
    const stmt = getDatabase().prepare(
      'INSERT INTO achievements (id, user_id, code, name, description, icon, category, unlocked, unlocked_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
    for (const ach of defaultAchievements) {
      stmt.run([ach.id, userId, ach.code, ach.name, ach.description, ach.icon, ach.category, 0, null])
    }
    stmt.free()
    schedulePersist()
  }

  function checkAchievements() {
    if (!currentUser.value) return
    const pinyinCount = learningRecords.value.filter(r => r.module === 'pinyin' && r.action === 'learn').length
    const chineseCount = learningRecords.value.filter(r => r.module === 'chinese' && r.action === 'learn').length
    const englishCount = learningRecords.value.filter(r => r.module === 'english' && r.action === 'learn').length
    const mathCount = learningRecords.value.filter(r => r.module === 'math').length
    const totalStarsVal = currentUser.value.stars

    const updates: Record<string, boolean> = {
      first_learn: learningRecords.value.length >= 1,
      pinyin_master: pinyinCount >= 10,
      chinese_star: chineseCount >= 10,
      english_hero: englishCount >= 10,
      math_genius: mathCount >= 10,
      star_100: totalStarsVal >= 100,
    }

    for (const ach of achievements.value) {
      if (updates[ach.code] !== undefined && updates[ach.code] && !ach.unlocked) {
        ach.unlocked = true
        ach.unlockedAt = new Date().toISOString()
        run('UPDATE achievements SET unlocked = 1, unlocked_at = ? WHERE id = ?', [ach.unlockedAt, ach.id])
      }
    }
  }

  function unlockAchievement(code: string) {
    const ach = achievements.value.find(a => a.code === code)
    if (ach && !ach.unlocked) {
      ach.unlocked = true
      ach.unlockedAt = new Date().toISOString()
      run('UPDATE achievements SET unlocked = 1, unlocked_at = ? WHERE id = ?', [ach.unlockedAt, ach.id])
      addStars(5)
    }
  }

  function getModuleProgress(module: string): number {
    const records = learningRecords.value.filter(r => r.module === module && r.action === 'learn')
    return records.length
  }

  function logout() {
    currentUser.value = null
    learningRecords.value = []
    achievements.value = []
    todayMinutes.value = 0
    run('DELETE FROM current_user WHERE id = 1')
  }

  loadFromStorage()

  return {
    currentUser,
    users,
    learningRecords,
    achievements,
    todayMinutes,
    totalStars,
    currentLevel,
    currentStreak,
    createUser,
    switchUser,
    selectUser,
    addStars,
    addLearningRecord,
    startSession,
    updateSessionTime,
    unlockAchievement,
    getModuleProgress,
    logout,
    saveToStorage,
    loadUserData,
  }
})
