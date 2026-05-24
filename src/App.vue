<script setup lang="ts">
import { RouterView } from 'vue-router'
import BottomNav from '@/components/layout/BottomNav.vue'
import { useUserStore } from '@/stores/userStore'

const userStore = useUserStore()
</script>

<template>
  <div class="min-h-screen bg-warm flex flex-col">
    <main class="flex-1 pb-20">
      <RouterView v-slot="{ Component }">
        <transition name="page" mode="out-in">
          <component :is="Component" />
        </transition>
      </RouterView>
    </main>
    <BottomNav v-if="userStore.currentUser" />
  </div>
</template>

<style>
.page-enter-active {
  animation: slideUp 0.3s ease-out;
}
.page-leave-active {
  animation: slideDown 0.2s ease-in;
}
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes slideDown {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(-10px);
  }
}
</style>
