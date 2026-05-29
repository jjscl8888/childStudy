<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAdminStore } from '@/stores/adminStore'

const router = useRouter()
const adminStore = useAdminStore()

const username = ref('')
const password = ref('')
const errorMsg = ref('')
const loading = ref(false)

function handleLogin() {
  if (!username.value.trim() || !password.value) return
  errorMsg.value = ''

  const result = adminStore.login(username.value.trim(), password.value)

  if (result.success) {
    router.replace('/parent')
  } else {
    errorMsg.value = result.error ?? '登录失败'
    password.value = ''
  }
}
</script>

<template>
  <div class="min-h-screen bg-warm flex flex-col items-center justify-center px-4 py-8">
    <div class="w-full max-w-sm">
      <div class="text-center mb-8">
        <div class="text-6xl mb-4">🔐</div>
        <h1 class="text-2xl font-bold text-gray-700 mb-2">管理员登录</h1>
        <p class="text-sm text-gray-400">请输入管理员账号和密码</p>
      </div>

      <div class="fun-card">
        <form @submit.prevent="handleLogin" class="space-y-4">
          <div>
            <label class="block text-sm font-bold text-gray-500 mb-2">用户名</label>
            <input
              v-model="username"
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
              v-model="password"
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
            :disabled="!username.trim() || !password || loading"
            :class="{ 'opacity-50 cursor-not-allowed': !username.trim() || !password || loading }"
          >
            {{ loading ? '登录中...' : '登 录' }}
          </button>
        </form>

        <div class="mt-4 pt-4 border-t border-gray-100">
          <button
            class="w-full text-sm text-gray-400 hover:text-gray-600 transition-colors py-2"
            @click="router.push('/login')"
          >
            ← 返回用户选择
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
