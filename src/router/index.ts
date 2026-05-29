import { createRouter, createWebHistory } from 'vue-router'
import { useAdminStore } from '@/stores/adminStore'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/pages/HomePage.vue'),
    },
    {
      path: '/welcome',
      name: 'welcome',
      component: () => import('@/pages/WelcomePage.vue'),
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
    },
    {
      path: '/pinyin/:id',
      name: 'pinyin-detail',
      component: () => import('@/pages/pinyin/PinyinDetailPage.vue'),
    },
    {
      path: '/chinese',
      name: 'chinese',
      component: () => import('@/pages/chinese/ChinesePage.vue'),
    },
    {
      path: '/chinese/:id',
      name: 'chinese-detail',
      component: () => import('@/pages/chinese/ChineseDetailPage.vue'),
    },
    {
      path: '/english',
      name: 'english',
      component: () => import('@/pages/english/EnglishPage.vue'),
    },
    {
      path: '/english/:id',
      name: 'english-detail',
      component: () => import('@/pages/english/EnglishDetailPage.vue'),
    },
    {
      path: '/math',
      name: 'math',
      component: () => import('@/pages/math/MathPage.vue'),
    },
    {
      path: '/explore',
      name: 'explore',
      component: () => import('@/pages/explore/ExplorePage.vue'),
    },
    {
      path: '/games',
      name: 'games',
      component: () => import('@/pages/games/GamesPage.vue'),
    },
    {
      path: '/games/quiz',
      name: 'games-quiz',
      component: () => import('@/pages/games/QuizGamePage.vue'),
    },
    {
      path: '/games/memory',
      name: 'games-memory',
      component: () => import('@/pages/games/MemoryGamePage.vue'),
    },
    {
      path: '/games/math-race',
      name: 'games-math-race',
      component: () => import('@/pages/games/MathRacePage.vue'),
    },
    {
      path: '/speech',
      name: 'speech',
      component: () => import('@/pages/speech/SpeechAssessmentPage.vue'),
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('@/pages/profile/ProfilePage.vue'),
    },
    {
      path: '/profile/shop',
      name: 'profile-shop',
      component: () => import('@/pages/profile/ShopPage.vue'),
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
  if (to.meta.requiresAdmin) {
    const adminStore = useAdminStore()
    if (!adminStore.isLoggedIn) {
      return { name: 'admin-login' }
    }
  }
})

export default router
