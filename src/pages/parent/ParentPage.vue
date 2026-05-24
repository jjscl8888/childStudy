<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import { useAdminStore } from '@/stores/adminStore'
import { queryOne, run } from '@/db/database'
import TopBar from '@/components/layout/TopBar.vue'

const router = useRouter()
const userStore = useUserStore()
const adminStore = useAdminStore()

interface ParentSettings {
  dailyTimeLimit: number
  sessionTimeLimit: number
  enabledModules: Record<string, boolean>
}

interface ParentSettingsRow {
  daily_time_limit: number
  session_time_limit: number
  enabled_modules: string
  password: string
}

const settings = reactive<ParentSettings>({
  dailyTimeLimit: 30,
  sessionTimeLimit: 10,
  enabledModules: {
    pinyin: true,
    chinese: true,
    english: true,
    math: true,
    explore: true,
  },
})

const settingsSaved = ref(false)
const showPasswordModal = ref(false)
const oldPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const passwordMsg = ref('')
const passwordMsgType = ref<'success' | 'error'>('error')

onMounted(() => {
  const row = queryOne<ParentSettingsRow>('SELECT * FROM parent_settings WHERE id = 1')
  if (row) {
    settings.dailyTimeLimit = row.daily_time_limit
    settings.sessionTimeLimit = row.session_time_limit
    try {
      Object.assign(settings.enabledModules, JSON.parse(row.enabled_modules))
    } catch { /* use defaults */ }
  }
})

function saveSettings() {
  run(
    'INSERT OR REPLACE INTO parent_settings (id, daily_time_limit, session_time_limit, enabled_modules, password) VALUES (1, ?, ?, ?, ?)',
    [settings.dailyTimeLimit, settings.sessionTimeLimit, JSON.stringify(settings.enabledModules), queryOne<ParentSettingsRow>('SELECT password FROM parent_settings WHERE id = 1')?.password ?? '123456']
  )
  settingsSaved.value = true
  setTimeout(() => {
    settingsSaved.value = false
  }, 2000)
}

function handleLogout() {
  adminStore.logout()
  router.replace('/admin/login')
}

function handleChangePassword() {
  passwordMsg.value = ''
  if (!oldPassword.value || !newPassword.value || !confirmPassword.value) {
    passwordMsg.value = '请填写所有字段'
    passwordMsgType.value = 'error'
    return
  }
  if (newPassword.value.length < 6) {
    passwordMsg.value = '新密码至少6个字符'
    passwordMsgType.value = 'error'
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    passwordMsg.value = '两次输入的新密码不一致'
    passwordMsgType.value = 'error'
    return
  }
  const result = adminStore.changePassword(oldPassword.value, newPassword.value)
  if (result.success) {
    passwordMsg.value = '密码修改成功'
    passwordMsgType.value = 'success'
    oldPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
    setTimeout(() => {
      showPasswordModal.value = false
      passwordMsg.value = ''
    }, 1500)
  } else {
    passwordMsg.value = result.error ?? '修改失败'
    passwordMsgType.value = 'error'
  }
}

const todayRecords = computed(() => {
  const today = new Date().toDateString()
  return userStore.learningRecords.filter(r => new Date(r.createdAt).toDateString() === today)
})

const todayStats = computed(() => {
  const records = todayRecords.value
  const totalMinutes = records.reduce((sum, r) => sum + r.duration, 0) / 60
  const totalStars = records.reduce((sum, r) => sum + r.starsEarned, 0)
  return {
    minutes: Math.round(totalMinutes),
    items: records.length,
    stars: totalStars,
  }
})

const weeklyData = computed(() => {
  const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  const now = new Date()
  const today = now.getDay() === 0 ? 6 : now.getDay() - 1

  return days.map((label, i) => {
    const date = new Date(now)
    date.setDate(now.getDate() - today + i)
    const dateStr = date.toDateString()
    const dayRecords = userStore.learningRecords.filter(r => new Date(r.createdAt).toDateString() === dateStr)
    const minutes = dayRecords.reduce((sum, r) => sum + r.duration, 0) / 60
    return {
      label,
      minutes: Math.round(minutes),
      isToday: i === today,
    }
  })
})

const maxWeeklyMinutes = computed(() => {
  const max = Math.max(...weeklyData.value.map(d => d.minutes), 1)
  return max
})

const moduleProgress = computed(() => {
  const modules = [
    { key: 'pinyin', name: '拼音王国', emoji: '📝', color: '#FF9F43' },
    { key: 'chinese', name: '汉字花园', emoji: '📖', color: '#2ED573' },
    { key: 'english', name: '英语世界', emoji: '🌍', color: '#54A0FF' },
    { key: 'math', name: '数学城堡', emoji: '🔢', color: '#FF6B6B' },
    { key: 'explore', name: '探索天地', emoji: '🌟', color: '#A55EEA' },
  ]
  return modules.map(m => ({
    ...m,
    count: userStore.learningRecords.filter(r => r.module === m.key).length,
  }))
})

const moduleOptions = [
  { key: 'pinyin', name: '拼音王国', emoji: '📝' },
  { key: 'chinese', name: '汉字花园', emoji: '📖' },
  { key: 'english', name: '英语世界', emoji: '🌍' },
  { key: 'math', name: '数学城堡', emoji: '🔢' },
  { key: 'explore', name: '探索天地', emoji: '🌟' },
]

function goBack() {
  router.push('/profile')
}
</script>

<template>
  <div class="min-h-screen bg-warm pb-6">
    <TopBar title="管理后台 🔒" />

    <div class="px-4 pt-4 space-y-4">
      <section class="fun-card">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-lg font-bold text-gray-700 flex items-center gap-2">
            <span>👤</span> 管理员信息
          </h3>
          <span class="text-xs px-3 py-1 rounded-full bg-green-100 text-green-700 font-bold">
            已登录
          </span>
        </div>
        <div class="flex items-center gap-3 p-3 rounded-xl2 bg-gray-50">
          <div class="flex h-12 w-12 items-center justify-center rounded-xl2 text-3xl bg-primary/10 shrink-0">
            👨‍💼
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-bold text-gray-700">{{ adminStore.currentAdmin?.username ?? 'admin' }}</div>
            <div class="text-xs text-gray-400">管理员账号</div>
          </div>
        </div>
      </section>

      <section class="fun-card">
        <h3 class="text-lg font-bold text-gray-700 mb-3 flex items-center gap-2">
          <span>👶</span> 孩子档案
        </h3>
        <div class="space-y-3">
          <div
            v-for="user in userStore.users"
            :key="user.id"
            class="flex items-center gap-3 p-3 rounded-xl2 bg-gray-50"
          >
            <div class="flex h-12 w-12 items-center justify-center rounded-xl2 text-3xl bg-primary/10 shrink-0">
              {{ user.avatar }}
            </div>
            <div class="flex-1 min-w-0">
              <div class="font-bold text-gray-700">{{ user.name }}</div>
              <div class="flex items-center gap-3 text-xs text-gray-400">
                <span>⭐ {{ user.stars }}</span>
                <span>Lv.{{ user.level }}</span>
                <span>🔥 {{ user.streak }}天</span>
              </div>
            </div>
          </div>
          <div v-if="userStore.users.length === 0" class="text-center text-gray-400 py-4">
            暂无孩子档案
          </div>
        </div>
      </section>

      <section class="fun-card">
        <h3 class="text-lg font-bold text-gray-700 mb-3 flex items-center gap-2">
          <span>📋</span> 今日学习
        </h3>

      <button
        class="fun-card-hover w-full flex items-center gap-4 p-4 mb-4 border-2 border-primary/30"
        @click="router.push('/parent/content')"
      >
        <div class="flex h-12 w-12 items-center justify-center rounded-xl3 text-3xl bg-primary/10">
          📚
        </div>
        <div class="flex-1 text-left">
          <h3 class="text-base font-bold text-gray-700">内容管理</h3>
          <p class="text-sm text-gray-400">添加汉字、拼音、英语等学习内容</p>
        </div>
        <div class="text-primary text-xl font-bold">→</div>
      </button>
        <div class="grid grid-cols-3 gap-3">
          <div class="text-center p-3 rounded-xl2 bg-blue-50">
            <p class="text-2xl font-bold text-blue-500">{{ todayStats.minutes }}</p>
            <p class="text-xs text-gray-400 font-bold">学习分钟</p>
          </div>
          <div class="text-center p-3 rounded-xl2 bg-green-50">
            <p class="text-2xl font-bold text-success">{{ todayStats.items }}</p>
            <p class="text-xs text-gray-400 font-bold">完成项目</p>
          </div>
          <div class="text-center p-3 rounded-xl2 bg-yellow-50">
            <p class="text-2xl font-bold text-yellow-500">{{ todayStats.stars }}</p>
            <p class="text-xs text-gray-400 font-bold">获得星星</p>
          </div>
        </div>
      </section>

      <section class="fun-card">
        <h3 class="text-lg font-bold text-gray-700 mb-3 flex items-center gap-2">
          <span>📊</span> 本周报告
        </h3>
        <div class="flex items-end justify-between gap-2 h-40 px-2">
          <div
            v-for="day in weeklyData"
            :key="day.label"
            class="flex flex-1 flex-col items-center gap-1 h-full justify-end"
          >
            <span class="text-xs font-bold text-gray-500">{{ day.minutes }}m</span>
            <div
              class="w-full rounded-t-lg transition-all duration-500 min-h-[4px]"
              :style="{
                height: Math.max((day.minutes / maxWeeklyMinutes) * 100, 4) + '%',
                backgroundColor: day.isToday ? '#FF9F43' : '#54A0FF',
                opacity: day.minutes > 0 ? 1 : 0.3,
              }"
            ></div>
            <span
              class="text-xs font-bold"
              :class="day.isToday ? 'text-primary' : 'text-gray-400'"
            >
              {{ day.label }}
            </span>
          </div>
        </div>
      </section>

      <section class="fun-card">
        <h3 class="text-lg font-bold text-gray-700 mb-3 flex items-center gap-2">
          <span>📈</span> 模块进度
        </h3>
        <div class="space-y-3">
          <div
            v-for="mod in moduleProgress"
            :key="mod.key"
            class="flex items-center gap-3"
          >
            <span class="text-xl w-8 text-center">{{ mod.emoji }}</span>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between mb-1">
                <span class="text-sm font-bold text-gray-600">{{ mod.name }}</span>
                <span class="text-xs text-gray-400">{{ mod.count }} 项</span>
              </div>
              <div class="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-500"
                  :style="{
                    width: Math.min(mod.count * 5, 100) + '%',
                    backgroundColor: mod.color,
                  }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="fun-card">
        <h3 class="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2">
          <span>⚙️</span> 设置
        </h3>

        <div class="space-y-5">
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="text-sm font-bold text-gray-600">每日学习时长限制</label>
              <span class="text-sm font-bold text-primary">{{ settings.dailyTimeLimit }} 分钟</span>
            </div>
            <input
              v-model.number="settings.dailyTimeLimit"
              type="range"
              min="15"
              max="60"
              step="5"
              class="w-full accent-primary"
            />
            <div class="flex justify-between text-xs text-gray-300 mt-1">
              <span>15分钟</span>
              <span>60分钟</span>
            </div>
          </div>

          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="text-sm font-bold text-gray-600">单次学习时长限制</label>
              <span class="text-sm font-bold text-primary">{{ settings.sessionTimeLimit }} 分钟</span>
            </div>
            <input
              v-model.number="settings.sessionTimeLimit"
              type="range"
              min="5"
              max="20"
              step="5"
              class="w-full accent-primary"
            />
            <div class="flex justify-between text-xs text-gray-300 mt-1">
              <span>5分钟</span>
              <span>20分钟</span>
            </div>
          </div>

          <div>
            <label class="text-sm font-bold text-gray-600 block mb-3">启用学习模块</label>
            <div class="space-y-2">
              <label
                v-for="mod in moduleOptions"
                :key="mod.key"
                class="flex items-center gap-3 p-2 rounded-xl2 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  v-model="settings.enabledModules[mod.key]"
                  type="checkbox"
                  class="w-5 h-5 rounded accent-primary"
                />
                <span class="text-lg">{{ mod.emoji }}</span>
                <span class="text-sm font-bold text-gray-600">{{ mod.name }}</span>
              </label>
            </div>
          </div>
        </div>

        <button
          class="fun-btn-success w-full mt-5"
          @click="saveSettings"
        >
          💾 保存设置
        </button>

        <Transition name="saved">
          <p v-if="settingsSaved" class="text-center text-sm font-bold text-success mt-2">
            ✅ 设置已保存
          </p>
        </Transition>
      </section>

      <div class="space-y-3 pt-2">
        <button
          class="fun-btn-secondary w-full text-base"
          @click="showPasswordModal = true"
        >
          🔑 修改密码
        </button>

        <div class="flex gap-3">
          <button
            class="fun-btn-secondary flex-1 text-base"
            @click="goBack"
          >
            ← 返回
          </button>
          <button
            class="fun-btn-accent flex-1 text-base"
            @click="handleLogout"
          >
            🚪 退出登录
          </button>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="showPasswordModal"
        class="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4"
        @click.self="showPasswordModal = false"
      >
        <div class="fun-card w-full max-w-sm animate-pop">
          <h3 class="text-lg font-bold text-gray-700 mb-4 text-center">修改管理员密码</h3>
          <form @submit.prevent="handleChangePassword" class="space-y-3">
            <div>
              <label class="block text-sm font-bold text-gray-500 mb-1">原密码</label>
              <input
                v-model="oldPassword"
                type="password"
                class="fun-input"
                placeholder="请输入原密码"
                autocomplete="current-password"
              />
            </div>
            <div>
              <label class="block text-sm font-bold text-gray-500 mb-1">新密码</label>
              <input
                v-model="newPassword"
                type="password"
                class="fun-input"
                placeholder="至少6个字符"
                autocomplete="new-password"
              />
            </div>
            <div>
              <label class="block text-sm font-bold text-gray-500 mb-1">确认新密码</label>
              <input
                v-model="confirmPassword"
                type="password"
                class="fun-input"
                placeholder="再次输入新密码"
                autocomplete="new-password"
              />
            </div>
            <p
              v-if="passwordMsg"
              class="text-sm font-bold text-center"
              :class="passwordMsgType === 'success' ? 'text-success' : 'text-accent'"
            >
              {{ passwordMsg }}
            </p>
            <div class="flex gap-3 pt-2">
              <button
                type="button"
                class="fun-btn-secondary flex-1"
                @click="showPasswordModal = false; passwordMsg = ''"
              >
                取消
              </button>
              <button type="submit" class="fun-btn-primary flex-1">
                确认修改
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.saved-enter-active {
  animation: fadeIn 0.3s ease-out;
}
.saved-leave-active {
  animation: fadeOut 0.2s ease-in;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes fadeOut {
  from { opacity: 1; transform: translateY(0); }
  to { opacity: 0; transform: translateY(-5px); }
}
.animate-pop {
  animation: pop 0.3s ease-out;
}
@keyframes pop {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}
</style>
