<script setup lang="ts">
import { computed } from 'vue'
import { Clock, Smile, Moon, X } from 'lucide-vue-next'

const props = defineProps<{
  show: boolean
  minutes: number
  type: 'remind' | 'rest' | 'stop'
}>()

const emit = defineEmits<{
  close: []
}>()

const config = computed(() => {
  switch (props.type) {
    case 'remind':
      return {
        icon: Clock,
        iconColor: '#FF9F43',
        iconBg: '#FFF3D6',
        title: '学习提醒',
        message: `你已经学习了 ${props.minutes} 分钟啦，继续加油哦！🌟`,
        btnText: '继续学习',
        btnColor: '#FF9F43',
      }
    case 'rest':
      return {
        icon: Smile,
        iconColor: '#54A0FF',
        iconBg: '#E8F0FE',
        title: '休息一下',
        message: `已经学习 ${props.minutes} 分钟了，让眼睛休息一下吧！👀`,
        btnText: '好的休息',
        btnColor: '#54A0FF',
      }
    case 'stop':
      return {
        icon: Moon,
        iconColor: '#FF6B6B',
        iconBg: '#FFE8E8',
        title: '该休息啦',
        message: `今天已经学习 ${props.minutes} 分钟了，保护眼睛很重要哦！🌙`,
        btnText: '结束学习',
        btnColor: '#FF6B6B',
      }
  }
})
</script>

<template>
  <Transition name="popup">
    <div
      v-if="show"
      class="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 px-6"
      @click.self="emit('close')"
    >
      <div
        class="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl"
      >
        <button
          class="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          @click="emit('close')"
        >
          <X class="h-5 w-5" />
        </button>

        <div class="flex flex-col items-center gap-4 pt-2">
          <div
            class="flex h-20 w-20 items-center justify-center rounded-full"
            :style="{ backgroundColor: config.iconBg }"
          >
            <component
              :is="config.icon"
              class="h-10 w-10"
              :style="{ color: config.iconColor }"
            />
          </div>

          <h2 class="text-xl font-bold text-gray-800">{{ config.title }}</h2>

          <p class="text-center text-base text-gray-500">{{ config.message }}</p>

          <button
            class="mt-2 w-full rounded-2xl py-3.5 text-lg font-bold text-white shadow-md transition-all active:scale-[0.97]"
            :style="{ backgroundColor: config.btnColor }"
            @click="emit('close')"
          >
            {{ config.btnText }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.popup-enter-active {
  transition: all 0.3s ease-out;
}
.popup-leave-active {
  transition: all 0.2s ease-in;
}
.popup-enter-from {
  opacity: 0;
  transform: scale(0.85);
}
.popup-leave-to {
  opacity: 0;
  transform: scale(0.9);
}
</style>
