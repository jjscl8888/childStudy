<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'

const router = useRouter()
const authStore = useAuthStore()

const activeTab = ref<'login' | 'register'>('login')
const loading = ref(false)
const errorMsg = ref('')

const loginForm = ref({
  username: '',
  password: '',
})

const registerForm = ref({
  username: '',
  password: '',
  confirmPassword: '',
  name: '',
  email: '',
  code: '',
})

const codeSending = ref(false)
const codeCountdown = ref(0)
const codeTimer = ref<ReturnType<typeof setInterval> | null>(null)

async function handleLogin() {
  if (!loginForm.value.username.trim() || !loginForm.value.password) return
  errorMsg.value = ''
  loading.value = true

  try {
    await authStore.login(loginForm.value.username.trim(), loginForm.value.password)
    router.replace('/')
  } catch (err: any) {
    errorMsg.value = err.message || '登录失败'
    loginForm.value.password = ''
  } finally {
    loading.value = false
  }
}

async function handleRegister() {
  const { username, password, confirmPassword, name, email, code } = registerForm.value
  if (!username.trim() || !password || !confirmPassword) return

  if (password !== confirmPassword) {
    errorMsg.value = '两次密码不一致'
    return
  }

  if (password.length < 6) {
    errorMsg.value = '密码至少6位'
    return
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errorMsg.value = '邮箱格式不正确'
    return
  }

  if (email && !code.trim()) {
    errorMsg.value = '请输入邮箱验证码'
    return
  }

  errorMsg.value = ''
  loading.value = true

  try {
    await authStore.register(username.trim(), password, name.trim() || undefined, undefined, email.trim() || undefined, code.trim() || undefined)
    router.replace('/')
  } catch (err: any) {
    errorMsg.value = err.message || '注册失败'
    registerForm.value.password = ''
    registerForm.value.confirmPassword = ''
  } finally {
    loading.value = false
  }
}

async function sendCode() {
  const email = registerForm.value.email.trim()
  if (!email) {
    errorMsg.value = '请先输入邮箱'
    return
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errorMsg.value = '邮箱格式不正确'
    return
  }

  errorMsg.value = ''
  codeSending.value = true

  try {
    await authStore.sendVerificationCode(email, 'register')
    codeCountdown.value = 60
    codeTimer.value = setInterval(() => {
      codeCountdown.value--
      if (codeCountdown.value <= 0 && codeTimer.value) {
        clearInterval(codeTimer.value)
        codeTimer.value = null
      }
    }, 1000)
  } catch (err: any) {
    errorMsg.value = err.message || '发送验证码失败'
  } finally {
    codeSending.value = false
  }
}

function switchTab(tab: 'login' | 'register') {
  activeTab.value = tab
  errorMsg.value = ''
  if (codeTimer.value) {
    clearInterval(codeTimer.value)
    codeTimer.value = null
  }
  codeCountdown.value = 0
}
</script>

<template>
  <div class="login-page relative min-h-screen overflow-hidden bg-warm flex flex-col items-center justify-center px-4 py-8">
    <div class="floating-decor">
      <span class="decor-item decor-1">⭐</span>
      <span class="decor-item decor-2">🌈</span>
      <span class="decor-item decor-3">☁️</span>
      <span class="decor-item decor-4">✨</span>
      <span class="decor-item decor-5">🎈</span>
      <span class="decor-item decor-6">🌟</span>
    </div>

    <div class="relative z-10 w-full max-w-sm">
      <div class="text-center mb-8 animate-fade-in">
        <div class="text-7xl mb-4 animate-bounce-slow">🎓</div>
        <h1 class="text-3xl font-bold text-primary text-shadow-lg mb-2">趣学堂</h1>
        <p class="text-sm text-gray-400">快乐学习，天天向上</p>
      </div>

      <div class="fun-card animate-slide-up">
        <div class="flex mb-6 bg-warm-dark rounded-xl2 p-1">
          <button
            class="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-200"
            :class="activeTab === 'login'
              ? 'bg-white text-primary shadow-sm'
              : 'text-gray-400 hover:text-gray-600'"
            @click="switchTab('login')"
          >
            登录
          </button>
          <button
            class="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-200"
            :class="activeTab === 'register'
              ? 'bg-white text-primary shadow-sm'
              : 'text-gray-400 hover:text-gray-600'"
            @click="switchTab('register')"
          >
            注册
          </button>
        </div>

        <form v-if="activeTab === 'login'" @submit.prevent="handleLogin" class="space-y-4">
          <div>
            <label class="block text-sm font-bold text-gray-500 mb-2">用户名</label>
            <input
              v-model="loginForm.username"
              type="text"
              placeholder="请输入用户名"
              class="fun-input"
              maxlength="20"
              autocomplete="username"
            />
          </div>

          <div>
            <label class="block text-sm font-bold text-gray-500 mb-2">密码</label>
            <input
              v-model="loginForm.password"
              type="password"
              placeholder="请输入密码"
              class="fun-input"
              maxlength="32"
              autocomplete="current-password"
            />
          </div>

          <p v-if="errorMsg" class="text-sm text-accent font-bold text-center">
            {{ errorMsg }}
          </p>

          <button
            type="submit"
            class="fun-btn-primary w-full text-lg"
            :disabled="!loginForm.username.trim() || !loginForm.password || loading"
            :class="{ 'opacity-50 cursor-not-allowed': !loginForm.username.trim() || !loginForm.password || loading }"
          >
            {{ loading ? '登录中...' : '登 录' }}
          </button>
        </form>

        <form v-else @submit.prevent="handleRegister" class="space-y-4">
          <div>
            <label class="block text-sm font-bold text-gray-500 mb-2">用户名</label>
            <input
              v-model="registerForm.username"
              type="text"
              placeholder="请输入用户名"
              class="fun-input"
              maxlength="20"
              autocomplete="username"
            />
          </div>

          <div>
            <label class="block text-sm font-bold text-gray-500 mb-2">密码</label>
            <input
              v-model="registerForm.password"
              type="password"
              placeholder="至少6位密码"
              class="fun-input"
              maxlength="32"
              autocomplete="new-password"
            />
          </div>

          <div>
            <label class="block text-sm font-bold text-gray-500 mb-2">确认密码</label>
            <input
              v-model="registerForm.confirmPassword"
              type="password"
              placeholder="再次输入密码"
              class="fun-input"
              maxlength="32"
              autocomplete="new-password"
            />
          </div>

          <div>
            <label class="block text-sm font-bold text-gray-500 mb-2">邮箱 <span class="font-normal text-gray-300">（选填，用于找回密码）</span></label>
            <input
              v-model="registerForm.email"
              type="email"
              placeholder="your@email.com"
              class="fun-input"
              maxlength="100"
              autocomplete="email"
            />
          </div>

          <div v-if="registerForm.email">
            <label class="block text-sm font-bold text-gray-500 mb-2">验证码</label>
            <div class="flex gap-2">
              <input
                v-model="registerForm.code"
                type="text"
                placeholder="请输入验证码"
                class="fun-input flex-1"
                maxlength="6"
              />
              <button
                type="button"
                class="fun-btn-primary whitespace-nowrap text-sm px-4"
                :disabled="codeSending || codeCountdown > 0"
                :class="{ 'opacity-50 cursor-not-allowed': codeSending || codeCountdown > 0 }"
                @click="sendCode"
              >
                {{ codeCountdown > 0 ? `${codeCountdown}秒后重发` : (codeSending ? '发送中...' : '获取验证码') }}
              </button>
            </div>
          </div>

          <div>
            <label class="block text-sm font-bold text-gray-500 mb-2">昵称 <span class="font-normal text-gray-300">（选填）</span></label>
            <input
              v-model="registerForm.name"
              type="text"
              placeholder="你的昵称"
              class="fun-input"
              maxlength="8"
            />
          </div>

          <p v-if="errorMsg" class="text-sm text-accent font-bold text-center">
            {{ errorMsg }}
          </p>

          <button
            type="submit"
            class="fun-btn-primary w-full text-lg"
            :disabled="!registerForm.username.trim() || !registerForm.password || !registerForm.confirmPassword || loading"
            :class="{ 'opacity-50 cursor-not-allowed': !registerForm.username.trim() || !registerForm.password || !registerForm.confirmPassword || loading }"
          >
            {{ loading ? '注册中...' : '注 册' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page::before {
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
</style>
