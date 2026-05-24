import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { queryOne, run } from '@/db/database'

export interface AdminUser {
  id: number
  username: string
  createdAt: string
}

interface AdminRow {
  id: number
  username: string
  password_hash: string
  created_at: string
}

interface CurrentAdminRow {
  admin_id: number
}

function simpleHash(message: string): string {
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < message.length; i++) {
    const ch = message.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507)
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507)
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  const combined = 4294967296 * (2097151 & h2) + (h1 >>> 0)
  return combined.toString(16).padStart(16, '0')
}

export const useAdminStore = defineStore('admin', () => {
  const currentAdmin = ref<AdminUser | null>(null)
  const isLoggedIn = computed(() => currentAdmin.value !== null)

  function loadFromStorage() {
    const row = queryOne<CurrentAdminRow>('SELECT admin_id FROM current_admin WHERE id = 1')
    if (row) {
      const adminRow = queryOne<AdminRow>('SELECT * FROM admin_users WHERE id = ?', [row.admin_id])
      if (adminRow) {
        currentAdmin.value = {
          id: adminRow.id,
          username: adminRow.username,
          createdAt: adminRow.created_at,
        }
      }
    }
  }

  function login(username: string, password: string): { success: boolean; error?: string } {
    const hash = simpleHash(password)
    const row = queryOne<AdminRow>(
      'SELECT * FROM admin_users WHERE username = ? AND password_hash = ?',
      [username, hash]
    )
    if (!row) {
      return { success: false, error: '用户名或密码错误' }
    }
    currentAdmin.value = {
      id: row.id,
      username: row.username,
      createdAt: row.created_at,
    }
    run('INSERT OR REPLACE INTO current_admin (id, admin_id) VALUES (1, ?)', [row.id])
    return { success: true }
  }

  function logout() {
    currentAdmin.value = null
    run('DELETE FROM current_admin WHERE id = 1')
  }

  function changePassword(oldPassword: string, newPassword: string): { success: boolean; error?: string } {
    if (!currentAdmin.value) {
      return { success: false, error: '请先登录' }
    }
    const oldHash = simpleHash(oldPassword)
    const row = queryOne<AdminRow>(
      'SELECT * FROM admin_users WHERE id = ? AND password_hash = ?',
      [currentAdmin.value.id, oldHash]
    )
    if (!row) {
      return { success: false, error: '原密码错误' }
    }
    const newHash = simpleHash(newPassword)
    run('UPDATE admin_users SET password_hash = ? WHERE id = ?', [newHash, currentAdmin.value.id])
    return { success: true }
  }

  loadFromStorage()

  return {
    currentAdmin,
    isLoggedIn,
    login,
    logout,
    changePassword,
  }
})
