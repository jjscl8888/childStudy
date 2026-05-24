import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

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
    const data = localStorage.getItem('funlearn_users')
    if (data) {
      users.value = JSON.parse(data)
    }
    const currentId = localStorage.getItem('funlearn_current_user')
    if (currentId) {
      currentUser.value = users.value.find(u => u.id === currentId) ?? null
    }
    const records = localStorage.getItem('funlearn_records')
    if (records) {
      learningRecords.value = JSON.parse(records)
    }
    const achs = localStorage.getItem('funlearn_achievements')
    if (achs) {
      achievements.value = JSON.parse(achs)
    }
    const mins = localStorage.getItem('funlearn_today_minutes')
    if (mins) {
      const parsed = JSON.parse(mins)
      const today = new Date().toDateString()
      if (parsed.date === today) {
        todayMinutes.value = parsed.minutes
      } else {
        todayMinutes.value = 0
      }
    }
  }

  function saveToStorage() {
    localStorage.setItem('funlearn_users', JSON.stringify(users.value))
    if (currentUser.value) {
      localStorage.setItem('funlearn_current_user', currentUser.value.id)
    }
    localStorage.setItem('funlearn_records', JSON.stringify(learningRecords.value))
    localStorage.setItem('funlearn_achievements', JSON.stringify(achievements.value))
    localStorage.setItem('funlearn_today_minutes', JSON.stringify({
      date: new Date().toDateString(),
      minutes: todayMinutes.value,
    }))
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
    users.value.push(user)
    currentUser.value = user
    initAchievements(user.id)
    saveToStorage()
    return user
  }

  function switchUser(userId: string) {
    currentUser.value = users.value.find(u => u.id === userId) ?? null
    if (currentUser.value) {
      localStorage.setItem('funlearn_current_user', currentUser.value.id)
    }
  }

  function selectUser(userId: string) {
    currentUser.value = users.value.find(u => u.id === userId) ?? null
    if (currentUser.value) {
      localStorage.setItem('funlearn_current_user', currentUser.value.id)
    }
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
    const newRecord: LearningRecord = {
      ...record,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    }
    learningRecords.value.push(newRecord)
    if (record.starsEarned > 0) {
      addStars(record.starsEarned)
    }
    checkAchievements()
    saveToStorage()
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

  function initAchievements(_userId: string) {
    const defaultAchievements: Achievement[] = [
      { id: '1', code: 'first_learn', name: '初学者', description: '完成第一次学习', icon: '🌟', category: 'general', unlocked: false },
      { id: '2', code: 'pinyin_master', name: '拼音小能手', description: '学习10个拼音', icon: '📝', category: 'pinyin', unlocked: false },
      { id: '3', code: 'chinese_star', name: '识字之星', description: '学习10个汉字', icon: '📖', category: 'chinese', unlocked: false },
      { id: '4', code: 'english_hero', name: '英语小英雄', description: '学习10个英语单词', icon: '🌍', category: 'english', unlocked: false },
      { id: '5', code: 'math_genius', name: '数学小天才', description: '完成10道数学题', icon: '🔢', category: 'math', unlocked: false },
      { id: '6', code: 'streak_7', name: '坚持之星', description: '连续学习7天', icon: '🔥', category: 'general', unlocked: false },
      { id: '7', code: 'star_100', name: '星星收集家', description: '累计获得100颗星星', icon: '⭐', category: 'general', unlocked: false },
      { id: '8', code: 'perfect_quiz', name: '满分达人', description: '一次测验全部答对', icon: '🏆', category: 'general', unlocked: false },
    ]
    achievements.value = defaultAchievements
    saveToStorage()
  }

  function checkAchievements() {
    if (!currentUser.value) return
    const pinyinCount = learningRecords.value.filter(r => r.module === 'pinyin' && r.action === 'learn').length
    const chineseCount = learningRecords.value.filter(r => r.module === 'chinese' && r.action === 'learn').length
    const englishCount = learningRecords.value.filter(r => r.module === 'english' && r.action === 'learn').length
    const mathCount = learningRecords.value.filter(r => r.module === 'math').length
    const totalStars = currentUser.value.stars

    const updates: Record<string, boolean> = {
      first_learn: learningRecords.value.length >= 1,
      pinyin_master: pinyinCount >= 10,
      chinese_star: chineseCount >= 10,
      english_hero: englishCount >= 10,
      math_genius: mathCount >= 10,
      star_100: totalStars >= 100,
    }

    for (const ach of achievements.value) {
      if (updates[ach.code] !== undefined && updates[ach.code] && !ach.unlocked) {
        ach.unlocked = true
        ach.unlockedAt = new Date().toISOString()
      }
    }
    saveToStorage()
  }

  function unlockAchievement(code: string) {
    const ach = achievements.value.find(a => a.code === code)
    if (ach && !ach.unlocked) {
      ach.unlocked = true
      ach.unlockedAt = new Date().toISOString()
      addStars(5)
      saveToStorage()
    }
  }

  function getModuleProgress(module: string): number {
    const records = learningRecords.value.filter(r => r.module === module && r.action === 'learn')
    return records.length
  }

  function logout() {
    currentUser.value = null
    localStorage.removeItem('funlearn_current_user')
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
  }
})
