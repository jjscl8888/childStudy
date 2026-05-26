<script setup lang="ts">
import { useVoiceSettingsStore, BAIDU_ROLE_MAP, type TTSEngine, type Gender, type Tone, type VoiceRole } from '@/stores/voiceSettingsStore'
import { useTextToSpeech } from '@/composables/useTextToSpeech'
import { X } from 'lucide-vue-next'

const voiceSettings = useVoiceSettingsStore()
const { speak, stop: stopSpeech } = useTextToSpeech()

const engineOptions: { label: string; value: TTSEngine; emoji: string; desc: string }[] = [
  { label: '浏览器', value: 'browser', emoji: '🌐', desc: '系统内置' },
  { label: '百度语音', value: 'baidu', emoji: '🔊', desc: '丰富角色' },
]

const speedOptions = [
  { label: '慢速', value: 0.4, emoji: '🐢' },
  { label: '稍慢', value: 0.6, emoji: '🚶' },
  { label: '正常', value: 0.8, emoji: '🚶‍♂️' },
  { label: '快速', value: 1.0, emoji: '🏃' },
  { label: '极快', value: 1.3, emoji: '🚀' },
]

const genderOptions: { label: string; value: Gender; emoji: string }[] = [
  { label: '女声', value: 'female', emoji: '👩' },
  { label: '男声', value: 'male', emoji: '👨' },
]

const toneOptions: { label: string; value: Tone; emoji: string; desc: string }[] = [
  { label: '温柔', value: 'gentle', emoji: '🌸', desc: '轻柔舒缓' },
  { label: '标准', value: 'standard', emoji: '📢', desc: '自然清晰' },
  { label: '活泼', value: 'lively', emoji: '🎉', desc: '欢快明亮' },
]

const roleOptions: { key: VoiceRole; label: string; emoji: string; desc: string }[] = Object.entries(BAIDU_ROLE_MAP).map(
  ([key, info]) => ({ key: key as VoiceRole, ...info })
)

function previewVoice() {
  stopSpeech()
  let text: string
  if (voiceSettings.engine === 'baidu') {
    const roleInfo = BAIDU_ROLE_MAP[voiceSettings.role]
    text = `你好呀，小朋友！我是${roleInfo.label}，今天也要加油学习哦！`
  } else {
    text = '你好呀，小朋友！今天也要加油学习哦！'
  }
  speak(text, {
    lang: 'zh-CN',
    rate: voiceSettings.rate,
    pitch: voiceSettings.pitch,
  })
}
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-[100] flex items-end justify-center bg-black/40"
      @click.self="$emit('close')"
    >
      <div class="voice-panel w-full max-w-lg bg-white rounded-t-3xl animate-slide-up overflow-hidden">
        <div class="flex items-center justify-between px-5 pt-5 pb-3">
          <h3 class="text-lg font-bold text-gray-700">🎙️ 语音设置</h3>
          <button
            class="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 transition-colors hover:bg-gray-200"
            @click="$emit('close')"
          >
            <X class="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div class="px-5 pb-6 space-y-6 max-h-[70vh] overflow-y-auto">
          <section>
            <h4 class="text-sm font-bold text-gray-500 mb-3">🎯 发音引擎</h4>
            <div class="flex gap-3">
              <button
                v-for="opt in engineOptions"
                :key="opt.value"
                class="engine-btn flex-1 flex flex-col items-center gap-1 py-3 rounded-xl2 border-2 transition-all"
                :class="voiceSettings.engine === opt.value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-primary/30'"
                @click="voiceSettings.setEngine(opt.value)"
              >
                <span class="text-xl">{{ opt.emoji }}</span>
                <span class="text-sm font-bold">{{ opt.label }}</span>
                <span class="text-xs opacity-60">{{ opt.desc }}</span>
              </button>
            </div>
          </section>

          <section v-if="voiceSettings.engine === 'baidu'">
            <h4 class="text-sm font-bold text-gray-500 mb-3">🎭 声音角色</h4>
            <div class="grid grid-cols-2 gap-2">
              <button
                v-for="opt in roleOptions"
                :key="opt.key"
                class="role-btn flex items-center gap-2.5 py-3 px-3 rounded-xl2 border-2 transition-all"
                :class="voiceSettings.role === opt.key
                  ? 'border-primary bg-primary/10'
                  : 'border-gray-100 bg-gray-50 hover:border-primary/30'"
                @click="voiceSettings.setRole(opt.key)"
              >
                <span class="text-2xl">{{ opt.emoji }}</span>
                <div class="text-left">
                  <div
                    class="text-sm font-bold"
                    :class="voiceSettings.role === opt.key ? 'text-primary' : 'text-gray-600'"
                  >
                    {{ opt.label }}
                  </div>
                  <div class="text-xs text-gray-400">{{ opt.desc }}</div>
                </div>
              </button>
            </div>
          </section>

          <section>
            <h4 class="text-sm font-bold text-gray-500 mb-3">📖 朗读速度</h4>
            <div class="flex gap-2">
              <button
                v-for="opt in speedOptions"
                :key="opt.value"
                class="speed-btn flex-1 flex flex-col items-center gap-1 py-3 rounded-xl2 border-2 transition-all"
                :class="voiceSettings.rate === opt.value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-primary/30'"
                @click="voiceSettings.setRate(opt.value)"
              >
                <span class="text-xl">{{ opt.emoji }}</span>
                <span class="text-xs font-bold">{{ opt.label }}</span>
              </button>
            </div>
          </section>

          <template v-if="voiceSettings.engine === 'browser'">
            <section>
              <h4 class="text-sm font-bold text-gray-500 mb-3">🗣️ 声音性别</h4>
              <div class="flex gap-3">
                <button
                  v-for="opt in genderOptions"
                  :key="opt.value"
                  class="gender-btn flex-1 flex items-center justify-center gap-3 py-4 rounded-xl2 border-2 transition-all"
                  :class="voiceSettings.gender === opt.value
                    ? 'border-primary bg-primary/10'
                    : 'border-gray-100 bg-gray-50 hover:border-primary/30'"
                  @click="voiceSettings.setGender(opt.value)"
                >
                  <span class="text-3xl">{{ opt.emoji }}</span>
                  <span
                    class="text-base font-bold"
                    :class="voiceSettings.gender === opt.value ? 'text-primary' : 'text-gray-500'"
                  >
                    {{ opt.label }}
                  </span>
                </button>
              </div>
            </section>

            <section>
              <h4 class="text-sm font-bold text-gray-500 mb-3">🎵 音色风格</h4>
              <div class="flex gap-3">
                <button
                  v-for="opt in toneOptions"
                  :key="opt.value"
                  class="tone-btn flex-1 flex flex-col items-center gap-1.5 py-4 rounded-xl2 border-2 transition-all"
                  :class="voiceSettings.tone === opt.value
                    ? 'border-primary bg-primary/10'
                    : 'border-gray-100 bg-gray-50 hover:border-primary/30'"
                  @click="voiceSettings.setTone(opt.value)"
                >
                  <span class="text-2xl">{{ opt.emoji }}</span>
                  <span
                    class="text-sm font-bold"
                    :class="voiceSettings.tone === opt.value ? 'text-primary' : 'text-gray-500'"
                  >
                    {{ opt.label }}
                  </span>
                  <span class="text-xs text-gray-400">{{ opt.desc }}</span>
                </button>
              </div>
            </section>
          </template>

          <button
            class="fun-btn-primary w-full text-base flex items-center justify-center gap-2"
            @click="previewVoice"
          >
            <span>🔊</span>
            <span>试听效果</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script lang="ts">
export default {
  emits: ['close'],
}
</script>

<style scoped>
.voice-panel {
  box-shadow: 0 -8px 30px rgba(0, 0, 0, 0.12);
}

.speed-btn:active,
.gender-btn:active,
.tone-btn:active,
.engine-btn:active,
.role-btn:active {
  transform: scale(0.96);
}
</style>
