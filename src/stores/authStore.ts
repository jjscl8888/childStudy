import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

interface AuthUser {
  id: string
  username: string
  name: string
  avatar: string
  stars: number
  level: number
  streak: number
}

interface AuthState {
  token: string | null
  user: AuthUser | null
}

const TOKEN_KEY = 'funlearn_token'
const USER_KEY = 'funlearn_user'

function getApiBase(): string {
  return import.meta.env.VITE_API_BASE_URL || ''
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY))
  const user = ref<AuthUser | null>(null)

  const isLoggedIn = computed(() => !!token.value && !!user.value)
  const currentUser = computed(() => user.value)

  function loadUserFromStorage() {
    const savedUser = localStorage.getItem(USER_KEY)
    if (savedUser && token.value) {
      try {
        user.value = JSON.parse(savedUser)
      } catch {
        user.value = null
      }
    }
  }

  function setAuth(newToken: string, newUser: AuthUser) {
    token.value = newToken
    user.value = newUser
    localStorage.setItem(TOKEN_KEY, newToken)
    localStorage.setItem(USER_KEY, JSON.stringify(newUser))
  }

  function clearAuth() {
    token.value = null
    user.value = null
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }

  async function register(username: string, password: string, name?: string, avatar?: string, email?: string, code?: string) {
    const apiBase = getApiBase()
    const response = await fetch(`${apiBase}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, name, avatar, email, code }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || '注册失败')
    }

    setAuth(data.token, data.user)
    return data
  }

  async function sendVerificationCode(email: string, purpose: string = 'register') {
    const apiBase = getApiBase()
    const response = await fetch(`${apiBase}/api/auth/send-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, purpose }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || '发送验证码失败')
    }

    return data
  }

  async function login(username: string, password: string) {
    const apiBase = getApiBase()
    const response = await fetch(`${apiBase}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || '登录失败')
    }

    setAuth(data.token, data.user)
    return data
  }

  async function refreshToken() {
    if (!token.value) return false

    try {
      const apiBase = getApiBase()
      const response = await fetch(`${apiBase}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.value }),
      })

      if (!response.ok) {
        clearAuth()
        return false
      }

      const data = await response.json()
      setAuth(data.token, data.user)
      return true
    } catch {
      return false
    }
  }

  function logout() {
    clearAuth()
  }

  function getAuthHeaders(): Record<string, string> {
    if (token.value) {
      return { Authorization: `Bearer ${token.value}` }
    }
    return {}
  }

  loadUserFromStorage()

  return {
    token,
    user,
    isLoggedIn,
    currentUser,
    register,
    sendVerificationCode,
    login,
    logout,
    refreshToken,
    getAuthHeaders,
    setAuth,
    clearAuth,
  }
})
