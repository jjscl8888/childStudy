import { createRouter, createWebHistory } from 'vue-router'
import { useAdminStore } from '@/stores/adminStore'
import { useAuthStore } from '@/stores/authStore'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/pages/HomePage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/pages/auth/LoginPage.vue'),
    },
    {
      path: '/admin/login',
      name: 'admin-login',
      component: () => import('@/pages/admin/AdminLoginPage.vue'),
    },
    {
      path: '/pinyin',
      name: 'pinyin',
      component: () => import('@/pages/pinyin/PinyinPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/pinyin/:id',
      name: 'pinyin-detail',
      component: () => import('@/pages/pinyin/PinyinDetailPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/chinese',
      name: 'chinese',
      component: () => import('@/pages/chinese/ChinesePage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/chinese/:id',
      name: 'chinese-detail',
      component: () => import('@/pages/chinese/ChineseDetailPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/english',
      name: 'english',
      component: () => import('@/pages/english/EnglishPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/english/:id',
      name: 'english-detail',
      component: () => import('@/pages/english/EnglishDetailPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/math',
      name: 'math',
      component: () => import('@/pages/math/MathPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/explore',
      name: 'explore',
      component: () => import('@/pages/explore/ExplorePage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/games',
      name: 'games',
      component: () => import('@/pages/games/GamesPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/games/quiz',
      name: 'games-quiz',
      component: () => import('@/pages/games/QuizGamePage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/games/memory',
      name: 'games-memory',
      component: () => import('@/pages/games/MemoryGamePage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/games/math-race',
      name: 'games-math-race',
      component: () => import('@/pages/games/MathRacePage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/speech',
      name: 'speech',
      component: () => import('@/pages/speech/SpeechAssessmentPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('@/pages/profile/ProfilePage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/profile/shop',
      name: 'profile-shop',
      component: () => import('@/pages/profile/ShopPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/parent',
      name: 'parent',
      component: () => import('@/pages/parent/ParentPage.vue'),
      meta: { requiresAdmin: true },
    },
    {
      path: '/parent/content',
      name: 'parent-content',
      component: () => import('@/pages/parent/ContentManagePage.vue'),
      meta: { requiresAdmin: true },
    },
  ],
})

router.beforeEach((to) => {
  if (to.meta.requiresAuth) {
    const authStore = useAuthStore()
    if (!authStore.isLoggedIn) {
      return { name: 'login', query: { redirect: to.fullPath } }
    }
  }
  if (to.meta.requiresAdmin) {
    const adminStore = useAdminStore()
    if (!adminStore.isLoggedIn) {
      return { name: 'admin-login' }
    }
  }
})

export default router
