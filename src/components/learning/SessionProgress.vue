<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  currentStep: number
  totalSteps: number
  steps: { label: string; icon: string }[]
  color?: string
}>()

const progress = computed(() => props.totalSteps > 0 ? props.currentStep / props.totalSteps : 0)
const color = computed(() => props.color || '#FF9F43')
</script>

<template>
  <div class="session-progress w-full">
    <div class="mb-3 flex items-center justify-between">
      <div class="flex items-center gap-1.5">
        <div
          v-for="(step, idx) in steps"
          :key="idx"
          class="flex items-center gap-1"
        >
          <div
            class="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-all duration-300"
            :style="{
              backgroundColor: idx < currentStep ? '#2ED573' : idx === currentStep ? color : '#F3F4F6',
              color: idx < currentStep ? 'white' : idx === currentStep ? 'white' : '#9CA3AF',
              boxShadow: idx === currentStep ? `0 0 0 3px ${color}33` : 'none',
              transform: idx === currentStep ? 'scale(1.1)' : 'scale(1)',
            }"
          >
            <span v-if="idx < currentStep">✓</span>
            <span v-else>{{ step.icon }}</span>
          </div>
          <div
            v-if="idx < steps.length - 1"
            class="h-1 w-4 rounded-full transition-all duration-300"
            :style="{ backgroundColor: idx < currentStep ? '#2ED573' : '#E5E7EB' }"
          />
        </div>
      </div>
    </div>

    <div class="flex items-center gap-2">
      <div class="flex-1 h-2 rounded-full overflow-hidden" style="background-color: #F3F4F6">
        <div
          class="h-full rounded-full transition-all duration-500 ease-out"
          :style="{ width: (progress * 100) + '%', backgroundColor: color }"
        />
      </div>
      <span class="text-xs font-bold" :style="{ color }">
        {{ currentStep + 1 }}/{{ totalSteps }}
      </span>
    </div>

    <div v-if="steps[currentStep]" class="mt-2 text-center">
      <span
        class="inline-block rounded-full px-3 py-1 text-xs font-bold"
        :style="{ backgroundColor: color + '18', color }"
      >
        {{ steps[currentStep].icon }} {{ steps[currentStep].label }}
      </span>
    </div>
  </div>
</template>
