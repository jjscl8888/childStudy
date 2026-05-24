<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import TopBar from '@/components/layout/TopBar.vue'

const router = useRouter()
const userStore = useUserStore()

interface ShopItem {
  id: string
  emoji: string
  name: string
  price: number
  category: string
}

const shopItems: ShopItem[] = [
  { id: 'cat_costume', emoji: '🐱', name: '小猫服装', price: 10, category: 'costume' },
  { id: 'dog_costume', emoji: '🐶', name: '小狗服装', price: 10, category: 'costume' },
  { id: 'fox_costume', emoji: '🦊', name: '狐狸服装', price: 15, category: 'costume' },
  { id: 'magic_hat', emoji: '🎩', name: '魔法帽子', price: 20, category: 'accessory' },
  { id: 'crown', emoji: '👑', name: '皇冠', price: 30, category: 'accessory' },
  { id: 'rainbow_wings', emoji: '🌈', name: '彩虹翅膀', price: 25, category: 'accessory' },
  { id: 'blue_room', emoji: '🏠', name: '蓝色房间', price: 15, category: 'room' },
  { id: 'pink_room', emoji: '🏠', name: '粉色房间', price: 15, category: 'room' },
  { id: 'green_room', emoji: '🏠', name: '绿色房间', price: 15, category: 'room' },
]

const purchasedIds = ref<string[]>([])
const purchaseMessage = ref('')

const storageKey = computed(() => {
  return `funlearn_purchased_${userStore.currentUser?.id ?? 'guest'}`
})

onMounted(() => {
  const data = localStorage.getItem(storageKey.value)
  if (data) {
    purchasedIds.value = JSON.parse(data)
  }
})

function isPurchased(itemId: string): boolean {
  return purchasedIds.value.includes(itemId)
}

function canAfford(price: number): boolean {
  return userStore.totalStars >= price
}

function handlePurchase(item: ShopItem) {
  if (isPurchased(item.id) || !canAfford(item.price)) return

  userStore.addStars(-item.price)
  purchasedIds.value.push(item.id)
  localStorage.setItem(storageKey.value, JSON.stringify(purchasedIds.value))

  purchaseMessage.value = `🎉 成功购买 ${item.name}！`
  setTimeout(() => {
    purchaseMessage.value = ''
  }, 2000)
}

function goBack() {
  router.push('/profile')
}
</script>

<template>
  <div v-if="userStore.currentUser" class="min-h-screen bg-warm pb-6">
    <TopBar title="星星商店 ⭐" />

    <div class="px-4 pt-4 space-y-4">
      <div class="fun-card flex items-center justify-center gap-3 py-4">
        <span class="text-3xl">💰</span>
        <div class="text-center">
          <p class="text-sm text-gray-400 font-bold">我的星星</p>
          <p class="text-3xl font-bold text-yellow-500">{{ userStore.totalStars }}</p>
        </div>
        <span class="text-3xl">⭐</span>
      </div>

      <Transition name="message">
        <div
          v-if="purchaseMessage"
          class="fun-card text-center py-3 border-2 border-success bg-success/5"
        >
          <p class="text-lg font-bold text-success">{{ purchaseMessage }}</p>
        </div>
      </Transition>

      <div class="grid grid-cols-3 gap-3">
        <div
          v-for="item in shopItems"
          :key="item.id"
          class="fun-card flex flex-col items-center p-3"
          :class="{ 'opacity-60': !canAfford(item.price) && !isPurchased(item.id) }"
        >
          <div class="text-4xl mb-2">{{ item.emoji }}</div>
          <h4 class="text-sm font-bold text-gray-700 text-center mb-1">{{ item.name }}</h4>
          <div class="star-badge text-xs mb-3">
            ⭐ {{ item.price }}
          </div>

          <button
            v-if="isPurchased(item.id)"
            class="w-full py-2 rounded-xl2 text-sm font-bold bg-gray-100 text-gray-400 cursor-default"
            disabled
          >
            ✓ 已拥有
          </button>
          <button
            v-else
            class="fun-btn-primary w-full py-2 text-sm"
            :class="{ 'opacity-50 cursor-not-allowed !shadow-none': !canAfford(item.price) }"
            :disabled="!canAfford(item.price)"
            @click="handlePurchase(item)"
          >
            购买
          </button>
        </div>
      </div>

      <button
        class="fun-btn-secondary w-full text-lg"
        @click="goBack"
      >
        ← 返回我的房间
      </button>
    </div>
  </div>
</template>

<style scoped>
.message-enter-active {
  animation: slideUp 0.3s ease-out;
}
.message-leave-active {
  animation: slideDown 0.2s ease-in;
}
@keyframes slideUp {
  from { transform: translateY(-10px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
@keyframes slideDown {
  from { transform: translateY(0); opacity: 1; }
  to { transform: translateY(-10px); opacity: 0; }
}
</style>
