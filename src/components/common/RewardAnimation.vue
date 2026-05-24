<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { Star } from 'lucide-vue-next'

const props = defineProps<{
  show: boolean
  count: number
}>()

const stars = ref<{ id: number; x: number; y: number; delay: number }[]>([])
const visible = ref(false)
let counter = 0

watch(
  () => props.show,
  async (val) => {
    if (val) {
      stars.value = Array.from({ length: Math.min(props.count, 8) }, () => ({
        id: counter++,
        x: Math.random() * 60 + 20,
        y: Math.random() * 30 + 10,
        delay: Math.random() * 0.5,
      }))
      visible.value = true
      await nextTick()
      setTimeout(() => {
        visible.value = false
      }, 2000)
    }
  },
)
</script>

<template>
  <Transition name="reward-fade">
    <div
      v-if="visible"
      class="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center"
    >
      <div
        v-for="star in stars"
        :key="star.id"
        class="absolute star-fly"
        :style="{
          left: star.x + '%',
          top: star.y + '%',
          animationDelay: star.delay + 's',
        }"
      >
        <Star class="h-8 w-8 fill-yellow-400 text-yellow-400" />
      </div>

      <div class="float-up text-4xl font-bold text-yellow-500">
        +{{ count }} ⭐
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.star-fly {
  animation: starFly 1.5s ease-out forwards;
}

@keyframes starFly {
  0% {
    opacity: 1;
    transform: scale(0) translateY(0);
  }
  30% {
    opacity: 1;
    transform: scale(1.3) translateY(-20px);
  }
  100% {
    opacity: 0;
    transform: scale(0.5) translateY(-120px);
  }
}

.float-up {
  animation: floatUp 2s ease-out forwards;
}

@keyframes floatUp {
  0% {
    opacity: 0;
    transform: translateY(20px) scale(0.5);
  }
  20% {
    opacity: 1;
    transform: translateY(0) scale(1.2);
  }
  60% {
    opacity: 1;
    transform: translateY(-30px) scale(1);
  }
  100% {
    opacity: 0;
    transform: translateY(-80px) scale(0.8);
  }
}

.reward-fade-enter-active {
  transition: opacity 0.3s ease;
}
.reward-fade-leave-active {
  transition: opacity 0.5s ease;
}
.reward-fade-enter-from,
.reward-fade-leave-to {
  opacity: 0;
}
</style>
