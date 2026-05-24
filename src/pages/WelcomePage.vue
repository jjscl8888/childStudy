<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import { useLearningPathStore } from '@/stores/learningPathStore'
import { useSpacedRepetitionStore } from '@/stores/spacedRepetitionStore'

const router = useRouter()
const userStore = useUserStore()
const learningPathStore = useLearningPathStore()
const spacedRepetition = useSpacedRepetitionStore()

const nameInput = ref('')
const selectedAvatar = ref('')
const showCreateForm = ref(false)

const avatarOptions = ['🐰', '🐱', '🐶', '🦊', '🐼', '🐸']

function handleCreateUser() {
  const name = nameInput.value.trim()
  if (!name || !selectedAvatar.value) return
  userStore.createUser(name, selectedAvatar.value)
  learningPathStore.saveToStorage()
  spacedRepetition.saveToStorage()
  router.push('/')
}

function handleSelectUser(userId: string) {
  userStore.selectUser(userId)
  learningPathStore.saveToStorage()
  spacedRepetition.saveToStorage()
  router.push('/')
}

function showForm() {
  showCreateForm.value = true
  nameInput.value = ''
  selectedAvatar.value = ''
}
</script>

<template>
  <div class="welcome-page relative min-h-screen overflow-hidden bg-warm flex flex-col items-center justify-center px-4 py-8">
    <div class="floating-decor">
      <span class="decor-item decor-1">⭐</span>
      <span class="decor-item decor-2">🌈</span>
      <span class="decor-item decor-3">☁️</span>
      <span class="decor-item decor-4">✨</span>
      <span class="decor-item decor-5">🎈</span>
      <span class="decor-item decor-6">🌟</span>
    </div>

    <div class="relative z-10 w-full max-w-md">
      <div class="text-center mb-8 animate-fade-in">
        <div class="text-7xl mb-4 animate-bounce-slow">🎓</div>
        <h1 class="text-4xl font-bold text-primary text-shadow-lg mb-2">
          欢迎来到趣学堂！
        </h1>
        <p class="text-lg text-gray-500">快乐学习，天天向上</p>
      </div>

      <div v-if="userStore.users.length === 0 || showCreateForm" class="animate-slide-up">
        <div class="fun-card mb-6">
          <h2 class="text-xl font-bold text-gray-700 mb-4 text-center">
            创建你的角色
          </h2>

          <div class="mb-5">
            <label class="block text-sm font-bold text-gray-500 mb-2">你的名字</label>
            <input
              v-model="nameInput"
              type="text"
              placeholder="输入你的名字..."
              class="fun-input text-center"
              maxlength="8"
              @keyup.enter="handleCreateUser"
            />
          </div>

          <div class="mb-6">
            <label class="block text-sm font-bold text-gray-500 mb-3">选择头像</label>
            <div class="grid grid-cols-3 gap-3">
              <button
                v-for="avatar in avatarOptions"
                :key="avatar"
                class="avatar-option flex items-center justify-center h-16 rounded-xl2 text-4xl border-3 transition-all duration-200"
                :class="selectedAvatar === avatar
                  ? 'border-primary bg-primary/10 scale-110 shadow-lg'
                  : 'border-gray-200 bg-gray-50 hover:border-primary/50 hover:bg-primary/5'"
                @click="selectedAvatar = avatar"
              >
                {{ avatar }}
              </button>
            </div>
          </div>

          <button
            class="fun-btn-primary w-full text-xl py-4"
            :class="{ 'opacity-50 cursor-not-allowed': !nameInput.trim() || !selectedAvatar }"
            :disabled="!nameInput.trim() || !selectedAvatar"
            @click="handleCreateUser"
          >
            🚀 开始学习之旅
          </button>
        </div>
      </div>

      <div v-else class="animate-slide-up">
        <h2 class="text-xl font-bold text-gray-700 mb-4 text-center">
          选择你的角色
        </h2>

        <div class="space-y-3 mb-6">
          <button
            v-for="user in userStore.users"
            :key="user.id"
            class="fun-card-hover w-full flex items-center gap-4"
            @click="handleSelectUser(user.id)"
          >
            <div class="flex h-14 w-14 items-center justify-center rounded-xl2 text-4xl bg-primary/10">
              {{ user.avatar }}
            </div>
            <div class="flex-1 text-left">
              <div class="text-lg font-bold text-gray-700">{{ user.name }}</div>
              <div class="flex items-center gap-3 text-sm text-gray-400">
                <span class="star-badge text-xs py-0.5 px-2">⭐ {{ user.stars }}</span>
                <span>Lv.{{ user.level }}</span>
              </div>
            </div>
            <div class="text-primary text-2xl">→</div>
          </button>
        </div>

        <button
          class="fun-btn-accent w-full text-lg"
          @click="showForm"
        >
          ➕ 添加新朋友
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.welcome-page::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background:
    radial-gradient(circle at 20% 30%, rgba(255, 159, 67, 0.08) 0%, transparent 40%),
    radial-gradient(circle at 80% 20%, rgba(84, 160, 255, 0.08) 0%, transparent 40%),
    radial-gradient(circle at 50% 80%, rgba(46, 213, 115, 0.06) 0%, transparent 40%),
    radial-gradient(circle at 70% 60%, rgba(165, 94, 234, 0.06) 0%, transparent 40%);
  animation: float 8s ease-in-out infinite;
  pointer-events: none;
}

.floating-decor {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.decor-item {
  position: absolute;
  font-size: 2rem;
  opacity: 0.3;
}

.decor-1 { top: 8%; left: 10%; animation: float 4s ease-in-out infinite; }
.decor-2 { top: 5%; right: 15%; animation: float 5s ease-in-out infinite 0.5s; }
.decor-3 { top: 25%; left: 5%; animation: float 6s ease-in-out infinite 1s; }
.decor-4 { bottom: 20%; right: 8%; animation: float 4.5s ease-in-out infinite 0.3s; }
.decor-5 { bottom: 10%; left: 12%; animation: float 5.5s ease-in-out infinite 0.8s; }
.decor-6 { top: 40%; right: 5%; animation: float 3.5s ease-in-out infinite 1.2s; }

.border-3 {
  border-width: 3px;
}
</style>
